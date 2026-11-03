"""Bounded logical explanations. SQL execution always belongs to SQLite."""
from contextlib import contextmanager
from collections import Counter
from pathlib import Path
import sqlite3
import math
import time
import uuid

class QueryError(ValueError):
    pass

def display_value(value):
    if isinstance(value, bytes): return '0x' + value.hex()
    if isinstance(value, int) and abs(value)>9007199254740991: return str(value)
    if isinstance(value, float) and not math.isfinite(value): return str(value)
    return value

def sqlite_name(name):
    return name.translate(str.maketrans('ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'))

def quote(name):
    return '"' + name.replace('"', '""') + '"'

class _Budget:
    def __init__(self,cancel=None,seconds=5):
        self.cancel=cancel
        self.deadline=time.monotonic()+seconds

    def expired(self):
        return (self.cancel is not None and self.cancel.is_set()) or time.monotonic()>=self.deadline

    def check(self):
        if self.cancel is not None and self.cancel.is_set():
            raise QueryError('İşlem kullanıcı tarafından iptal edildi.')
        if time.monotonic()>=self.deadline:
            raise QueryError('Sorgu süre sınırını aştı; açıklama tamamlanmadı.')

@contextmanager
def connect(path, cancel=None, timeout_seconds=5, budget=None):
    db=None
    budget=budget or _Budget(cancel,timeout_seconds)
    budget.check()
    try:
        if sqlite3.sqlite_version_info < (3,37,0):
            raise QueryError('TraceQuery için SQLite 3.37 veya daha yenisi gerekli.')
        db=sqlite3.connect(Path(path).resolve().as_uri()+'?mode=ro',uri=True,timeout=1)
        db.execute('PRAGMA query_only=ON')
        db.set_progress_handler(lambda:int(budget.expired()),1000)
        db.execute('BEGIN')
        yield db
        budget.check()
    except sqlite3.Error as error:
        budget.check()
        raise QueryError(f'SQLite işlemi tamamlanamadı: {error}') from error
    finally:
        if db is not None:
            db.close()

def schema(db):
    result = []
    kinds={row[1]:row[2] for row in db.execute('PRAGMA main.table_list')}
    for name, definition in db.execute("SELECT name,sql FROM sqlite_master WHERE type='table' AND substr(lower(name),1,7) != 'sqlite_' ORDER BY name"):
        if not definition or kinds.get(name)!='table':
            continue
        columns = [{'name':r[1], 'type':r[2], 'nullable':not bool(r[3]), 'pk':bool(r[5])}
                   for r in db.execute(f'PRAGMA table_xinfo({quote(name)})')]
        keys = [c for c in columns if c['pk']]
        key = keys[0]['name'] if len(keys)==1 and keys[0]['type'].upper()=='INTEGER' else None
        has_pk_index = any(row[3]=='pk' for row in db.execute(f'PRAGMA index_list({quote(name)})'))
        if key and not has_pk_index:
            next(c for c in columns if c['name']==key)['nullable']=False
        foreign_keys=[{'id':r[0],'sequence':r[1],'table':r[2],'column':r[3],'target_column':r[4]}
                      for r in db.execute(f'PRAGMA foreign_key_list({quote(name)})')]
        result.append({'name':name,'columns':columns,'primary_key':key,'foreign_keys':foreign_keys})
    return result

def inspect_database(path):
    with connect(path) as db:
        return schema(db)

def read_table(path, table, offset=0):
    if not isinstance(offset,int) or not 0<=offset<=9223372036854775807:
        raise QueryError('Sayfa başlangıcı 0 ile 9223372036854775807 arasında olmalı.')
    with connect(path) as db:
        entry = next((t for t in schema(db) if t['name']==table), None)
        if entry is None:
            raise QueryError('Tablo bulunamadı.')
        order = f' ORDER BY {quote(entry["primary_key"])}' if entry['primary_key'] else ''
        rows = db.execute(f'SELECT * FROM {quote(table)}{order} LIMIT 101 OFFSET ?', (offset,)).fetchall()
        return {'columns':[c['name'] for c in entry['columns']], 'rows':[[display_value(v) for v in r] for r in rows[:100]],
                'has_more':len(rows)>100, 'offset':offset}

def parse_query(sql):
    # Keep the standard-library executor testable without optional parser packages.
    try:
        from sqlglot import parse, exp, errors
    except ImportError as error:
        raise QueryError('SQLGlot kurulu değil. requirements.txt bağımlılıklarını kurun.') from error
    try:
        statements = parse(sql, read='sqlite')
    except (errors.SqlglotError, RecursionError) as error:
        raise QueryError(f'SQL ayrıştırılamadı: {error}') from error
    if len(statements)!=1 or not isinstance(statements[0], exp.Select):
        raise QueryError('Yalnızca tek bir SELECT sorgusu destekleniyor.')
    query = statements[0]
    allowed = (exp.Select, exp.From, exp.Table, exp.TableAlias, exp.Identifier, exp.Column,
               exp.Star, exp.Alias, exp.Join, exp.Where, exp.And, exp.EQ, exp.NEQ,
               exp.LT, exp.LTE, exp.GT, exp.GTE, exp.Is, exp.Null, exp.Not, exp.Literal,
               exp.Paren, exp.Neg)
    if any(not isinstance(node, allowed) for node in query.walk()):
        raise QueryError('Bu SQL yapısı ilk sürüm kapsamında değil. SELECT, INNER JOIN ve basit WHERE kullanın.')
    if any(value for key,value in query.args.items() if key not in {'expressions','from_','from','joins','where'}):
        raise QueryError('Sorgunun bu bölümü henüz desteklenmiyor.')
    origin = query.args.get('from_') or query.args.get('from')
    if origin is None or not isinstance(origin.this, exp.Table):
        raise QueryError('Normal bir kaynak tablo gerekli.')
    tables=[origin.this]
    joins=[]
    for join in query.args.get('joins') or []:
        on=join.args.get('on')
        if (join.args.get('side') or (join.args.get('kind') or '').upper() not in ('','INNER')
                or join.args.get('method') or join.args.get('using') or not isinstance(join.this,exp.Table)
                or not isinstance(on,exp.EQ) or not isinstance(on.left,exp.Column) or not isinstance(on.right,exp.Column)):
            raise QueryError('Yalnızca sütun eşitliğiyle INNER JOIN destekleniyor.')
        tables.append(join.this)
        joins.append(on.sql(dialect='sqlite'))
    roles=[]
    for table in tables:
        if table.db or table.catalog or (table.args.get('alias') and table.args['alias'].args.get('columns')):
            raise QueryError('Yalnızca açılan veritabanındaki tablolar destekleniyor.')
        roles.append((table.name,table.alias_or_name))
    if len({sqlite_name(alias) for _,alias in roles})!=len(roles):
        raise QueryError('Tablo takma adları benzersiz olmalı.')
    for projection in query.expressions:
        value=projection.this if isinstance(projection,exp.Alias) else projection
        if not isinstance(value,(exp.Column,exp.Star)):
            raise QueryError('SELECT bölümünde yalnızca sütun seçimi destekleniyor.')
    where=query.args.get('where')
    def predicate(node):
        if isinstance(node,exp.Paren): return predicate(node.this)
        if isinstance(node,exp.And): return predicate(node.left) and predicate(node.right)
        if isinstance(node,exp.Not): return isinstance(node.this,exp.Is) and predicate(node.this)
        if isinstance(node,exp.Is): return isinstance(node.left,exp.Column) and isinstance(node.right,exp.Null)
        if isinstance(node,(exp.EQ,exp.NEQ,exp.LT,exp.LTE,exp.GT,exp.GTE)):
            def literal(n): return isinstance(n,exp.Literal) or (isinstance(n,exp.Neg) and isinstance(n.this,exp.Literal))
            return (isinstance(node.left,exp.Column) and literal(node.right)) or (isinstance(node.right,exp.Column) and literal(node.left))
        return False
    if where and not predicate(where.this):
        raise QueryError('WHERE bölümünde basit karşılaştırmalar, IS NULL ve AND destekleniyor.')
    filters=[]
    def collect_filters(node):
        if isinstance(node,exp.Paren): return collect_filters(node.this)
        if isinstance(node,exp.And):
            collect_filters(node.left)
            collect_filters(node.right)
        else:
            atom=node.this if isinstance(node,exp.Not) else node
            filters.append({'sql':node.sql(dialect='sqlite'),
                            'operands':[atom.left.sql(dialect='sqlite'),atom.right.sql(dialect='sqlite')]})
    if where: collect_filters(where.this)
    return {'filters':filters,'tables':roles,'joins':joins,'projections' :[e.sql(dialect='sqlite') for e in query.expressions],
            'where':where.this.sql(dialect='sqlite') if where else None,'sql':query.sql(dialect='sqlite')}

def explain(path, sql, max_rows=1000, cancel=None):
    if len(sql)>20000: raise QueryError('Sorgu uzunluk sınırını aşıyor.')
    return execute_plan(path,parse_query(sql),max_rows,cancel=cancel)

def execute_plan(path, plan, max_rows=1000, cancel=None):
    """Internal only: plan is produced by parse_query, never accepted from the API."""
    budget=_Budget(cancel)
    with connect(path,budget=budget) as db:
        entries={t['name']:t for t in schema(db)}
        canonical={sqlite_name(name):name for name in entries}
        roles=[(canonical.get(sqlite_name(name),name),alias) for name,alias in plan['tables']]
        for name,_ in roles:
            if name not in entries: raise QueryError(f'Tablo bulunamadı: {name}')
            if not entries[name]['primary_key']:
                raise QueryError(f'{name}: tek sütunlu INTEGER PRIMARY KEY gerekli.')
        source_ids = {}
        source_records = {}
        for name,a in roles:
            budget.check()
            key=entries[name]['primary_key']
            records=db.execute(f'SELECT * FROM {quote(name)} LIMIT ?', (max_rows+1,)).fetchall()
            names=[c['name'] for c in entries[name]['columns']]
            key_index=names.index(key)
            identities=[row[key_index] for row in records]
            if len(identities)>max_rows: raise QueryError(f'Kaynak tablo {max_rows} satır sınırını aşıyor.')
            if any(not isinstance(v,int) or abs(v)>9007199254740991 for v in identities) or len(set(identities))!=len(identities):
                raise QueryError('Kaynak kimlikleri benzersiz, NULL olmayan ve JavaScript güvenli aralığında tamsayı olmalı.')
            source_ids[a]=identities
            source_records[a]={identity:dict(zip(names,[display_value(v) for v in record])) for identity,record in zip(identities,records)}
        def fetch(select, source, aliases, condition=None):
            budget.check()
            keys=[f'{quote(a)}.{quote(entries[n]["primary_key"])}' for n,a in roles if a in aliases]
            sql=f'SELECT {select}, '+', '.join(keys)+' FROM '+source
            if condition: sql+=' WHERE '+condition
            cursor=db.execute(sql)
            raw=cursor.fetchmany(max_rows+1)
            if len(raw)>max_rows: raise QueryError(f'Ara sonuç {max_rows} satır sınırını aşıyor; açıklama tamamlanmadı.')
            size=len(aliases)
            cols=[d[0] for d in cursor.description][:-size]
            return {'columns':cols,'count':len(raw),'rows':[{'values':[display_value(v) for v in r[:-size]],'sources':dict(zip(aliases,r[-size:]))} for r in raw]}
        def fields(count):
            return ', '.join(f'{quote(a)}.{quote(c["name"])} AS {quote(a+"."+c["name"])}'
                             for n,a in roles[:count] for c in entries[n]['columns'])
        first,alias=roles[0]
        source=f'{quote(first)} AS {quote(alias)}'
        stages=[]
        join_excluded=[]
        for index in range(len(roles)):
            if index:
                name,role=roles[index]
                source+=f' INNER JOIN {quote(name)} AS {quote(role)} ON {plan["joins"][index-1]}'
            aliases=[a for _,a in roles[:index+1]]
            stage=fetch(fields(index+1),source,aliases)
            stage.update(label='Kaynak tablo' if index==0 else f'JOIN {index}', detail=source, aliases=aliases.copy())
            if index:
                previous=stages[-1]
                previous_aliases=previous['aliases']
                surviving={tuple(row['sources'][a] for a in previous_aliases) for row in stage['rows']}
                for row in previous['rows']:
                    budget.check()
                    if tuple(row['sources'][a] for a in previous_aliases) not in surviving:
                        join_excluded.append({'stage':index,'sources':row['sources'],
                                              'condition':plan['joins'][index-1],
                                              'target':{'table':name,'alias':role}})
            stages.append(stage)
        aliases=[a for _,a in roles]
        excluded=[]
        filter_checks={}
        if plan['where']:
            # SQLite evaluates its own NULL/affinity/collation semantics, not Python.
            filters=plan.get('filters') or [{'sql':plan['where'],'operands':[]}]
            expressions=[f'({plan["where"]})']
            for condition in filters:
                expressions.append(f'({condition["sql"]})')
                expressions.extend(condition['operands'])
            check=fetch(', '.join(expressions),source,aliases)
            for row in check['rows']:
                budget.check()
                value=row['values'][0]
                checks=[]
                offset=1
                for condition in filters:
                    truth=row['values'][offset]
                    width=len(condition['operands'])
                    checks.append({'condition':condition['sql'],
                                   'truth':'UNKNOWN' if truth is None else ('TRUE' if truth else 'FALSE'),
                                   'operands':condition['operands'], 'values':row['values'][offset+1:offset+1+width]})
                    offset+=1+width
                filter_checks[tuple(row['sources'][a] for a in aliases)]=checks
                if value is None or value==0:
                    excluded.append({'sources':row['sources'],'reason':'UNKNOWN' if value is None else 'FALSE',
                                     'condition':plan['where'],'checks':checks})
            stage=fetch(fields(len(roles)),source,aliases,plan['where'])
            stage.update(label='WHERE',detail=plan['where'],aliases=aliases.copy())
            stages.append(stage)
        result=fetch(', '.join(plan['projections']),source,aliases,plan['where'])
        if plan['where']:
            for grid in (stages[-1],result):
                for row in grid['rows']:
                    budget.check()
                    row['checks']=filter_checks[tuple(row['sources'][a] for a in aliases)]
        stage_counts=[]
        for stage in stages:
            counters={alias:Counter() for alias in stage['aliases']}
            for row in stage['rows']:
                budget.check()
                for alias,identity in row['sources'].items():
                    counters[alias][identity]+=1
            stage_counts.append(counters)
        result_counts={alias:Counter(row['sources'][alias] for row in result['rows']) for _,alias in roles}
        outcomes=[]
        for name,a in roles:
            for identity in source_ids[a]:
                budget.check()
                counts=[counters[a][identity] if a in counters else None for counters in stage_counts]
                outcomes.append({'table':name,'alias':a,'id':identity,'counts':counts,
                                 'record':source_records[a][identity],
                                 'first_missing_stage':next((i for i,count in enumerate(counts) if count==0),None),
                                 'contributions':result_counts[a][identity]})
        return {'id':uuid.uuid4().hex,'status':'complete','sql':plan['sql'],
                'stages':stages,'result':result,'excluded':excluded,
                'join_excluded':join_excluded,'outcomes':outcomes,
                'notice':'Aşamalar mantıksal açıklamadır; SQLite fiziksel yürütme planı değildir.'}

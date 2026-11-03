import sqlite3
import tempfile
import unittest
from pathlib import Path

class CoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name)/'school.db'
        from contextlib import closing
        with closing(sqlite3.connect(self.path)) as db:
            db.executescript('''CREATE TABLE students(id INTEGER PRIMARY KEY, name TEXT);
            CREATE TABLE enrollments(id INTEGER PRIMARY KEY, student_id INTEGER, grade INTEGER);
            INSERT INTO students VALUES(1,'Ali'),(2,'Ayşe'),(3,'Mehmet');
            INSERT INTO enrollments VALUES(101,1,80),(102,1,75),(103,2,45),(104,2,NULL);''')
        self.plan = {'tables':[('students','s'),('enrollments','e')], 'joins':['"s"."id" = "e"."student_id"'],
                     'projections':['"s"."name"'], 'where':'"e"."grade" >= 60','sql':'demo'}
    def tearDown(self): self.tmp.cleanup()
    def test_result_preserves_duplicates_and_exact_source_ids(self):
        from tracequery.engine import execute_plan
        r=execute_plan(self.path,self.plan)
        self.assertEqual([x['values'] for x in r['result']['rows']],[['Ali'],['Ali']])
        self.assertEqual([x['sources'] for x in r['result']['rows']],[{'s':1,'e':101},{'s':1,'e':102}])
        self.assertEqual([s['count'] for s in r['stages']],[3,4,2])
        self.assertEqual([x['reason'] for x in r['excluded']],['FALSE','UNKNOWN'])
        self.assertEqual([o['counts'] for o in r['outcomes'] if o['alias']=='s' and o['id']==3],[[1,0,0]])
    def test_source_cards_include_actual_values_and_first_missing_stage(self):
        from tracequery.engine import execute_plan
        r=execute_plan(self.path,self.plan)
        ali=next(o for o in r['outcomes'] if o['alias']=='s' and o['id']==1)
        ayse=next(o for o in r['outcomes'] if o['alias']=='s' and o['id']==2)
        mehmet=next(o for o in r['outcomes'] if o['alias']=='s' and o['id']==3)
        self.assertEqual(ali['record'],{'id':1,'name':'Ali'})
        self.assertIsNone(ali['first_missing_stage'])
        self.assertEqual(ayse['first_missing_stage'],2)
        self.assertEqual(mehmet['first_missing_stage'],1)
        self.assertEqual(r['stages'][0]['aliases'],['s'])
        self.assertEqual(r['stages'][1]['aliases'],['s','e'])

    def test_filter_explanation_includes_operands_and_sql_three_valued_results(self):
        from tracequery.engine import execute_plan
        p={**self.plan,'where':'"e"."grade" >= 60 AND "e"."id" != 102',
           'filters':[{'sql':'"e"."grade" >= 60','operands':['"e"."grade"','60']},
                      {'sql':'"e"."id" != 102','operands':['"e"."id"','102']}]}
        r=execute_plan(self.path,p)
        excluded={row['sources']['e']:row for row in r['excluded']}
        self.assertEqual(excluded[102]['checks'][0]['truth'],'TRUE')
        self.assertEqual(excluded[102]['checks'][1]['truth'],'FALSE')
        self.assertEqual(excluded[103]['checks'][0]['values'],[45,60])
        self.assertEqual(excluded[104]['checks'][0]['truth'],'UNKNOWN')
        self.assertEqual(excluded[104]['checks'][0]['values'],[None,60])

    def test_surviving_duplicate_rows_keep_their_own_filter_values(self):
        from tracequery.engine import execute_plan
        plan={**self.plan,'filters':[{'sql':'"e"."grade" >= 60','operands':['"e"."grade"','60']}]}
        result=execute_plan(self.path,plan)
        rows=result['result']['rows']
        self.assertEqual([row['values'] for row in rows],[['Ali'],['Ali']])
        self.assertEqual([row['checks'][0]['values'] for row in rows],[[80,60],[75,60]])
        self.assertEqual([row['checks'][0]['truth'] for row in rows],['TRUE','TRUE'])
        self.assertEqual([row['checks'] for row in result['stages'][-1]['rows']],
                         [row['checks'] for row in rows])
        self.assertNotIn('checks',result['stages'][0]['rows'][0])

    def test_case_insensitive_sqlite_table_names(self):
        from tracequery.engine import execute_plan
        p={**self.plan,'tables':[('STUDENTS','s'),('ENROLLMENTS','e')]}
        self.assertEqual(execute_plan(self.path,p)['result']['count'],2)

    def test_primary_key_nullability_is_reported_correctly(self):
        from tracequery.engine import inspect_database
        students=next(t for t in inspect_database(self.path) if t['name']=='students')
        self.assertFalse(students['columns'][0]['nullable'])

    def test_schema_exposes_foreign_key_targets(self):
        from tracequery.demo import create_demo
        from tracequery.engine import inspect_database
        path=self.path.parent/'demo.db'
        create_demo(path)
        enrollment=next(t for t in inspect_database(path) if t['name']=='kayitlar')
        actual={(f['column'],f['table'],f['target_column']) for f in enrollment['foreign_keys']}
        self.assertEqual(actual,{('ogrenci_id','ogrenciler','id'),('ders_id','dersler','id')})

    def test_table_pagination_returns_only_its_page(self):
        from tracequery.engine import read_table,QueryError
        page=read_table(self.path,'students',offset=1)
        self.assertEqual(page['rows'],[[2,'Ayşe'],[3,'Mehmet']])
        self.assertFalse(page['has_more'])
        with self.assertRaises(QueryError): read_table(self.path,'students',offset=-1)
        with self.assertRaises(QueryError): read_table(self.path,'students',offset=2**63)

    def test_generated_columns_keep_real_source_identity_and_values(self):
        from tracequery.engine import execute_plan
        db=sqlite3.connect(self.path)
        try:
            db.executescript("CREATE TABLE totals(base INTEGER, doubled INTEGER GENERATED ALWAYS AS (base*2), id INTEGER PRIMARY KEY); INSERT INTO totals(base,id) VALUES(7,31);")
        finally: db.close()
        p={'tables':[('totals','t')],'joins':[], 'projections':['"t"."doubled"'], 'where':None,'sql':'demo'}
        r=execute_plan(self.path,p)
        self.assertEqual(r['result']['rows'][0]['sources'],{'t':31})
        self.assertEqual(r['outcomes'][0]['record'],{'base':7,'doubled':14,'id':31})
        self.assertEqual(r['stages'][0]['rows'][0]['values'],[7,14,31])

    def test_user_tables_with_similar_internal_prefix_are_not_hidden(self):
        from tracequery.engine import inspect_database
        db=sqlite3.connect(self.path)
        try: db.execute('CREATE TABLE sqlitecache(id INTEGER PRIMARY KEY)')
        finally: db.close()
        self.assertIn('sqlitecache',[t['name'] for t in inspect_database(self.path)])

    def test_pre_cancelled_explanation_never_returns_partial_success(self):
        from threading import Event
        from tracequery.engine import execute_plan, QueryError
        cancelled=Event()
        cancelled.set()
        before=self.path.read_bytes()
        with self.assertRaisesRegex(QueryError,'iptal'):
            execute_plan(self.path,self.plan,cancel=cancelled)
        self.assertEqual(self.path.read_bytes(),before)

    def test_sqlite_progress_handler_interrupts_a_cancelled_query(self):
        from threading import Event
        from tracequery.engine import connect, QueryError
        cancelled=Event()
        with self.assertRaisesRegex(QueryError,'iptal'):
            with connect(self.path,cancel=cancelled) as db:
                cancelled.set()
                db.execute('WITH RECURSIVE nums(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM nums WHERE n<1000000) SELECT sum(n) FROM nums').fetchone()

    def test_expired_budget_does_not_return_success(self):
        from tracequery.engine import connect, QueryError
        with self.assertRaisesRegex(QueryError,'süre'):
            with connect(self.path,timeout_seconds=0) as db:
                db.execute('SELECT 1')

    def test_many_alias_source_counts_remain_exact(self):
        from tracequery.engine import execute_plan
        roles=[('students',f's{i}') for i in range(10)]
        p={'tables':roles,'joins':[f'"s0"."id"="s{i}"."id"' for i in range(1,10)],
           'projections':['"s0"."name"'],'where':None,'sql':'demo'}
        result=execute_plan(self.path,p)
        self.assertEqual(result['result']['count'],3)
        for outcome in result['outcomes']:
            alias_index=int(outcome['alias'][1:])
            self.assertEqual(outcome['counts'],[None]*alias_index+[1]*(10-alias_index))
            self.assertEqual(outcome['contributions'],1)

    def test_missing_file_does_not_get_created(self):
        from tracequery.engine import inspect_database, QueryError
        missing=self.path.parent/'missing.db'
        with self.assertRaises(QueryError): inspect_database(missing)
        self.assertFalse(missing.exists())
    def test_limit_stops_incomplete_explanations(self):
        from tracequery.engine import execute_plan, QueryError
        with self.assertRaises(QueryError): execute_plan(self.path,self.plan,max_rows=2)
    def test_binary_values_are_display_safe(self):
        from tracequery.engine import execute_plan
        db=sqlite3.connect(self.path)
        try:
            db.execute("ALTER TABLE students ADD COLUMN payload BLOB")
            db.execute("UPDATE students SET payload=x'ff00' WHERE id=1")
            db.commit()
        finally:
            db.close()
        p={'tables':[('students','s')],'joins':[], 'projections':['"s"."payload"'], 'where':'"s"."id"=1','sql':'demo'}
        self.assertEqual(execute_plan(self.path,p)['result']['rows'][0]['values'],['0xff00'])

    def test_rejects_nullable_desc_primary_keys(self):
        from tracequery.engine import execute_plan, QueryError
        db=sqlite3.connect(self.path)
        try:
            db.executescript("CREATE TABLE weird(id INTEGER PRIMARY KEY DESC, value TEXT); INSERT INTO weird(value) VALUES('a'),('b');")
        finally: db.close()
        p={'tables':[('weird','w')],'joins':[],'projections':['"w"."value"'],'where':None,'sql':'demo'}
        with self.assertRaises(QueryError): execute_plan(self.path,p)

    def test_rejects_unsafe_json_source_identity(self):
        from tracequery.engine import execute_plan, QueryError
        db=sqlite3.connect(self.path)
        try:
            db.execute("INSERT INTO students VALUES(9007199254740993,'Large')")
            db.commit()
        finally: db.close()
        with self.assertRaises(QueryError): execute_plan(self.path,self.plan)

    def test_source_is_unchanged(self):
        from tracequery.engine import execute_plan
        before=self.path.read_bytes()
        execute_plan(self.path,self.plan)
        self.assertEqual(self.path.read_bytes(),before)
    def test_identical_roles_do_not_overwrite_self_join_sources(self):
        from tracequery.engine import execute_plan
        p={'tables':[('students','a'),('students','b')],'joins':['"a"."id"="b"."id"'],
           'projections':['"a"."name"','"b"."name"'],'where':'"a"."id"=1','sql':'demo'}
        self.assertEqual(execute_plan(self.path,p)['result']['rows'][0]['sources'],{'a':1,'b':1})

if __name__=='__main__': unittest.main()

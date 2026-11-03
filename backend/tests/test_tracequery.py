import sqlite3
import pytest
pytest.importorskip("sqlglot", reason="SQLGlot bağımlılığı kurulu değil")
from tracequery.engine import explain, inspect_database, QueryError

SQL = '''SELECT o.ad, d.ad AS ders, k.notu FROM ogrenciler o
JOIN kayitlar k ON o.id=k.ogrenci_id JOIN dersler d ON d.id=k.ders_id
WHERE k.notu >= 60'''

@pytest.fixture
def database(tmp_path):
    path = tmp_path / 'school.db'
    with sqlite3.connect(path) as db:
        db.executescript('''
        CREATE TABLE ogrenciler(id INTEGER PRIMARY KEY, ad TEXT);
        CREATE TABLE dersler(id INTEGER PRIMARY KEY, ad TEXT);
        CREATE TABLE kayitlar(id INTEGER PRIMARY KEY, ogrenci_id INTEGER, ders_id INTEGER, notu INTEGER);
        INSERT INTO ogrenciler VALUES(1,'Ali'),(2,'Ayşe'),(3,'Mehmet');
        INSERT INTO dersler VALUES(10,'Matematik'),(20,'Fizik');
        INSERT INTO kayitlar VALUES(101,1,10,80),(102,1,20,75),(103,2,10,45),(104,2,20,NULL);
        ''')
    return path

def test_explains_real_rows_and_sources(database):
    result = explain(database, SQL)
    assert [r['values'] for r in result['result']['rows']] == [['Ali','Matematik',80],['Ali','Fizik',75]]
    assert result['result']['rows'][0]['sources'] == {'o':1,'k':101,'d':10}
    assert [s['count'] for s in result['stages']] == [3,4,4,2]
    assert [r['reason'] for r in result['excluded']] == ['FALSE','UNKNOWN']

def test_duplicate_visible_rows_keep_distinct_sources(database):
    result = explain(database, 'SELECT o.ad FROM ogrenciler o JOIN kayitlar k ON o.id=k.ogrenci_id WHERE k.notu>=60')
    assert [r['values'] for r in result['result']['rows']] == [['Ali'],['Ali']]
    assert [r['sources']['k'] for r in result['result']['rows']] == [101,102]

@pytest.mark.parametrize('sql',[
    'DELETE FROM ogrenciler', 'SELECT * FROM ogrenciler; DELETE FROM ogrenciler',
    'SELECT count(*) FROM ogrenciler', 'SELECT ad FROM ogrenciler GROUP BY ad',
    'SELECT random() FROM ogrenciler', 'SELECT * FROM ogrenciler LIMIT 1',
    'SELECT * FROM ogrenciler LEFT JOIN kayitlar ON ogrenciler.id=kayitlar.ogrenci_id',
    'SELECT * FROM ogrenciler o, kayitlar k',
    'SELECT * FROM (SELECT * FROM ogrenciler)',
    'SELECT * FROM ogrenciler WHERE id=1 OR id=2',
])
def test_rejects_unsupported_queries_without_modifying_database(database, sql):
    before = database.read_bytes()
    with pytest.raises(QueryError): explain(database, sql)
    assert database.read_bytes() == before

def test_handles_aliases_in_self_join(database):
    result = explain(database,'SELECT a.ad, b.ad FROM ogrenciler a JOIN ogrenciler b ON a.id=b.id WHERE a.id=1')
    assert result['result']['rows'][0]['sources'] == {'a':1,'b':1}

def test_schema_and_missing_file(database,tmp_path):
    assert inspect_database(database)[0]['name'] == 'dersler'
    missing = tmp_path/'missing.db'
    with pytest.raises(QueryError): inspect_database(missing)
    assert not missing.exists()

def test_limits_intermediate_rows(database):
    with pytest.raises(QueryError,match='sınır'): explain(database,SQL,max_rows=2)

def test_empty_result_is_success(database):
    result=explain(database,'SELECT ad FROM ogrenciler WHERE id>100')
    assert result['result']['rows'] == []

def test_requires_real_primary_key(database):
    with sqlite3.connect(database) as db: db.execute('CREATE TABLE other(value TEXT)')
    with pytest.raises(QueryError,match='PRIMARY KEY'): explain(database,'SELECT value FROM other')


def test_unterminated_string_is_a_user_query_error(database):
    with pytest.raises(QueryError):
        explain(database,"SELECT ad FROM ogrenciler WHERE ad = 'Ali")

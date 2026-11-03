import pytest
pytest.importorskip("fastapi", reason="FastAPI bağımlılığı kurulu değil")
pytest.importorskip("sqlglot", reason="SQLGlot bağımlılığı kurulu değil")
from fastapi.testclient import TestClient
from tracequery.app import app


def responsive_loop():
    # Like test_execution, keep this environment's lost thread wakeups from
    # stalling the real TestClient portal; HTTP and SQLite work stay unchanged.
    import asyncio
    loop=asyncio.new_event_loop()
    def tick():
        if not loop.is_closed():
            loop.call_later(0.05,tick)
    loop.call_later(0.05,tick)
    return loop

def test_demo_to_sources_and_write_rejection():
    with TestClient(app,backend_options={'loop_factory':responsive_loop}) as client:
        opened=client.post('/api/demo').json()
        response=client.post('/api/explain',json={'database_id':opened['id'],'sql':opened['demo_sql']})
        assert response.status_code==200
        row=response.json()['result']['rows'][0]
        assert row['sources']=={'o':1,'k':101,'d':10}
        assert row['checks'][0]['truth']=='TRUE'
        assert row['checks'][0]['values']==[80,60]
        assert any(branch['sources']=={'o':3} and branch['stage']==1
                   for branch in response.json()['join_excluded'])
        rejected=client.post('/api/explain',json={'database_id':opened['id'],'sql':'DELETE FROM ogrenciler'})
        assert rejected.status_code==400
        assert len(client.get(f'/api/table/{opened["id"]}/ogrenciler').json()['rows'])==3

def test_invalid_database_and_missing_session():
    with TestClient(app,backend_options={'loop_factory':responsive_loop}) as client:
        assert client.post('/api/databases',files={'file':('bad.db',b'not sqlite')}).status_code==400
        assert client.get('/api/schema/missing').status_code==400

def test_uploaded_database_example_uses_its_own_table(tmp_path):
    import sqlite3
    from tracequery.app import register
    from tracequery.engine import explain
    path=tmp_path/'inventory.db'
    db=sqlite3.connect(path)
    try:
        db.executescript("""CREATE TABLE "order items"(id INTEGER PRIMARY KEY, name TEXT, stock INTEGER); INSERT INTO "order items" VALUES(1,'Notebook',8);""")
    finally:
        db.close()
    app.state.databases={}
    opened=register(path,'inventory.db')
    result=explain(path,opened['demo_sql'])
    assert result['result']['rows'][0]['values']==[1,'Notebook',8]
    assert result['result']['rows'][0]['sources']=={'order items':1}


def test_no_explainable_table_does_not_offer_an_invalid_example(tmp_path):
    import sqlite3
    from tracequery.app import register
    path=tmp_path/'notes.db'
    db=sqlite3.connect(path)
    try:
        db.execute('CREATE TABLE notes(body TEXT)')
    finally:
        db.close()
    app.state.databases={}
    opened=register(path,'notes.db')
    assert opened['tables'][0]['name']=='notes'
    assert opened['demo_sql']==''

def test_real_upload_explains_a_copy_and_cleans_up_after_shutdown(tmp_path):
    import sqlite3
    path=tmp_path/'inventory.db'
    db=sqlite3.connect(path)
    try:
        db.executescript("CREATE TABLE products(id INTEGER PRIMARY KEY, name TEXT); INSERT INTO products VALUES(7,'Notebook');")
    finally:
        db.close()
    original=path.read_bytes()
    with TestClient(app,backend_options={'loop_factory':responsive_loop}) as client:
        response=client.post('/api/databases',files={'file':('inventory.db',original,'application/octet-stream')})
        assert response.status_code==200
        opened=response.json()
        copy=app.state.databases[opened['id']]
        assert copy!=path and copy.read_bytes()==original
        explained=client.post('/api/explain',json={'database_id':opened['id'],'sql':opened['demo_sql']})
        assert explained.status_code==200
        assert explained.json()['result']['rows'][0]['values']==[7,'Notebook']
        assert explained.json()['result']['rows'][0]['sources']=={'products':7}
        assert copy.read_bytes()==original
    assert path.read_bytes()==original
    assert not copy.exists()


def test_oversized_upload_is_rejected_without_leaving_a_copy():
    with TestClient(app,backend_options={'loop_factory':responsive_loop}) as client:
        response=client.post('/api/databases',files={'file':('large.db',b'0'*(10*1024*1024+1))})
        assert response.status_code==400
        assert '10 MB' in response.json()['detail']
        assert app.state.databases=={}
        assert list(app.state.directory.iterdir())==[]

@pytest.mark.parametrize('table_name',['sales/2026','.','..','orders?new#2026'])
def test_unusual_table_names_are_browsable_via_query_parameter(tmp_path,table_name):
    import sqlite3
    path=tmp_path/'names.db'
    db=sqlite3.connect(path)
    try:
        db.executescript(f"""CREATE TABLE "{table_name}"(id INTEGER PRIMARY KEY, value TEXT); INSERT INTO "{table_name}" VALUES(1,'visible');""")
    finally:
        db.close()
    with TestClient(app,backend_options={'loop_factory':responsive_loop}) as client:
        opened=client.post('/api/databases',files={'file':('names.db',path.read_bytes())}).json()
        page=client.get(f'/api/table/{opened["id"]}',params={'table':table_name})
        assert page.status_code==200
        assert page.json()['rows']==[[1,'visible']]
        if table_name=='sales/2026':
            legacy=client.get(f'/api/table/{opened["id"]}/sales%2F2026')
            assert legacy.status_code==200
            assert legacy.json()['rows']==page.json()['rows']

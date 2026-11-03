import pytest
pytest.importorskip("fastapi", reason="FastAPI bağımlılığı kurulu değil")
pytest.importorskip("sqlglot", reason="SQLGlot bağımlılığı kurulu değil")
from fastapi.testclient import TestClient
from tracequery.app import app

def test_demo_to_sources_and_write_rejection():
    with TestClient(app) as client:
        opened=client.post('/api/demo').json()
        response=client.post('/api/explain',json={'database_id':opened['id'],'sql':opened['demo_sql']})
        assert response.status_code==200
        row=response.json()['result']['rows'][0]
        assert row['sources']=={'o':1,'k':101,'d':10}
        assert row['checks'][0]['truth']=='TRUE'
        assert row['checks'][0]['values']==[80,60]
        rejected=client.post('/api/explain',json={'database_id':opened['id'],'sql':'DELETE FROM ogrenciler'})
        assert rejected.status_code==400
        assert len(client.get(f'/api/table/{opened["id"]}/ogrenciler').json()['rows'])==3

def test_invalid_database_and_missing_session():
    with TestClient(app) as client:
        assert client.post('/api/databases',files={'file':('bad.db',b'not sqlite')}).status_code==400
        assert client.get('/api/schema/missing').status_code==400

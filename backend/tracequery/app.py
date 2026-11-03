from contextlib import asynccontextmanager
from pathlib import Path
import tempfile
import uuid
from fastapi import FastAPI, UploadFile
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.middleware.trustedhost import TrustedHostMiddleware
from .engine import QueryError, inspect_database, read_table, explain
from .demo import create_demo, DEMO_SQL

@asynccontextmanager
async def lifespan(app):
    with tempfile.TemporaryDirectory(prefix='tracequery-') as directory:
        app.state.directory=Path(directory)
        app.state.databases={}
        yield

app=FastAPI(title='TraceQuery', lifespan=lifespan)
app.add_middleware(TrustedHostMiddleware,allowed_hosts=['localhost','127.0.0.1','testserver'])

@app.exception_handler(QueryError)
async def query_error(request,error):
    return JSONResponse({'detail':str(error)},status_code=400)

def database(identity):
    if identity not in app.state.databases:
        raise QueryError('Veritabanı oturumu bulunamadı; dosyayı tekrar açın.')
    return app.state.databases[identity]

def register(path,name):
    tables=inspect_database(path)
    identity=path.stem
    app.state.databases[identity]=path
    return {'id':identity,'name':name,'tables':tables,'demo_sql':DEMO_SQL}

@app.post('/api/demo')
def demo():
    path=app.state.directory/(uuid.uuid4().hex+'.db')
    create_demo(path)
    return register(path,'Öğrenci veritabanı')

@app.post('/api/databases')
async def upload(file:UploadFile):
    path=app.state.directory/(uuid.uuid4().hex+'.db')
    try:
        total=0
        with path.open('wb') as destination:
            while chunk:=await file.read(65536):
                total+=len(chunk)
                if total>10*1024*1024:
                    raise QueryError('Dosya sınırı 10 MB. Daha küçük bir SQLite dosyası seçin.')
                destination.write(chunk)
        return register(path,Path(file.filename or 'Veritabanı').name)
    except Exception:
        path.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

@app.get('/api/schema/{identity}')
def get_schema(identity:str):
    return inspect_database(database(identity))

@app.get('/api/table/{identity}/{table}')
def table(identity:str,table:str,offset:int=0):
    if offset<0: raise QueryError('Sayfa başlangıcı negatif olamaz.')
    return read_table(database(identity),table,offset)

class ExplainRequest(BaseModel):
    database_id:str
    sql:str=Field(min_length=1,max_length=20000)

@app.post('/api/explain')
def run_query(body:ExplainRequest):
    return explain(database(body.database_id),body.sql)

build=Path(__file__).resolve().parents[2]/'frontend'/'dist'
if build.is_dir():
    app.mount('/',StaticFiles(directory=build,html=True),name='frontend')

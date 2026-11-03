import sqlite3
import asyncio
import tempfile
import threading
import unittest
from pathlib import Path

class ExecutionTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # The restricted environment can lose executor thread wakeups at loop
        # shutdown (also reproducible with bare asyncio.to_thread). A timer
        # keeps the real loop responsive during test cleanup; no work is mocked.
        loop=asyncio.get_running_loop()
        def wake():
            if not loop.is_closed():
                loop.call_later(0.05,wake)
        loop.call_later(0.05,wake)

    async def test_disconnected_client_interrupts_real_sqlite_work(self):
        from tracequery.execution import run_with_disconnect
        from tracequery.engine import connect, QueryError
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'test.db'
            db=sqlite3.connect(path)
            db.execute('CREATE TABLE records(id INTEGER PRIMARY KEY)')
            db.close()
            started=threading.Event()
            finished=threading.Event()
            def work(cancel):
                try:
                    with connect(path,cancel=cancel) as connection:
                        started.set()
                        return connection.execute('WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<100000000) SELECT sum(x) FROM n').fetchone()
                finally:
                    finished.set()
            async def disconnected():
                return started.is_set()
            with self.assertRaisesRegex(QueryError,'iptal'):
                await run_with_disconnect(work,disconnected)
            self.assertTrue(finished.is_set(),'Worker must close its connection before returning.')

    async def test_connected_client_receives_real_database_result(self):
        from tracequery.execution import run_with_disconnect
        from tracequery.engine import connect
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'test.db'
            db=sqlite3.connect(path)
            db.executescript('CREATE TABLE records(id INTEGER PRIMARY KEY); INSERT INTO records VALUES(7);')
            db.close()
            def work(cancel):
                with connect(path,cancel=cancel) as connection:
                    return connection.execute('SELECT id FROM records').fetchall()
            async def connected(): return False
            self.assertEqual(await run_with_disconnect(work,connected),[(7,)])

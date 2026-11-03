"""Run bounded SQLite work without blocking the HTTP event loop."""
import asyncio
from threading import Event
from .engine import QueryError

async def run_with_disconnect(work, is_disconnected):
    cancelled=Event()
    worker=asyncio.create_task(asyncio.to_thread(work,cancelled))
    try:
        while not worker.done():
            if await is_disconnected():
                raise QueryError('İşlem kullanıcı tarafından iptal edildi.')
            await asyncio.wait({worker},timeout=0.05)
        return await worker
    finally:
        cancelled.set()
        # Drain the bounded worker so no SQLite connection outlives this request.
        try:
            await asyncio.shield(worker)
        except (Exception,asyncio.CancelledError):
            pass

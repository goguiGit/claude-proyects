from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.database import get_connection, init_db
from src.router import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    conn = get_connection()
    init_db(conn)
    conn.close()
    yield


app = FastAPI(title="Todo API", version="1.0.0", lifespan=lifespan)
app.include_router(router)

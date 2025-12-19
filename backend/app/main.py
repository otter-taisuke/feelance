from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import ALLOW_ORIGINS
from app.repositories.csv_store import ensure_data_files
from app.routers import auth, transactions

ensure_data_files()

app = FastAPI(title="Feelance API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(transactions.router)


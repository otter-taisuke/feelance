from fastapi import APIRouter, HTTPException

from app.repositories.csv_store import read_users
from app.schemas.auth import LoginRequest, User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=User)
def login(payload: LoginRequest) -> User:
    df = read_users()
    match = df[df["user_id"] == payload.user_id]
    if match.empty:
        raise HTTPException(status_code=401, detail="User not found")
    row = match.iloc[0]
    return User(user_id=row["user_id"], display_name=row.get("display_name"))


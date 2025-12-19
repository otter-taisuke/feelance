from fastapi import APIRouter, HTTPException, Request, Response
from itsdangerous import BadSignature, SignatureExpired, TimestampSigner

from app.core.config import SESSION_COOKIE_NAME, SESSION_MAX_AGE, SESSION_SECRET
from app.repositories.csv_store import read_users
from app.schemas.auth import LoginRequest, User

router = APIRouter(prefix="/auth", tags=["auth"])

signer = TimestampSigner(SESSION_SECRET)


def _issue_cookie(response: Response, user_id: str) -> None:
    token = signer.sign(user_id.encode("utf-8")).decode("utf-8")
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
        path="/",
    )


def _clear_cookie(response: Response) -> None:
    # Cookie 属性は発行時と揃える
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
    )


def _get_user_from_cookie(request: Request) -> User:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        user_id = signer.unsign(token, max_age=SESSION_MAX_AGE).decode("utf-8")
    except SignatureExpired:
        raise HTTPException(status_code=401, detail="Session expired")
    except BadSignature:
        raise HTTPException(status_code=401, detail="Invalid session")

    df = read_users()
    match = df[df["user_id"] == user_id]
    if match.empty:
        raise HTTPException(status_code=401, detail="User not found")
    row = match.iloc[0]
    return User(user_id=row["user_id"], display_name=row.get("display_name"))


@router.post("/login", response_model=User)
def login(payload: LoginRequest, response: Response) -> User:
    df = read_users()
    match = df[df["user_id"] == payload.user_id]
    if match.empty:
        raise HTTPException(status_code=401, detail="User not found")
    row = match.iloc[0]
    user = User(user_id=row["user_id"], display_name=row.get("display_name"))
    _issue_cookie(response, user.user_id)
    return user


@router.post("/logout", status_code=204)
def logout(response: Response) -> None:
    _clear_cookie(response)


@router.get("/me", response_model=User)
def me(request: Request) -> User:
    return _get_user_from_cookie(request)


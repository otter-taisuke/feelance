from pydantic import BaseModel


class LoginRequest(BaseModel):
    user_id: str


class User(BaseModel):
    user_id: str
    display_name: str | None = None


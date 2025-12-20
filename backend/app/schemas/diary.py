from datetime import datetime
from typing import List, Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatStreamRequest(BaseModel):
    tx_id: str = Field(..., description="対象となるトランザクションID")
    messages: List[ChatMessage] = Field(
        default_factory=list, description="これまでのチャット履歴（systemはサーバー側で付与）"
    )


class GenerateDiaryRequest(BaseModel):
    tx_id: str
    messages: List[ChatMessage] = Field(default_factory=list)


class GenerateDiaryResponse(BaseModel):
    diary_title: str
    diary_body: str


class SaveDiaryRequest(BaseModel):
    tx_id: str
    diary_title: str
    diary_body: str


class SaveDiaryResponse(BaseModel):
    event_name: str
    diary_title: str
    diary_body: str
    created_at: datetime
    user_id: str


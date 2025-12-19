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


class GenerateReportRequest(BaseModel):
    tx_id: str
    messages: List[ChatMessage] = Field(default_factory=list)


class GenerateReportResponse(BaseModel):
    report_title: str
    report_body: str


class SaveReportRequest(BaseModel):
    tx_id: str
    report_title: str
    report_body: str


class SaveReportResponse(BaseModel):
    event_name: str
    report_title: str
    report_body: str
    created_at: datetime
    user_id: str


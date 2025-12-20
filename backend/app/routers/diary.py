from typing import List, Optional

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.routers.auth import _get_user_from_cookie
from app.schemas.diary import (
    ChatStreamRequest,
    DiaryEntry,
    GenerateDiaryRequest,
    GenerateDiaryResponse,
    SaveDiaryRequest,
    SaveDiaryResponse,
)
from app.services.diary import generate_diary, list_diaries, save_diary, stream_chat

router = APIRouter(prefix="/diary", tags=["diary"])


@router.post("/chat/stream")
async def chat_stream(payload: ChatStreamRequest, request: Request) -> StreamingResponse:
    user = _get_user_from_cookie(request)

    async def event_generator():
        try:
            for token in stream_chat(payload.tx_id, payload.messages, user.user_id):
                yield f"data: {token}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            yield f"event: error\ndata: {str(exc)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/generate", response_model=GenerateDiaryResponse)
def generate(payload: GenerateDiaryRequest, request: Request) -> GenerateDiaryResponse:
    user = _get_user_from_cookie(request)
    return generate_diary(payload.tx_id, payload.messages, user.user_id)


@router.post("/save", response_model=SaveDiaryResponse)
def save(payload: SaveDiaryRequest, request: Request) -> SaveDiaryResponse:
    user = _get_user_from_cookie(request)
    saved = save_diary(payload.tx_id, payload.diary_title, payload.diary_body, user.user_id)
    return SaveDiaryResponse(
        id=saved["id"],
        tx_id=saved["tx_id"],
        event_name=saved["event_name"],
        diary_title=saved["diary_title"],
        diary_body=saved["diary_body"],
        transaction_date=saved["transaction_date"],
        created_at=saved["created_at"],
        user_id=saved["user_id"],
    )


@router.get("", response_model=List[DiaryEntry])
def list_diary(
    request: Request,
    year: Optional[int] = None,
    month: Optional[int] = None,
    tx_id: Optional[str] = None,
) -> List[DiaryEntry]:
    user = _get_user_from_cookie(request)
    return list_diaries(user.user_id, year=year, month=month, tx_id=tx_id)


from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.routers.auth import _get_user_from_cookie
from app.schemas.reports import (
    ChatStreamRequest,
    GenerateReportRequest,
    GenerateReportResponse,
    SaveReportRequest,
    SaveReportResponse,
)
from app.services.reports import generate_report, save_report, stream_chat

router = APIRouter(prefix="/reports", tags=["reports"])


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


@router.post("/generate", response_model=GenerateReportResponse)
def generate(payload: GenerateReportRequest, request: Request) -> GenerateReportResponse:
    user = _get_user_from_cookie(request)
    return generate_report(payload.tx_id, payload.messages, user.user_id)


@router.post("/save", response_model=SaveReportResponse)
def save(payload: SaveReportRequest, request: Request) -> SaveReportResponse:
    user = _get_user_from_cookie(request)
    saved = save_report(payload.tx_id, payload.report_title, payload.report_body, user.user_id)
    return SaveReportResponse(
        event_name=saved["event_name"],
        report_title=saved["report_title"],
        report_body=saved["report_body"],
        created_at=saved["created_at"],
        user_id=saved["user_id"],
    )


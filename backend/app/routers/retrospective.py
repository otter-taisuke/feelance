from fastapi import APIRouter, Request

from app.routers.auth import _get_user_from_cookie
from app.schemas.retrospective import RetrospectiveSummary
from app.services.retrospective import summarize_retrospective

router = APIRouter(prefix="/retrospective", tags=["retrospective"])


@router.get("/summary", response_model=RetrospectiveSummary)
def get_retrospective_summary(request: Request, months: int = 12) -> RetrospectiveSummary:
    user = _get_user_from_cookie(request)
    safe_months = months if months > 0 else 12
    return summarize_retrospective(user.user_id, months=safe_months)


from fastapi import APIRouter, Request

from ..models.schemas import ReportContentRequest, ReportContentResponse


router = APIRouter(prefix="/report", tags=["adaptive-memory"])


@router.post("/content", response_model=ReportContentResponse)
def report_content(payload: ReportContentRequest, request: Request) -> ReportContentResponse:
    engine = request.app.state.engine
    result = engine.report_offensive_content(text=payload.text, label=payload.label)
    return ReportContentResponse(**result)

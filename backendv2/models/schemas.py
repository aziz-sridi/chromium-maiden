from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


CategoryLiteral = Literal["none", "insult", "harassment", "discrimination", "violent_hate"]


class ModerationRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    conversation_context: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class ModerationResult(BaseModel):
    hate_score: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    category: CategoryLiteral
    reason: str
    suggested_alternative: Optional[str] = None
    suggested_alternatives: Optional[List[str]] = None


class ReportContentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    label: str = Field(default="offensive")


class ReportContentResponse(BaseModel):
    status: Literal["stored"]
    report_id: int
    faiss_id: int

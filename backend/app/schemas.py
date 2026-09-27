"""
Pydantic models shared across the API.
Keeping these separate from prompts/graph code means the same schema
drives: (1) the LLM's structured output, (2) the FastAPI response model,
and (3) the frontend's expected JSON shape (mirrored in api.js).
"""
from __future__ import annotations
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class CategoryScore(BaseModel):
    name: str = Field(description="Rubric category name, e.g. 'Keyword & Skill Match'")
    weight_pct: int = Field(description="Weight of this category in the overall score, 0-100")
    score: int = Field(ge=0, le=100, description="Score for this category, 0-100")
    justification: str = Field(description="1-2 sentence, specific justification tied to the actual resume/JD text")


class ATSReport(BaseModel):
    overall_score: int = Field(ge=0, le=100, description="Weighted overall ATS confidence score, 0-100")
    verdict: Literal["Strong Match", "Moderate Match", "Weak Match", "Not a Match"] = Field(
        description="One-line categorical verdict derived from overall_score"
    )
    category_scores: List[CategoryScore]
    matched_keywords: List[str] = Field(description="Skills/keywords present in both the JD and resume")
    missing_keywords: List[str] = Field(description="Skills/keywords required or preferred by the JD but absent/weak in the resume")
    strengths: List[str] = Field(description="2-4 genuine strengths of this resume against this JD")
    recommendations: List[str] = Field(
        description="3-6 concrete, specific, actionable edits to raise the score. Must be grounded only in the "
                     "candidate's real experience -- never invent skills or history they don't have."
    )
    summary: str = Field(description="2-3 sentence plain-English summary of the fit")

    # populated by our own code, not the LLM
    semantic_similarity: Optional[float] = Field(
        default=None, description="Cosine similarity between resume and JD embeddings, 0-1"
    )


class ScoreResponse(BaseModel):
    report: ATSReport
    resume_text: str
    jd_text: str


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    resume_text: str
    jd_text: str
    report_summary: Optional[str] = Field(
        default=None, description="Short summary of the already-generated ATS report, if any, for grounding"
    )
    history: List[ChatMessage] = Field(default_factory=list)
    question: str


class ChatResponse(BaseModel):
    answer: str

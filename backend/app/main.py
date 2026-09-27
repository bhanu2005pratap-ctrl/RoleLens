from __future__ import annotations
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.services.parsing import extract_text, clip
from app.scoring_graph import run_scoring
from app.chains import qa_chain, to_langchain_history
from app.schemas import ScoreResponse, ChatRequest, ChatResponse

settings = get_settings()

app = FastAPI(title="ATS Score API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/score", response_model=ScoreResponse)
async def score_resume(
    resume_file: UploadFile = File(..., description="Resume as .pdf, .docx, or .txt"),
    jd_text: str = Form(..., description="Job description, pasted as plain text"),
):
    resume_text = clip(await extract_text(resume_file))
    jd_text = clip(jd_text)

    if not jd_text.strip():
        raise HTTPException(status_code=400, detail="Job description text is required.")

    report = run_scoring(resume_text, jd_text)

    return ScoreResponse(
    report=report,
    resume_text=resume_text,
    jd_text=jd_text,
)


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    answer = qa_chain.invoke({
        "resume_text": clip(req.resume_text),
        "jd_text": clip(req.jd_text),
        "report_summary": req.report_summary or "No prior report available for this session.",
        "history": to_langchain_history(req.history),
        "question": req.question,
    })
    return ChatResponse(answer=answer)

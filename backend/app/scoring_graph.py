"""
LangGraph pipeline for /api/score.

A plain LangChain chain would be enough for a single straight-line
call, but scoring genuinely branches (bad input should short-circuit
before we spend an embedding call + an LLM call on it), so it's modeled
as a small graph:

    validate_inputs --(too short)--> reject
                    --(ok)--> compute_similarity --> generate_report --> assemble

Each node only touches the state keys it owns, which is what makes
this easy to test and extend (e.g. add a caching node, or a
"regenerate with stricter prompt if overall_score is null" retry edge).
"""
from __future__ import annotations
from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END
from fastapi import HTTPException

from app.services.embeddings import resume_jd_similarity
from app.chains import scoring_chain
from app.schemas import ATSReport

MIN_CHARS = 50


class ScoringState(TypedDict, total=False):
    resume_text: str
    jd_text: str
    similarity: float
    report: ATSReport
    error: Optional[str]


def validate_inputs(state: ScoringState) -> ScoringState:
    resume_ok = len(state["resume_text"].strip()) >= MIN_CHARS
    jd_ok = len(state["jd_text"].strip()) >= MIN_CHARS
    if not (resume_ok and jd_ok):
        return {**state, "error": "Resume or job description text is too short to score reliably."}
    return state


def route_after_validation(state: ScoringState) -> str:
    return "reject" if state.get("error") else "compute_similarity"


def compute_similarity(state: ScoringState) -> ScoringState:
    sim = resume_jd_similarity(state["resume_text"], state["jd_text"])
    return {**state, "similarity": sim}


def generate_report(state: ScoringState) -> ScoringState:
    report: ATSReport = scoring_chain.invoke({
        "resume_text": state["resume_text"],
        "jd_text": state["jd_text"],
        "semantic_similarity": f"{state['similarity']:.2f}",
    })
    report.semantic_similarity = state["similarity"]
    return {**state, "report": report}


def reject(state: ScoringState) -> ScoringState:
    raise HTTPException(status_code=422, detail=state["error"])


def build_scoring_graph():
    graph = StateGraph(ScoringState)
    graph.add_node("validate_inputs", validate_inputs)
    graph.add_node("compute_similarity", compute_similarity)
    graph.add_node("generate_report", generate_report)
    graph.add_node("reject", reject)

    graph.set_entry_point("validate_inputs")
    graph.add_conditional_edges("validate_inputs", route_after_validation, {
        "reject": "reject",
        "compute_similarity": "compute_similarity",
    })
    graph.add_edge("compute_similarity", "generate_report")
    graph.add_edge("generate_report", END)
    graph.add_edge("reject", END)
    return graph.compile()


scoring_graph = build_scoring_graph()


def run_scoring(resume_text: str, jd_text: str) -> ATSReport:
    result: ScoringState = scoring_graph.invoke({"resume_text": resume_text, "jd_text": jd_text})
    return result["report"]

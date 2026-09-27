"""
Semantic similarity between resume and JD, via the Hugging Face
Inference API -- NOT a locally loaded model.

Why: loading BAAI/bge-m3 locally means shipping torch + transformers +
model weights into the deployment bundle, which blows past Vercel's
serverless function size limit and cold-start budget. Calling the
hosted inference endpoint keeps the backend a thin, fast function that
happens to call a very good embedding model.

If you outgrow the free Inference API (rate limits, always-warm
latency needs), the only thing that changes is this file: point
InferenceClient at a dedicated HF Inference Endpoint, or self-host
sentence-transformers on a normal server/Docker box -- everything
downstream (scoring graph, prompts) is unaffected.
"""
from __future__ import annotations
import numpy as np
from huggingface_hub import InferenceClient
from app.config import get_settings

_settings = get_settings()
_client = InferenceClient(token=_settings.hf_token, provider=_settings.hf_provider)


def _embed(text: str) -> np.ndarray:
    # BGE models are trained with an instruction prefix for queries; for a
    # straight document-vs-document similarity like resume-vs-JD, embedding
    # both sides "as documents" (no prefix) gives the more stable signal.
    vector = _client.feature_extraction(text[:8000], model=_settings.embedding_model)
    arr = np.array(vector, dtype=np.float32)
    if arr.ndim == 2:  # some providers return token-level vectors; mean-pool
        arr = arr.mean(axis=0)
    return arr


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = (np.linalg.norm(a) * np.linalg.norm(b)) or 1e-8
    return float(np.dot(a, b) / denom)


def resume_jd_similarity(resume_text: str, jd_text: str) -> float:
    """Returns a 0-1 semantic similarity score between resume and JD text."""
    resume_vec = _embed(resume_text)
    jd_vec = _embed(jd_text)
    sim = cosine_similarity(resume_vec, jd_vec)
    # Cosine similarity for BGE embeddings on related-but-different documents
    # typically lands in ~0.4-0.85, not 0-1 in practice; clamp defensively.
    return max(0.0, min(1.0, sim))

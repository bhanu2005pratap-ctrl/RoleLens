"""
Vercel's Python runtime looks for an ASGI/WSGI `app` under /api.
This just re-exports the real FastAPI app so `app/main.py` stays a
normal, independently runnable FastAPI project (uvicorn app.main:app).
"""
from app.main import app  # noqa: F401

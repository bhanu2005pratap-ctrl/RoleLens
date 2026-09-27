import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # --- Hugging Face ---
    # Free/serverless Hugging Face Inference Providers token. Create one at
    # https://huggingface.co/settings/tokens (read access is enough).
    hf_token: str = os.environ.get("HF_TOKEN", "")

    # Embedding model used to compute resume<->JD semantic similarity.
    # BAAI/bge-m3: MIT license, self-hostable, 8K context, strong on MTEB
    # retrieval/STS tasks, and widely mirrored across HF Inference Providers.
    embedding_model: str = os.environ.get("EMBEDDING_MODEL", "BAAI/bge-m3")

    # Chat/instruct model used for the scoring rationale + Q&A.
    # Swap this for any HF chat model, or point llm.py at OpenAI/Anthropic --
    # the rest of the app (graph, prompts, parser) doesn't need to change.
    llm_model: str = os.environ.get("LLM_MODEL", "meta-llama/Llama-3.1-8B-Instruct")

    # Which HF Inference Provider to route through (see huggingface_hub docs).
    # "auto" lets HF pick a provider that currently serves the model.
    hf_provider: str = os.environ.get("HF_PROVIDER", "auto")

    llm_temperature: float = float(os.environ.get("LLM_TEMPERATURE", "0.2"))

    # CORS - set to your deployed frontend origin in production
    allowed_origins: list[str] = [
    origin.strip()
    for origin in os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:5173",
    ).split(",")
    if origin.strip()
]


@lru_cache
def get_settings() -> Settings:
    return Settings()

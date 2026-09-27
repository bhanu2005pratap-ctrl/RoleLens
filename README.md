# Signal — ATS Resume/JD Fit Scorer

Upload a resume + paste a job description → get a weighted ATS confidence score,
matched/missing keywords, and a chat assistant grounded in that exact resume+JD
pair (score improvement tips, likely interview questions, etc.).

## Stack
- **Frontend:** React + Vite, plain CSS (no component library)
- **Backend:** FastAPI
- **Orchestration:** LangGraph (scoring pipeline) + LangChain (prompts, parsing, chat)
- **Models:** called via the Hugging Face Inference API — no local model weights,
  no GPU, no `torch`/`transformers` in the deployment bundle (see "Why these models" below)

## Why the Hugging Face Inference API instead of a local model
Vercel serverless functions have a bundle-size ceiling (~250MB unzipped on Hobby)
and short cold starts. `torch` + `transformers` + a real embedding model's weights
blow past that easily. Calling HF's hosted Inference API means the backend only
ships `huggingface_hub` (a thin HTTP client) — this is *why* this project is
deployable on Vercel at all. If you later want guaranteed low-latency, always-warm
inference, point `EMBEDDING_MODEL`/`LLM_MODEL` at a dedicated HF Inference
Endpoint, or self-host on a normal server (Render/Fly.io/EC2/etc.) — only
`app/services/embeddings.py` and `app/services/llm.py` would need to change.

## Why these specific models
- **Embeddings — `BAAI/bge-m3`**: MIT license (fully self-hostable/commercial),
  8K context, and one of the strongest open-weight models on MTEB retrieval/STS
  as of early 2026 — the two categories that actually predict resume↔JD matching
  quality (unlike the MTEB *average*, which is dragged down by clustering/
  classification tasks you don't care about here). If you want something smaller
  and faster, swap to `BAAI/bge-small-en-v1.5` or `Qwen/Qwen3-Embedding-0.6B`
  (also Apache-2.0). Avoid `nvidia/NV-Embed-v2` unless you've checked its
  non-commercial license fits your use.
- **LLM — `meta-llama/Llama-3.1-8B-Instruct`** (default, free-tier friendly via
  HF Inference Providers): good enough for scoring rationale and Q&A, but an
  8B open model is noticeably weaker at consistent structured JSON output and
  nuanced reasoning than a frontier hosted model. **For production-quality
  output, swap `app/services/llm.py` to `ChatOpenAI("gpt-4o-mini")` or
  `ChatAnthropic("claude-sonnet-4-5")`** — the prompts, parser, and graph don't
  need to change, since they only depend on LangChain's chat-model interface.

## The prompt templates (the core deliverable)
See `backend/app/prompts/ats_prompts.py`. Two templates:
1. **Scoring prompt** — recruiter persona + an explicit weighted rubric (keyword
   match 40%, experience relevance 25%, title alignment 10%, education 10%,
   ATS formatting 10%, quantified impact 5%), calibration anchors so scores
   don't cluster in the "polite 60-75" band, an anti-fabrication rule (never
   invent skills/metrics), and Pydantic-derived JSON format instructions so the
   output parses reliably into the `ATSReport` schema.
2. **Q&A prompt** — career-coach persona grounded in the same resume/JD text
   plus the already-generated report, with rules against generic advice and
   against suggesting the candidate fabricate anything.

## Local development

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in HF_TOKEN
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Vite proxies nothing by default — for local dev either set
`VITE_API_BASE_URL=http://localhost:8000/api` in `frontend/.env.local`, or add a
Vite dev proxy for `/api` → `http://localhost:8000`.

## Deploying to Vercel

**Recommended: two Vercel projects** (simpler, avoids monorepo build quirks):
1. Create a Vercel project with **Root Directory = `backend`** → it auto-detects
   `backend/vercel.json` and deploys the FastAPI app as a Python serverless
   function. Set `HF_TOKEN`, `LLM_MODEL`, `EMBEDDING_MODEL`, `ALLOWED_ORIGINS`
   as environment variables in the Vercel dashboard.
2. Create a second Vercel project with **Root Directory = `frontend`** → it
   auto-detects Vite and deploys the static build. Set `VITE_API_BASE_URL` to
   the first project's URL + `/api`.

**Alternative: one project, both together** — the root `vercel.json` in this repo
builds both from a single project. It works, but multi-build monorepo configs on
Vercel are more prone to routing/asset-path edge cases than two plain projects,
so only use it if you specifically want a single deployment.

## Troubleshooting
- **`Model X is not supported for task text-generation and provider Y`**: HF's
  `provider="auto"` picked a provider that doesn't serve that model for chat.
  Open the model's page on huggingface.co → "Inference Providers" panel, and
  set `HF_PROVIDER` to one explicitly listed there (e.g. `together`,
  `fireworks-ai`, `novita`, `sambanova`). This is the single most common setup
  issue with the open-model path — it's also the strongest practical argument
  for just switching `llm.py` to a hosted API provider instead.

## Known limitations / next steps
- No persistent storage — each score/chat request is stateless; the frontend
  resends the resume/JD text and chat history each turn. Fine for a single-user
  tool; add Vercel KV/Upstash Redis or Postgres if you need saved history across
  sessions or devices.
- No auth/rate limiting — add both before exposing this publicly, since each
  request costs an HF Inference API call.
- PDF parsing is text-based only (`pypdf`); scanned/image resumes will fail
  extraction and return a 422 — add OCR (e.g. a hosted OCR API) if you need that.

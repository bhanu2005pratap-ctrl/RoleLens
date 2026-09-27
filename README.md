# RoleLens — AI Resume & Job Match

> Analyze how closely a resume matches a job description, understand the gaps, and ask grounded follow-up questions about improving the application.

**Live app:** https://rolelens-orcin.vercel.app

---

## Overview

RoleLens is an AI-assisted resume analysis application built around a resume + job description pair.

The application:

- accepts a **PDF, DOCX, or TXT resume**
- accepts a full job description
- extracts resume text on the backend
- computes **semantic resume ↔ job-description similarity** using `BAAI/bge-m3`
- uses an instruction-tuned LLM to analyze the resume against the role
- produces a structured match report with category scores, matched skills, missing skills, strengths, and recommendations
- calculates the final weighted score in application code rather than asking the LLM to invent the final score
- provides a follow-up assistant grounded in the analyzed resume, job description, and generated report
- is deployable as a full-stack application on **Vercel Services**

The goal is not to reproduce a proprietary ATS. The application provides a transparent, explainable approximation of resume-to-role fit using semantic similarity plus structured LLM analysis.

---

## Product flow

```text
Resume (PDF / DOCX / TXT)
            │
            ▼
      Text extraction
            │
            ├───────────────┐
            ▼               ▼
    Keyword / rubric     BGE-M3
       analysis        embeddings
            │               │
            └───────┬───────┘
                    ▼
             LLM analysis
                    │
                    ▼
          Structured ATS report
                    │
                    ▼
        Deterministic weighted score
                    │
                    ▼
          Grounded follow-up chat
```

---

## Key features

### 1. Resume parsing

Supported formats:

- PDF
- DOCX
- TXT

The parser prefers the actual file format/signature instead of blindly trusting the browser MIME type. This matters because DOCX files are ZIP containers and can sometimes be reported with an incorrect `content_type`.

PDF extraction is text-based. Scanned/image-only resumes are not OCR'd by the current implementation.

### 2. Semantic resume ↔ JD matching

`BAAI/bge-m3` is used through the Hugging Face Inference API to produce embeddings for the resume and job description. The backend derives a semantic similarity signal from those embeddings.

The embedding model is hosted remotely, so the application does **not** ship model weights or run a local embedding model inside the Vercel function.

### 3. Structured LLM analysis

The LLM evaluates the resume using a recruiter-oriented rubric covering:

- Keyword & skill match — **40%**
- Experience relevance — **25%**
- Title & role alignment — **10%**
- Education & certifications — **10%**
- ATS formatting — **10%**
- Quantified impact — **5%**

The model is instructed not to fabricate skills, experience, metrics, or achievements.

### 4. Deterministic final score

The LLM produces the component scores and supporting analysis, but the backend owns the final arithmetic.

```text
Final Score =
    Keyword Match            × 0.40
  + Experience Relevance     × 0.25
  + Role Alignment           × 0.10
  + Education / Certs        × 0.10
  + ATS Formatting            × 0.10
  + Quantified Impact         × 0.05
```

This prevents the final score from being determined purely by the model's free-form interpretation of the weighting instructions.

### 5. Grounded follow-up chat

After scoring, the assistant can answer questions using:

- the analyzed resume text
- the job description
- the generated report
- the conversation history

The application keeps the full extracted resume/JD text used for analysis (subject to the backend's configured character limit) instead of sending only a short preview to the chat model.

### 6. Responsive UI

The frontend is designed for desktop, tablet, and mobile layouts with responsive breakpoints, stacked mobile sections, adaptive cards, and a mobile-friendly chat/input layout.

---

## Tech stack

### Frontend

- React
- Vite
- Plain CSS
- Lucide React icons

### Backend

- FastAPI
- Python
- Pydantic
- LangGraph
- LangChain Core

### AI / ML

- Hugging Face Inference API
- `BAAI/bge-m3` for embeddings
- `meta-llama/Llama-3.1-8B-Instruct` as the default LLM

The backend uses Hugging Face's hosted inference client instead of loading `torch`, `transformers`, `sentence-transformers`, or model weights into the serverless deployment.

### Parsing

- `pypdf` for PDF text extraction
- `python-docx` for DOCX extraction

### Deployment

- Vercel Services
- Vite frontend service
- FastAPI backend service

---

## Why hosted Hugging Face inference?

A serverless backend is a poor place to bundle a full local ML stack when the models can be called remotely.

The production architecture therefore keeps the Vercel function lightweight:

```text
FastAPI
   │
   ├── Hugging Face InferenceClient → BGE-M3
   │
   └── Hugging Face InferenceClient → Llama 3.1 8B
```

This avoids packaging multi-gigabyte ML dependencies/model artifacts into the serverless function. It also keeps the same model-provider abstraction usable if the application is later moved to another backend host or a dedicated inference endpoint.

---

## Project structure

```text
RoleLens/
│
├── vercel.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatPanel.jsx
│   │   │   ├── ScoreReport.jsx
│   │   │   └── UploadPanel.jsx
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── backend/
│   ├── api/
│   │   └── index.py
│   ├── app/
│   │   ├── prompts/
│   │   │   └── ats_prompts.py
│   │   ├── services/
│   │   │   ├── embeddings.py
│   │   │   ├── llm.py
│   │   │   └── parsing.py
│   │   ├── chains.py
│   │   ├── config.py
│   │   ├── main.py
│   │   ├── schemas.py
│   │   └── scoring_graph.py
│   └── requirements.txt
│
└── README.md
```

---

## Local development

### Prerequisites

- Python 3.10+ recommended
- Node.js 18+
- npm
- A Hugging Face account/token with access to the configured LLM

### 1. Clone the repository

```bash
git clone https://github.com/bhanu2005pratap-ctrl/RoleLens.git
cd RoleLens
```

### 2. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env`:

```env
HF_TOKEN=your_huggingface_token
LLM_MODEL=meta-llama/Llama-3.1-8B-Instruct
EMBEDDING_MODEL=BAAI/bge-m3
HF_PROVIDER=auto
LLM_TEMPERATURE=0.2
ALLOWED_ORIGINS=http://localhost:5173
```

Start FastAPI:

```powershell
uvicorn app.main:app --reload --port 8000
```

Health check:

```text
http://127.0.0.1:8000/api/health
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

### 3. Frontend

Open a second terminal:

```powershell
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

Start Vite:

```powershell
npm run dev
```

Open:

```text
http://localhost:5173
```

---

## Environment variables

| Variable | Purpose | Example |
|---|---|---|
| `HF_TOKEN` | Hugging Face authentication | `hf_...` |
| `LLM_MODEL` | LLM used for scoring/chat | `meta-llama/Llama-3.1-8B-Instruct` |
| `EMBEDDING_MODEL` | Embedding model | `BAAI/bge-m3` |
| `HF_PROVIDER` | Hugging Face provider selection | `auto` |
| `LLM_TEMPERATURE` | LLM generation temperature | `0.2` |
| `ALLOWED_ORIGINS` | Backend CORS origins | `http://localhost:5173` |
| `VITE_API_BASE_URL` | Frontend API base URL | `http://127.0.0.1:8000/api` locally; `/api` on Vercel Services |

Never commit real `.env` or `.env.local` files.

---

## Vercel deployment

The production application uses **one Vercel project with Vercel Services**, not two unrelated projects.

The repository root contains `vercel.json` which declares:

- `frontend/` as the Vite web service
- `backend/` as the FastAPI service
- `/api/*` routes to the backend
- all other routes serve the frontend

This gives the application one public origin.

### Vercel project settings

```text
Project type: Services
Root Directory: ./
```

### Production environment variables

Set these in the Vercel dashboard:

```text
HF_TOKEN=your_huggingface_token
LLM_MODEL=meta-llama/Llama-3.1-8B-Instruct
EMBEDDING_MODEL=BAAI/bge-m3
HF_PROVIDER=auto
LLM_TEMPERATURE=0.2
ALLOWED_ORIGINS=https://your-production-domain.vercel.app
VITE_API_BASE_URL=/api
```

`VITE_API_BASE_URL=/api` is intentional: the frontend and backend share the same Vercel domain and Vercel routes `/api/*` to FastAPI.

### Deploy flow

1. Push changes to GitHub.
2. Import the repository into Vercel.
3. Keep the root directory as `./`.
4. Select the Services application preset.
5. Add the environment variables.
6. Deploy.
7. Verify `/api/health`.
8. Test resume upload, scoring, and grounded chat.

---

## Troubleshooting

### `401 GatedRepoError` for Llama

The configured Llama model is gated. The Hugging Face account behind `HF_TOKEN` must have access to the model.

Verify the token locally:

```powershell
python -c "from huggingface_hub import HfApi; import os; print(HfApi(token=os.environ['HF_TOKEN']).model_info('meta-llama/Llama-3.1-8B-Instruct').id)"
```

### `provider is not a default parameter`

Avoid wrapping the hosted LLM with an outdated `langchain-huggingface` integration. The production implementation uses Hugging Face's `InferenceClient` directly and adapts it to the LangChain runnable interface.

### `invalid pdf header: b'PK\\x03\\x04'`

A DOCX file is a ZIP container and commonly starts with `PK...`. If it is incorrectly treated as a PDF, check `backend/app/services/parsing.py` and make sure file-type detection prefers the real file format/signature.

### `404` from `/api/score` in local development

Make sure:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

is present in `frontend/.env.local`, then restart Vite.

### `Unexpected end of JSON input` in the frontend

The frontend should read the response body safely before attempting `JSON.parse`. This avoids hiding a backend error behind a secondary JSON parsing error.

### Vercel bundle too large

Do not install local `torch`, `transformers`, `sentence-transformers`, or model weights into the deployment when using hosted Hugging Face inference. The production backend should remain a thin API layer.

---

## Security and deployment notes

- Never commit `HF_TOKEN`.
- Store production secrets in Vercel Environment Variables.
- Add authentication and rate limiting before exposing the application to unrestricted public traffic.
- Hosted inference calls incur provider-side usage/limits, so abuse protection matters if the app becomes public.
- Resume content is sensitive user data; avoid logging raw resumes, job descriptions, or model prompts unnecessarily.

---

## Current limitations

- No user accounts or persistent sessions.
- No persistent report/chat history across devices.
- No production-grade authentication or rate limiting yet.
- PDF extraction is text-based; scanned image resumes need OCR.
- The score is an application-specific heuristic, not an official ATS score from any recruiting system.
- LLM outputs can still vary between runs; the deterministic part is the final weighted arithmetic, not the model's underlying analysis.

---

## Future improvements

Potential next steps:

- Add a labelled resume/JD evaluation set and measure scoring error/correlation.
- Add OCR for scanned resumes.
- Add authentication and rate limiting.
- Persist reports and chat history with Postgres/Redis.
- Add job-specific resume optimization and rewrite suggestions.
- Add observability for model latency, failures, and token usage without logging sensitive document contents.
- Support configurable LLM providers for production deployments.

---

## License

Add the repository's chosen license here before open-source publication.

---

## Disclaimer

RoleLens provides an AI-assisted estimate of resume-to-job fit. It does not reproduce or guarantee the behavior of any proprietary Applicant Tracking System, recruiter workflow, or hiring decision.

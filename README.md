# 🧠 CodeMentorAI

> **Next-Generation Full-Stack AI Codebase Intelligence & Mentorship Platform**  
> Powered by **React.js**, **FastAPI**, **LangChain**, **Groq Ultra-Fast LLMs**, **FAISS Vector Search**, and **TiDB / MySQL**.

---

## 📌 Problem Statement

Understanding, onboarding onto, and maintaining large or unfamiliar software repositories is one of the most time-consuming challenges for software engineers and engineering teams:

1. **High Onboarding Friction**: Developers spend days or weeks manually reading unfamiliar code, tracing control flows, and understanding interconnected modules.
2. **Outdated or Missing Documentation**: Repositories often lack up-to-date architectural diagrams, component relationships, or comprehensive READMEs.
3. **Hidden Bugs & Security Risks**: Subtle logical flaws, concurrency bugs, missing input validations, and code smells easily slip through manual code reviews.
4. **Context Switching & Slow Q&A**: Developers waste hours cross-referencing files, search indexes, and documentation rather than getting grounded, contextual answers with exact file citations.
5. **Lack of Visual Architecture**: Visualizing data flows and component hierarchies requires tedious manual diagramming that quickly falls out of sync with code changes.

---

## 💡 The Solution: CodeMentorAI

**CodeMentorAI** transforms repository exploration into an interactive, visual, and grounded AI pair-programming experience:

- **1-Click Public Repository Ingestion**: Clones, parses, and tokenizes any public GitHub repository.
- **RAG-Powered Chat with Grounded Citations**: Query your codebase in natural language with answers backed by retrieved code context and clickable source file references.
- **Instant Architectural Visualization**: Auto-generates interactive Mermaid flowcharts illustrating module dependencies, data pipelines, and external integrations.
- **Automated Deep Bug & Vulnerability Scan**: Categorizes defects by severity (High / Medium / Low) with actionable code fixes.
- **Production README & Executive Summary Generation**: Generates comprehensive GitHub-ready documentation, tech stack analysis, and key entry-point breakdowns.
- **Developer Activity & Session Continuity**: Retains chat histories, analysis caches, and activity logs across sessions with JWT authentication, 1-click Google OAuth, and TiDB / MySQL persistence.

---

## 🌟 Architecture & Tech Stack

```mermaid
flowchart TD
    subgraph Frontend ["Frontend (React + Vite)"]
        UI["Modern Dark Glassmorphism UI"]
        MermaidView["Live Mermaid Flowchart Renderer"]
        SyntaxViewer["Syntax-Highlighted Code Explorer"]
        GoogleGSI["Google Identity Services (1-Click OAuth)"]
    end

    subgraph Backend ["Backend (FastAPI REST API)"]
        Router["Modular Routers (/auth, /repo, /ai, /activities)"]
        AuthModule["JWT & Google Token Verifier"]
        Ingestion["Git Ingestion & Recursive Chunker"]
        RAGPipeline["RAG Chain (Retrieval-Augmented Generation)"]
    end

    subgraph Storage ["Data & Vector Layer"]
        TiDB["TiDB Cloud / MySQL (Users, History, Activity, Sessions)"]
        SQLite["SQLite Fallback Engine (Zero-Config Local)"]
        FAISS["FAISS Local Vector Store"]
        EmbeddingModel["all-MiniLM-L6-v2 Embeddings"]
    end

    subgraph LLM ["Inference Layer"]
        Groq["Groq API (OpenAI GPT-OSS 120B / Llama 3.1 8B / Mixtral / Gemma 2)"]
    end

    UI <-->|REST API / JSON| Router
    Router --> AuthModule
    Router --> Ingestion
    Router --> RAGPipeline
    RAGPipeline --> EmbeddingModel
    EmbeddingModel --> FAISS
    RAGPipeline --> Groq
    AuthModule --> TiDB
    Router --> SQLite
```

### Technology Breakdown

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Lucide Icons, PrismJS, Mermaid.js | High-performance SPA with responsive dark mode and interactive diagrams |
| **Backend** | FastAPI, Uvicorn, Pydantic, Python 3.11 | Asynchronous, typed REST API with lifespan-managed background services |
| **LLM Inference** | Groq Cloud API | Ultra-low latency LLM inference (GPT-OSS 120B, Llama 3.1, Gemma 2, Mixtral) |
| **RAG & Vector Store**| LangChain, FAISS (CPU), SentenceTransformers | Local chunk embeddings (`all-MiniLM-L6-v2`) and fast similarity search |
| **Database** | TiDB Cloud / MySQL (with auto-SQLite fallback) | Persistent user session storage, chat histories, and audit timelines |
| **Authentication** | JWT (HS256) & Google OAuth 2.0 (GSI) | Secure token-based session management and 1-click Google login |
| **Containerization** | Docker Multi-Stage Build | Production-ready container serving both React SPA and FastAPI backend |

---

## 📁 Repository Structure

```
CodeMentorAI/
├── backend/
│   ├── routes/
│   │   ├── activity_routes.py    # Activity metrics, timelines, chat history
│   │   ├── ai_routes.py          # Chat Q&A, summary, bug scanner, architecture
│   │   ├── auth_routes.py        # Login, registration, Google OAuth, session state
│   │   └── repo_routes.py        # Clone, file explorer, stats, build KB
│   ├── auth.py                   # JWT security & Google token verification
│   ├── config.py                 # Environment variables & database URL parsing
│   ├── database.py               # TiDB/MySQL abstraction layer with SQLite fallback
│   └── main.py                   # FastAPI app entry point & SPA static file server
├── frontend/
│   ├── src/
│   │   ├── components/           # UI screens (Chat, Summary, Bugs, Architecture, Readme, Files, History, Auth)
│   │   ├── services/             # Axios API integration layer
│   │   ├── App.jsx               # Root navigation & state orchestration
│   │   └── main.jsx              # Vite React entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── rag/
│   ├── ingestion/                # Git cloning, document loading, chunking
│   ├── llm/                      # Prompt templates, RAG chains, Groq LLM integration
│   ├── retrieval/                # FAISS vector store & HuggingFace embedding manager
│   └── __init__.py
├── utils/
│   └── helper.py                 # File reading, syntax detection, path normalization
├── Dockerfile                    # Multi-stage production container build
├── requirements.txt              # Backend Python dependencies
├── run_app.bat                   # 1-Click Windows development launcher
├── run_backend.py                # Standalone FastAPI development server
└── README.md
```

---

## ⚡ Quick Start & Local Setup

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm**
- **Git** installed on your system
- A free **Groq API Key** from [console.groq.com](https://console.groq.com)

### 2. Clone & Environment Configuration

```bash
git clone https://github.com/Mahadev1729/CodeMentorAI.git
cd CodeMentorAI
```

Create a `.env` file in the project root:

```env
# Required: Groq LLM API Key
GROQ_API_KEY=gsk_your_groq_api_key_here

# Optional: Default LLM Model
DEFAULT_MODEL=openai/gpt-oss-120b

# Security: JWT Secret Key
JWT_SECRET_KEY=your_super_secret_jwt_key_here

# Optional: Google 1-Click OAuth Client ID
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com

# Optional: TiDB Cloud / MySQL Database (defaults to SQLite if not provided)
DATABASE_URL=mysql://user:password@gateway.tidbcloud.com:4000/codementorai?ssl=true
```

### 3. Launch Development Environment

#### Option A: 1-Click Launcher (Windows)
Double-click `run_app.bat` or run:
```bat
.\run_app.bat
```

#### Option B: Manual Startup

**Terminal 1 — FastAPI Backend:**
```bash
# Activate virtual environment
python -m venv .venv
source .venv/bin/activate   # Linux/macOS
.venv\Scripts\activate      # Windows

# Install dependencies
pip install --upgrade pip
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt

# Start backend
python run_backend.py
```
> Backend runs at `http://127.0.0.1:8000` (Interactive Swagger Docs: `http://127.0.0.1:8000/docs`)

**Terminal 2 — React Frontend:**
```bash
cd frontend
npm install
npm run dev
```
> Web UI runs at `http://localhost:5173`

---

## 🐳 Docker & Production Deployment (Render)

CodeMentorAI includes an optimized, multi-stage [Dockerfile](file:///f:/My%20projects/CodeMentorAI/Dockerfile) that builds the React frontend with Vite and runs the FastAPI backend with CPU-only PyTorch and non-blocking startup:

```bash
# Build Docker Image
docker build -t codementorai .

# Run Container
docker run -p 10000:10000 --env-file .env codementorai
```

### Deploying to Render
1. Create a new **Web Service** on [Render](https://render.com) linked to your GitHub repo.
2. Select **Docker** as the Runtime (Render automatically detects the root `Dockerfile`).
3. Set the **Environment Variables** (`GROQ_API_KEY`, `DATABASE_URL`, `JWT_SECRET_KEY`, `GOOGLE_CLIENT_ID`).
4. Render automatically assigns `$PORT` (10000) and the service goes live instantly with zero cold-start delay.

---

## 🛡️ API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server health and active database engine check |
| `POST` | `/api/auth/register` | Register a new user account |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT bearer token |
| `POST` | `/api/auth/google` | 1-Click Google OAuth token exchange |
| `GET` | `/api/auth/me` | Fetch authenticated user profile & session |
| `POST` | `/api/repo/clone` | Clone a public GitHub repository |
| `POST` | `/api/repo/build-kb` | Chunk source files and build FAISS vector index |
| `GET` | `/api/repo/files` | Get repository file hierarchy tree |
| `POST` | `/api/ai/chat` | RAG-grounded natural language Q&A with citations |
| `POST` | `/api/ai/summary` | Generate executive architectural summary |
| `POST` | `/api/ai/bugs` | Run multi-severity bug and security audit |
| `POST` | `/api/ai/architecture` | Generate live Mermaid system diagram |
| `POST` | `/api/ai/readme` | Generate production GitHub README markdown |
| `GET` | `/api/activities` | Fetch user audit log and activity timeline |

---

## 📄 License

This project is open-source and licensed under the [MIT License](file:///f:/My%20projects/CodeMentorAI/LICENSE).

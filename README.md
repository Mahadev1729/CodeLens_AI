# 🧠 CodeMentorAI

> **Full-Stack AI Codebase Mentor** powered by **React.js**, **FastAPI**, **MySQL**, **LangChain**, and **Groq LLMs**.

---

## 🌟 Architecture Overview

- **Frontend**: Modern **React.js 18 + Vite** with a sleek dark-mode design system, live Mermaid diagram renderer, syntax-highlighted code explorer, and interactive Q&A chat.
- **Backend**: High-performance **FastAPI** REST API with JWT authentication, modular route controllers, and asynchronous task execution.
- **Database**: **MySQL** database support (with automated schema creation for `users`, `chat_history`, `activities`, and `user_sessions`), and seamless SQLite fallback if MySQL is not running.
- **AI Engine**: **Groq LLMs** (GPT-OSS 120B / Llama 3.1 8B / Gemma 2 9B / Mixtral 8x7B) + **LangChain** + **FAISS Vector Store** indexing.

---

## 🚀 Quick Start

### 1. Environment Configuration

Create or update `.env` in the project root:

```env
GROQ_API_KEY=gsk_your_groq_api_key_here

# Optional: MySQL Database Configuration (Defaults to SQLite if omitted)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=codementorai
```

### 2. Start Both Backend & Frontend

#### On Windows:
Double-click `run_app.bat` or run:
```bash
.\run_app.bat
```

#### Or Run Manually in Two Terminals:

**Terminal 1 (FastAPI Backend):**
```bash
python run_backend.py
```
> Server runs on `http://127.0.0.1:8000` (Interactive API Docs: `http://127.0.0.1:8000/docs`)

**Terminal 2 (React Frontend):**
```bash
cd frontend
npm run dev
```
> Web UI runs on `http://localhost:5173`

---

## 📁 Key Features

1. 💬 **Chat with Codebase**: Ask natural-language questions about any repository. Responses cite exact source files with clickable pills.
2. 📋 **Repository Summary**: Executive architectural overview, folder layout, tech stack detection, and improvement recommendations.
3. 🐛 **Bug Finder & Quality Scanner**: Detects logic bugs, security vulnerabilities, dead code, and code smells categorized by severity (High, Medium, Low) with actionable fixes.
4. 🏗️ **Architecture Diagram**: Live-rendered Mermaid flowchart showing system architecture and component data flows with copy and Mermaid Live Editor support.
5. 📝 **README Generator**: Automatically generates comprehensive, markdown documentation ready for GitHub.
6. 📁 **File Explorer & Explainer**: Searchable file tree, code viewer, and AI breakdown for any source file.
7. 📜 **Activity Timeline & History**: Dashboard metrics, filterable event timeline, and past conversation search.

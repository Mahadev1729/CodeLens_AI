from utils.helper import (
    get_language, get_file_size_str, safe_read_file,
    extract_repo_name, build_folder_tree, truncate_text, load_css,
)
from services.readme_generator import generate_readme
from services.architecture import generate_architecture, extract_mermaid_diagram
from services.bugfinder import find_bugs, parse_bugs
from services.summary import generate_summary
from services.rag import ask_question, explain_file
from services.vectorstore import build_vectorstore, load_vectorstore, vectorstore_exists
from services.chunker import chunk_documents
from services.loader import load_documents, get_repository_stats
from services.clone_repo import clone_repository, get_repo_info, is_valid_repo_path, get_repo_local_path
from utils.persistence import (
    clear_chat_history,
    load_persisted_session_state,
    save_persisted_session_state,
    log_user_activity,
    load_user_activities,
    clear_user_activities,
    get_user_stats_summary,
    load_chat_history,
)
from utils.auth import init_db, render_auth_page
import os
import queue
import sys
from pathlib import Path
import streamlit as st
import streamlit.components.v1 as components
from dotenv import load_dotenv

PROJECT_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=PROJECT_DIR / ".env")
if not os.getenv("GROQ_API_KEY") and os.getenv("\ufeffGROQ_API_KEY"):
    os.environ["GROQ_API_KEY"] = os.environ["\ufeffGROQ_API_KEY"]

sys.path.insert(0, str(PROJECT_DIR))


st.set_page_config(
    page_title="AI Codebase Mentor",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)

load_css()


def init_session_state():
    default_api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not default_api_key:
        default_api_key = os.getenv("\ufeffGROQ_API_KEY", "").strip()

    persisted_state = load_persisted_session_state(PROJECT_DIR)

    defaults = {
        "chat_history": persisted_state.get("chat_history") or [],
        "repo_path": persisted_state.get("repo_path"),
        "repo_name": persisted_state.get("repo_name"),
        "vectorstore": None,
        "repo_stats": persisted_state.get("repo_stats"),
        "selected_file": persisted_state.get("selected_file"),
        "groq_api_key": persisted_state.get("groq_api_key") or default_api_key,
        "knowledge_base_built": persisted_state.get("knowledge_base_built", False),
        "clone_in_progress": False,
        "summary_cache": persisted_state.get("summary_cache"),
        "bug_cache": persisted_state.get("bug_cache"),
        "architecture_cache": persisted_state.get("architecture_cache"),
        "readme_cache": persisted_state.get("readme_cache"),
        "selected_model": persisted_state.get("selected_model", "openai/gpt-oss-120b"),
    }
    for key, val in defaults.items():
        if key not in st.session_state or st.session_state[key] is None:
            st.session_state[key] = val

    # Sync chat_history from user persistence if session state is empty
    if not st.session_state.chat_history and persisted_state.get("chat_history"):
        st.session_state.chat_history = persisted_state["chat_history"]

    if st.session_state.get("selected_model") in {
        "llama-3.1-8b-instant", "openai/gpt-oss-20b"
    }:
        st.session_state.selected_model = "openai/gpt-oss-120b"

    if st.session_state.get("repo_path") and st.session_state.get("knowledge_base_built"):
        repo_name = st.session_state.get("repo_name") or Path(
            st.session_state["repo_path"]).name
        if repo_name and st.session_state.get("vectorstore") is None:
            from services.vectorstore import load_vectorstore, vectorstore_exists
            if vectorstore_exists(repo_name):
                stored_vector = load_vectorstore(repo_name)
                if stored_vector is not None:
                    st.session_state.vectorstore = stored_vector


def persist_session_state():
    serializable_state = {
        key: st.session_state.get(key)
        for key in [
            "chat_history",
            "repo_path",
            "repo_name",
            "repo_stats",
            "selected_file",
            "groq_api_key",
            "knowledge_base_built",
            "summary_cache",
            "bug_cache",
            "architecture_cache",
            "readme_cache",
            "selected_model",
        ]
        if key in st.session_state
    }
    save_persisted_session_state(serializable_state, PROJECT_DIR)


def validate_api_key(api_key: str) -> bool:
    return bool(api_key and len(api_key) > 20 and api_key.startswith("gsk_"))


def render_sidebar():
    st.sidebar.markdown("""
    <div class="sidebar-brand">
        <div class="brain-icon">🧠</div>
        <h1>AI Codebase Mentor</h1>
        <p>Powered by Groq + LangChain</p>
    </div>
    """, unsafe_allow_html=True)

    if st.session_state.get("authenticated") and st.session_state.get("username"):
        user_stats = get_user_stats_summary(base_dir=PROJECT_DIR)
        st.sidebar.markdown(
            f"""
            <div class="user-badge">
                <div>
                    <div>👤 <strong>{st.session_state.username}</strong></div>
                    <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.2rem;">
                        💬 {user_stats.get('total_questions', 0)} questions · 📦 {user_stats.get('distinct_repos_count', 0)} repos
                    </div>
                </div>
                <span style="color: var(--accent-green); font-size: 0.75rem;">● Online</span>
            </div>
            """,
            unsafe_allow_html=True,
        )
        if st.sidebar.button("🚪 Log Out", key="sidebar_logout_btn", use_container_width=True):
            persist_session_state()
            for k in list(st.session_state.keys()):
                del st.session_state[k]
            st.session_state.authenticated = False
            st.session_state.username = None
            st.rerun()
        st.sidebar.markdown('<div class="divider" style="margin: 0.8rem 0;"></div>', unsafe_allow_html=True)

    st.sidebar.markdown("### 🔑 API Configuration")
    st.sidebar.caption(
        "Default key is loaded from your environment; enter your own key anytime to override it.")
    api_key = st.sidebar.text_input(
        "Groq API Key",
        value=st.session_state.groq_api_key,
        type="password",
        placeholder="gsk_...",
        key="api_key_input",
        label_visibility="collapsed",
    )
    if api_key and api_key != st.session_state.groq_api_key:
        st.session_state.groq_api_key = api_key
        persist_session_state()

    if st.session_state.groq_api_key:
        if validate_api_key(st.session_state.groq_api_key):
            st.sidebar.markdown(
                '<div class="status-badge status-ready">✓ API Key Configured</div>', unsafe_allow_html=True)
        else:
            st.sidebar.markdown(
                '<div class="status-badge status-error">⚠ Invalid API Key Format</div>', unsafe_allow_html=True)
    else:
        st.sidebar.markdown(
            '<div class="status-badge status-pending">○ API Key Required</div>', unsafe_allow_html=True)

    st.sidebar.markdown('<div class="divider"></div>', unsafe_allow_html=True)

    st.sidebar.markdown("### 📦 Repository")
    repo_url = st.sidebar.text_input(
        "GitHub Repository URL",
        placeholder="https://github.com/user/repo",
        key="repo_url_input",
        label_visibility="collapsed",
    )

    col1, col2 = st.sidebar.columns(2)
    with col1:
        clone_btn = st.button(
            "⬇ Clone", use_container_width=True, key="clone_btn")
    with col2:
        build_btn = st.button(
            "⚡ Build KB", use_container_width=True, key="build_btn")

    if clone_btn:
        handle_clone(repo_url)

    if build_btn:
        handle_build_knowledge_base()

    st.sidebar.markdown('<div class="divider"></div>', unsafe_allow_html=True)

    st.sidebar.markdown("### 📊 Repository Status")
    if st.session_state.repo_path and is_valid_repo_path(st.session_state.repo_path):
        repo_info = get_repo_info(st.session_state.repo_path)
        st.sidebar.markdown(f"""
        <div class="metric-card">
            <div class="label">Repository</div>
            <div class="value">{st.session_state.repo_name}</div>
        </div>
        <div class="metric-card">
            <div class="label">Branch</div>
            <div class="value">{repo_info.get('branch', 'N/A')}</div>
        </div>
        <div class="metric-card">
            <div class="label">Last Commit</div>
            <div class="value">{repo_info.get('commit_hash', 'N/A')}</div>
        </div>
        """, unsafe_allow_html=True)

        if st.session_state.knowledge_base_built:
            st.sidebar.markdown(
                '<div class="status-badge status-ready">⚡ Knowledge Base Ready</div>', unsafe_allow_html=True)
        else:
            st.sidebar.markdown(
                '<div class="status-badge status-pending">○ Knowledge Base Not Built</div>', unsafe_allow_html=True)

        if st.session_state.repo_stats:
            stats = st.session_state.repo_stats
            st.sidebar.markdown(
                '<div class="divider"></div>', unsafe_allow_html=True)
            st.sidebar.markdown("### 📈 Repository Statistics")
            st.sidebar.markdown(f"""
            <div class="metric-card">
                <div class="label">Total Files</div>
                <div class="value">{stats.get('total_files', 0)}</div>
            </div>
            <div class="metric-card">
                <div class="label">Total Lines</div>
                <div class="value">{stats.get('total_lines', 0):,}</div>
            </div>
            """, unsafe_allow_html=True)

            ext_counts = stats.get("extension_counts", {})
            if ext_counts:
                top_exts = sorted(ext_counts.items(),
                                  key=lambda x: x[1], reverse=True)[:5]
                ext_text = " · ".join(
                    [f"`{ext}` ×{cnt}" for ext, cnt in top_exts])
                st.sidebar.markdown(f"**Languages:** {ext_text}")
    else:
        st.sidebar.markdown(
            '<div class="status-badge status-pending">○ No Repository Loaded</div>', unsafe_allow_html=True)

    st.sidebar.markdown('<div class="divider"></div>', unsafe_allow_html=True)


def handle_clone(repo_url: str):
    if not repo_url or not repo_url.strip():
        st.sidebar.error("Please enter a repository URL.")
        return
    if not (repo_url.startswith("https://github.com/") or repo_url.startswith("http://github.com/")):
        st.sidebar.error(
            "Only GitHub URLs are supported (must start with https://github.com/).")
        return

    with st.sidebar.status("Cloning repository...", expanded=True) as status:
        progress_messages = queue.Queue()

        def progress_cb(pct, msg):
            progress_messages.put((pct, msg))

        success, local_path, error = clone_repository(
            repo_url.strip(), progress_callback=progress_cb)

        while True:
            try:
                pct, msg = progress_messages.get_nowait()
            except queue.Empty:
                break
            status.write(f"Progress: {pct}% - {msg}")

        if success:
            repo_name = extract_repo_name(repo_url.strip())
            st.session_state.repo_path = local_path
            st.session_state.repo_name = repo_name
            st.session_state.knowledge_base_built = False
            st.session_state.vectorstore = None
            st.session_state.summary_cache = None
            st.session_state.bug_cache = None
            st.session_state.architecture_cache = None
            st.session_state.readme_cache = None
            st.session_state.selected_file = None
            st.session_state.chat_history = []

            stats = get_repository_stats(local_path)
            st.session_state.repo_stats = stats
            persist_session_state()

            log_user_activity(
                "clone",
                f"Cloned repository '{repo_name}'",
                details=f"Source: {repo_url.strip()}",
                repo_name=repo_name,
                metadata={"url": repo_url.strip(), "files": stats.get("total_files", 0), "lines": stats.get("total_lines", 0)},
                base_dir=PROJECT_DIR,
            )

            if vectorstore_exists(repo_name):
                vs = load_vectorstore(repo_name)
                if vs:
                    st.session_state.vectorstore = vs
                    st.session_state.knowledge_base_built = True
                    status.update(
                        label="✅ Repository cloned! Existing knowledge base loaded.", state="complete")
                else:
                    status.update(
                        label="✅ Repository cloned! Build the knowledge base to enable chat.", state="complete")
            else:
                status.update(
                    label="✅ Repository cloned! Build the knowledge base to enable chat.", state="complete")
        else:
            status.update(label=f"❌ Clone failed: {error}", state="error")


def handle_build_knowledge_base():
    if not st.session_state.repo_path:
        st.sidebar.error("Please clone a repository first.")
        return
    if not st.session_state.groq_api_key:
        st.sidebar.error("Please enter your Groq API key first.")
        return

    with st.sidebar.status("Building knowledge base...", expanded=True) as status:
        try:
            status.write("📂 Loading source files...")
            documents, skipped = load_documents(st.session_state.repo_path)

            if not documents:
                status.update(
                    label="❌ No supported files found in repository.", state="error")
                return

            status.write(f"📄 Loaded {len(documents)} files. Chunking...")
            chunks = chunk_documents(documents)

            status.write(
                f"🔪 Created {len(chunks)} chunks. Building embeddings...")
            vectorstore = build_vectorstore(chunks, st.session_state.repo_name)

            st.session_state.vectorstore = vectorstore
            st.session_state.knowledge_base_built = True

            stats = get_repository_stats(st.session_state.repo_path)
            st.session_state.repo_stats = stats
            persist_session_state()

            log_user_activity(
                "build_kb",
                f"Built Knowledge Base for '{st.session_state.repo_name}'",
                details=f"Indexed {len(chunks)} chunks from {len(documents)} files",
                repo_name=st.session_state.repo_name,
                metadata={"chunks": len(chunks), "files": len(documents)},
                base_dir=PROJECT_DIR,
            )

            status.update(
                label=f"✅ Knowledge base built! {len(chunks)} chunks indexed.",
                state="complete",
            )

            if skipped:
                status.write(
                    f"⚠️ Skipped {len(skipped)} large/unreadable files.")

        except Exception as e:
            status.update(label=f"❌ Error: {str(e)}", state="error")


def render_chat_tab():
    if not st.session_state.knowledge_base_built or not st.session_state.vectorstore:
        st.markdown("""
        <div class="empty-state">
            <div class="icon">💬</div>
            <h3>Chat Not Available</h3>
            <p>Please clone a repository and build the knowledge base to start chatting.</p>
        </div>
        """, unsafe_allow_html=True)
        return

    col1, col2 = st.columns([6, 1])
    with col1:
        st.markdown(
            '<div class="section-header"><h3>💬 Chat with your Codebase</h3></div>', unsafe_allow_html=True)
    with col2:
        if st.button("🗑 Clear", key="clear_chat", use_container_width=True):
            st.session_state.chat_history = []
            clear_chat_history(PROJECT_DIR)
            persist_session_state()
            st.rerun()

    suggested_questions = [
        "Explain the project architecture",
        "How does authentication work?",
        "What are the main API endpoints?",
        "Explain the folder structure",
        "Find the database schema",
        "Explain the entry point",
    ]

    if not st.session_state.chat_history:
        st.markdown("**💡 Try asking:**")
        cols = st.columns(3)
        for i, q in enumerate(suggested_questions):
            with cols[i % 3]:
                if st.button(q, key=f"suggest_{i}", use_container_width=True):
                    st.session_state.chat_history.append(
                        {"role": "user", "content": q})
                    persist_session_state()
                    with st.spinner("Thinking..."):
                        try:
                            answer, sources = ask_question(
                                st.session_state.vectorstore,
                                q,
                                st.session_state.groq_api_key,
                                st.session_state.chat_history[:-1],
                                st.session_state.get(
                                    "selected_model", "openai/gpt-oss-120b"),
                            )
                            st.session_state.chat_history.append({
                                "role": "assistant",
                                "content": answer,
                                "sources": sources,
                            })
                            persist_session_state()
                            log_user_activity(
                                "chat",
                                f"Asked: \"{truncate_text(q, 60)}\"",
                                details=q,
                                repo_name=st.session_state.repo_name,
                                metadata={"question": q, "sources_count": len(sources) if sources else 0},
                                base_dir=PROJECT_DIR,
                            )
                        except Exception as e:
                            st.session_state.chat_history.append({
                                "role": "assistant",
                                "content": f"Error: {str(e)}",
                                "sources": [],
                            })
                            persist_session_state()
                    st.rerun()

    for msg in st.session_state.chat_history:
        if msg["role"] == "user":
            with st.chat_message("user", avatar="👤"):
                st.write(msg["content"])
        else:
            with st.chat_message("assistant", avatar="🧠"):
                st.markdown(msg["content"])
                if msg.get("sources"):
                    st.markdown("**Referenced Files:**")
                    source_html = " ".join([
                        f'<span class="source-badge">📄 {src}</span>'
                        for src in msg["sources"]
                    ])
                    st.markdown(source_html, unsafe_allow_html=True)

    if user_input := st.chat_input(
        placeholder="Ask anything about the codebase...",
        key="chat_input_main",
    ):
        st.session_state.chat_history.append(
            {"role": "user", "content": user_input})
        persist_session_state()
        with st.chat_message("user", avatar="👤"):
            st.write(user_input)

        with st.chat_message("assistant", avatar="🧠"):
            with st.spinner("Analyzing codebase..."):
                try:
                    answer, sources = ask_question(
                        st.session_state.vectorstore,
                        user_input,
                        st.session_state.groq_api_key,
                        st.session_state.chat_history[:-1],
                        st.session_state.get(
                            "selected_model", "openai/gpt-oss-120b"),
                    )
                    st.markdown(answer)
                    if sources:
                        st.markdown("**Referenced Files:**")
                        source_html = " ".join([
                            f'<span class="source-badge">📄 {src}</span>'
                            for src in sources
                        ])
                        st.markdown(source_html, unsafe_allow_html=True)
                    st.session_state.chat_history.append({
                        "role": "assistant",
                        "content": answer,
                        "sources": sources,
                    })
                    persist_session_state()
                    log_user_activity(
                        "chat",
                        f"Asked: \"{truncate_text(user_input, 60)}\"",
                        details=user_input,
                        repo_name=st.session_state.repo_name,
                        metadata={"question": user_input, "sources_count": len(sources) if sources else 0},
                        base_dir=PROJECT_DIR,
                    )
                except Exception as e:
                    error_msg = f"⚠️ Error: {str(e)}"
                    st.error(error_msg)
                    st.session_state.chat_history.append({
                        "role": "assistant",
                        "content": error_msg,
                        "sources": [],
                    })
                    persist_session_state()


def render_summary_tab():
    st.markdown('<div class="section-header"><h3>📋 Repository Summary</h3></div>',
                unsafe_allow_html=True)

    if not st.session_state.repo_path:
        st.markdown("""
        <div class="empty-state">
            <div class="icon">📋</div>
            <h3>No Repository Loaded</h3>
            <p>Clone a repository first to generate its summary.</p>
        </div>
        """, unsafe_allow_html=True)
        return

    if not st.session_state.groq_api_key or not validate_api_key(st.session_state.groq_api_key):
        st.error("Please enter a valid Groq API key in the sidebar.")
        return

    col1, col2 = st.columns([3, 1])
    with col2:
        regen = st.button("🔄 Regenerate", key="regen_summary",
                          use_container_width=True)

    if st.session_state.summary_cache and not regen:
        st.markdown(st.session_state.summary_cache)
        return

    if st.button("📋 Generate Repository Summary", key="gen_summary", use_container_width=True) or regen:
        with st.spinner("Analyzing repository... This may take a moment."):
            try:
                summary = generate_summary(
                    st.session_state.repo_path,
                    st.session_state.groq_api_key,
                    st.session_state.get(
                        "selected_model", "openai/gpt-oss-120b"),
                )
                st.session_state.summary_cache = summary
                persist_session_state()
                log_user_activity(
                    "summary",
                    f"Generated Repository Summary for '{st.session_state.repo_name}'",
                    details=f"Model: {st.session_state.get('selected_model')}",
                    repo_name=st.session_state.repo_name,
                    base_dir=PROJECT_DIR,
                )
                st.rerun()
            except Exception as e:
                st.error(f"Failed to generate summary: {str(e)}")


def render_bugs_tab():
    st.markdown('<div class="section-header"><h3>🐛 Bug Finder & Code Analysis</h3></div>',
                unsafe_allow_html=True)

    if not st.session_state.repo_path:
        st.markdown("""
        <div class="empty-state">
            <div class="icon">🐛</div>
            <h3>No Repository Loaded</h3>
            <p>Clone a repository first to analyze for bugs.</p>
        </div>
        """, unsafe_allow_html=True)
        return

    if not st.session_state.groq_api_key or not validate_api_key(st.session_state.groq_api_key):
        st.error("Please enter a valid Groq API key in the sidebar.")
        return

    col1, col2 = st.columns([3, 1])
    with col2:
        regen = st.button("🔄 Re-analyze", key="regen_bugs",
                          use_container_width=True)

    if st.session_state.bug_cache and not regen:
        bug_report = st.session_state.bug_cache
        issues = parse_bugs(bug_report)

        high = [i for i in issues if i.get("severity", "").lower() == "high"]
        medium = [i for i in issues if i.get(
            "severity", "").lower() == "medium"]
        low = [i for i in issues if i.get("severity", "").lower() == "low"]

        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Issues", len(issues))
        with col2:
            st.metric("🔴 High", len(high))
        with col3:
            st.metric("🟠 Medium", len(medium))
        with col4:
            st.metric("🔵 Low", len(low))

        st.markdown('<div class="divider"></div>', unsafe_allow_html=True)

        if issues:
            for issue in issues:
                sev = issue.get("severity", "Low").lower()
                sev_class = f"bug-{sev}"
                sev_badge = f'<span class="severity-{sev}">{issue.get("severity", "Low")}</span>'
                st.markdown(f"""
                <div class="bug-card {sev_class}">
                    <div class="bug-title">{issue.get("title", "Unknown Issue")} {sev_badge}</div>
                    <div class="bug-meta">
                        <span>📁 {issue.get("file", "N/A")}</span>
                        <span>🏷 {issue.get("category", "N/A")}</span>
                    </div>
                    <div class="bug-desc">{issue.get("description", "")}</div>
                    <div class="bug-fix">💡 Fix: {issue.get("fix", "")}</div>
                </div>
                """, unsafe_allow_html=True)
        else:
            with st.expander("📄 View Full Analysis Report"):
                st.markdown(bug_report)
        return

    if st.button("🐛 Find Bugs & Analyze Code", key="run_bugs", use_container_width=True) or regen:
        with st.spinner("Analyzing code for bugs, security issues, and code smells..."):
            try:
                bug_report = find_bugs(
                    st.session_state.repo_path,
                    st.session_state.groq_api_key,
                    st.session_state.get(
                        "selected_model", "openai/gpt-oss-120b"),
                )
                st.session_state.bug_cache = bug_report
                persist_session_state()
                issues = parse_bugs(bug_report)
                log_user_activity(
                    "bugs",
                    f"Ran Bug & Quality Analysis on '{st.session_state.repo_name}'",
                    details=f"Detected {len(issues)} potential issue(s)",
                    repo_name=st.session_state.repo_name,
                    metadata={"total_issues": len(issues)},
                    base_dir=PROJECT_DIR,
                )
                st.rerun()
            except Exception as e:
                st.error(f"Failed to analyze bugs: {str(e)}")


def render_architecture_tab():
    st.markdown('<div class="section-header"><h3>🏗️ Architecture Diagram</h3></div>',
                unsafe_allow_html=True)

    if not st.session_state.repo_path:
        st.markdown("""
        <div class="empty-state">
            <div class="icon">🏗️</div>
            <h3>No Repository Loaded</h3>
            <p>Clone a repository first to generate its architecture diagram.</p>
        </div>
        """, unsafe_allow_html=True)
        return

    if not st.session_state.groq_api_key or not validate_api_key(st.session_state.groq_api_key):
        st.error("Please enter a valid Groq API key in the sidebar.")
        return

    col1, col2 = st.columns([3, 1])
    with col2:
        regen = st.button("🔄 Regenerate", key="regen_arch",
                          use_container_width=True)

    if st.session_state.architecture_cache and not regen:
        arch_text = st.session_state.architecture_cache
        diagram_code, notes = extract_mermaid_diagram(arch_text)

        if diagram_code:
            st.markdown("### Mermaid Diagram Code")
            st.info(
                "💡 Copy the diagram code below and paste it into [Mermaid Live Editor](https://mermaid.live) to view the rendered diagram.")
            st.markdown(f"""
            <div class="mermaid-container">```mermaid\n{diagram_code}\n```</div>
            """, unsafe_allow_html=True)

            st.markdown("### 📝 Diagram Code (Copy-able)")
            st.code(f"```mermaid\n{diagram_code}\n```", language="text")

            if notes:
                st.markdown("### Architecture Notes")
                st.markdown(notes)
        else:
            st.markdown(arch_text)
        return

    if st.button("🏗️ Generate Architecture Diagram", key="gen_arch", use_container_width=True) or regen:
        with st.spinner("Generating architecture diagram..."):
            try:
                arch_text = generate_architecture(
                    st.session_state.repo_path,
                    st.session_state.groq_api_key,
                    st.session_state.get(
                        "selected_model", "openai/gpt-oss-120b"),
                )
                st.session_state.architecture_cache = arch_text
                persist_session_state()
                log_user_activity(
                    "architecture",
                    f"Generated Architecture Diagram for '{st.session_state.repo_name}'",
                    repo_name=st.session_state.repo_name,
                    base_dir=PROJECT_DIR,
                )
                st.rerun()
            except Exception as e:
                st.error(f"Failed to generate architecture: {str(e)}")


def render_readme_tab():
    st.markdown('<div class="section-header"><h3>📝 README Generator</h3></div>',
                unsafe_allow_html=True)

    if not st.session_state.repo_path:
        st.markdown("""
        <div class="empty-state">
            <div class="icon">📝</div>
            <h3>No Repository Loaded</h3>
            <p>Clone a repository first to generate a README.</p>
        </div>
        """, unsafe_allow_html=True)
        return

    if not st.session_state.groq_api_key or not validate_api_key(st.session_state.groq_api_key):
        st.error("Please enter a valid Groq API key in the sidebar.")
        return

    col1, col2, col3 = st.columns([3, 1, 1])
    with col2:
        regen = st.button("🔄 Regenerate", key="regen_readme",
                          use_container_width=True)

    if st.session_state.readme_cache:
        with col3:
            st.download_button(
                label="⬇ Download",
                data=st.session_state.readme_cache,
                file_name="README.md",
                mime="text/markdown",
                key="download_readme",
                use_container_width=True,
            )

    if st.session_state.readme_cache and not regen:
        tab_preview, tab_raw = st.tabs(["👁️ Preview", "📄 Raw Markdown"])
        with tab_preview:
            st.markdown(st.session_state.readme_cache)
        with tab_raw:
            st.code(st.session_state.readme_cache, language="markdown")
        return

    if st.button("📝 Generate README", key="gen_readme", use_container_width=True) or regen:
        with st.spinner("Generating comprehensive README..."):
            try:
                readme = generate_readme(
                    st.session_state.repo_path,
                    st.session_state.groq_api_key,
                    st.session_state.get(
                        "selected_model", "openai/gpt-oss-120b"),
                )
                st.session_state.readme_cache = readme
                persist_session_state()
                log_user_activity(
                    "readme",
                    f"Generated README.md for '{st.session_state.repo_name}'",
                    repo_name=st.session_state.repo_name,
                    base_dir=PROJECT_DIR,
                )
                st.rerun()
            except Exception as e:
                st.error(f"Failed to generate README: {str(e)}")


def render_file_explorer_tab():
    st.markdown('<div class="section-header"><h3>📁 File Explorer</h3></div>',
                unsafe_allow_html=True)

    if not st.session_state.repo_path or not is_valid_repo_path(st.session_state.repo_path):
        st.markdown("""
        <div class="empty-state">
            <div class="icon">📁</div>
            <h3>No Repository Loaded</h3>
            <p>Clone a repository first to browse its files.</p>
        </div>
        """, unsafe_allow_html=True)
        return

    stats = st.session_state.repo_stats
    if not stats:
        stats = get_repository_stats(st.session_state.repo_path)
        st.session_state.repo_stats = stats

    file_list = stats.get("file_list", [])
    if not file_list:
        st.warning("No readable files found in repository.")
        return

    col_explorer, col_viewer = st.columns([1, 2])

    with col_explorer:
        st.markdown("**📂 Files**")
        search_term = st.text_input(
            "Search files",
            placeholder="Filter files...",
            key="file_search",
            label_visibility="collapsed",
        )
        filtered_files = file_list
        if search_term:
            filtered_files = [
                f for f in file_list
                if search_term.lower() in f["path"].lower()
            ]

        ext_options = sorted(set(f["extension"] for f in file_list))
        ext_filter = st.selectbox(
            "Filter by type",
            options=["All"] + ext_options,
            key="ext_filter",
            label_visibility="collapsed",
        )
        if ext_filter != "All":
            filtered_files = [
                f for f in filtered_files if f["extension"] == ext_filter]

        st.markdown(f"*{len(filtered_files)} files*")

        for i, file_info in enumerate(filtered_files[:200]):
            is_selected = st.session_state.selected_file == file_info["path"]
            btn_label = f"{'>' if is_selected else ' '} {file_info['filename']}"
            if st.button(
                btn_label,
                key=f"file_btn_{i}",
                use_container_width=True,
                help=file_info["path"],
            ):
                st.session_state.selected_file = file_info["path"]
                persist_session_state()
                st.rerun()

    with col_viewer:
        if st.session_state.selected_file:
            file_path_full = Path(st.session_state.repo_path) / \
                st.session_state.selected_file
            file_info_sel = next(
                (f for f in file_list if f["path"]
                 == st.session_state.selected_file),
                None,
            )

            if file_info_sel:
                size_str = get_file_size_str(file_info_sel.get("size", 0))
                lines = file_info_sel.get("lines", 0)
                st.markdown(f"""
                **📄 {file_info_sel['filename']}**
                `{st.session_state.selected_file}` · {size_str} · {lines} lines
                """)

            content = safe_read_file(str(file_path_full))
            if content:
                language = get_language(str(file_path_full))
                tab_code, tab_explain = st.tabs(["💻 Code", "🤖 AI Explanation"])

                with tab_code:
                    st.code(content, language=language)

                with tab_explain:
                    if not st.session_state.groq_api_key or not validate_api_key(st.session_state.groq_api_key):
                        st.error(
                            "Please enter a valid Groq API key to get AI explanations.")
                    else:
                        explain_key = f"explain_{st.session_state.selected_file}"
                        if explain_key not in st.session_state:
                            st.session_state[explain_key] = None

                        if st.button("🤖 Explain This File", key=f"explain_btn_{st.session_state.selected_file.replace('/', '_')}"):
                            with st.spinner("Analyzing file..."):
                                try:
                                    explanation = explain_file(
                                        st.session_state.selected_file,
                                        content,
                                        st.session_state.groq_api_key,
                                        st.session_state.get(
                                            "selected_model", "openai/gpt-oss-120b"),
                                    )
                                    st.session_state[explain_key] = explanation
                                    persist_session_state()
                                    log_user_activity(
                                        "file_explain",
                                        f"Explained file '{st.session_state.selected_file}'",
                                        details=f"Repository: {st.session_state.repo_name}",
                                        repo_name=st.session_state.repo_name,
                                        metadata={"file": st.session_state.selected_file},
                                        base_dir=PROJECT_DIR,
                                    )
                                    st.rerun()
                                except Exception as e:
                                    st.error(f"Error: {str(e)}")

                        if st.session_state.get(explain_key):
                            st.markdown(st.session_state[explain_key])
            else:
                st.warning(
                    "Could not read file content (file may be too large or unreadable).")
        else:
            st.markdown("""
            <div class="empty-state">
                <div class="icon">👈</div>
                <h3>Select a File</h3>
                <p>Click a file from the explorer to view its content.</p>
            </div>
            """, unsafe_allow_html=True)


def render_activity_tab():
    st.markdown('<div class="section-header"><h3>📜 Past Activity & History</h3></div>', unsafe_allow_html=True)

    username = st.session_state.get("username", "User")
    stats = get_user_stats_summary(username=username, base_dir=PROJECT_DIR)

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("👤 Active User", username)
    with col2:
        st.metric("💬 Chat Questions", stats.get("total_questions", 0))
    with col3:
        st.metric("📦 Repositories Explored", stats.get("distinct_repos_count", 0))
    with col4:
        st.metric("⚡ Total Activity Events", stats.get("total_activities", 0))

    st.markdown('<div class="divider"></div>', unsafe_allow_html=True)

    tab_timeline, tab_past_chats = st.tabs(["🕒 Activity Timeline", "💬 Past Chat Conversations"])

    with tab_timeline:
        col_f1, col_f2, col_f3 = st.columns([1.5, 2, 1])
        with col_f1:
            filter_opts = [
                ("all", "All Activities"),
                ("clone", "📦 Repository Clones"),
                ("build_kb", "⚡ Knowledge Base Builds"),
                ("chat", "💬 Chat Questions"),
                ("summary", "📋 Summaries"),
                ("bugs", "🐛 Bug Reports"),
                ("architecture", "🏗️ Architecture"),
                ("readme", "📝 READMEs"),
                ("file_explain", "🤖 File Explanations"),
            ]
            activity_filter = st.selectbox(
                "Filter Activity Type",
                options=filter_opts,
                format_func=lambda x: x[1],
                key="activity_type_filter",
            )[0]
        with col_f2:
            search_query = st.text_input("Search activities", placeholder="Search by title, repo, or details...", key="activity_search")
        with col_f3:
            st.write("")
            st.write("")
            if st.button("🗑️ Clear Activity Log", key="btn_clear_activities", use_container_width=True):
                clear_user_activities(username=username, base_dir=PROJECT_DIR)
                st.success("Activity log cleared.")
                st.rerun()

        activities = load_user_activities(
            username=username,
            limit=150,
            activity_type=activity_filter if activity_filter != "all" else None,
            search_query=search_query,
            base_dir=PROJECT_DIR,
        )

        if not activities:
            st.markdown("""
            <div class="empty-state">
                <div class="icon">📜</div>
                <h3>No Activities Recorded Yet</h3>
                <p>Perform tasks like cloning repositories, asking chat questions, generating summaries, or finding bugs to see your activity timeline here.</p>
            </div>
            """, unsafe_allow_html=True)
        else:
            badge_icon_map = {
                "clone": ("📦 Clone", "activity-badge-clone"),
                "build_kb": ("⚡ Knowledge Base", "activity-badge-build_kb"),
                "chat": ("💬 Chat", "activity-badge-chat"),
                "summary": ("📋 Summary", "activity-badge-summary"),
                "bugs": ("🐛 Bug Finder", "activity-badge-bugs"),
                "architecture": ("🏗️ Architecture", "activity-badge-architecture"),
                "readme": ("📝 README", "activity-badge-readme"),
                "file_explain": ("🤖 File Explain", "activity-badge-file_explain"),
            }

            for act in activities:
                atype = act.get("activity_type", "other")
                badge_text, badge_cls = badge_icon_map.get(atype, ("⚡ Action", "activity-badge-chat"))
                repo_tag_html = f'<span class="repo-tag">📦 {act["repo_name"]}</span>' if act.get("repo_name") else ""
                details_html = f'<div class="activity-details">{act["details"]}</div>' if act.get("details") else ""
                
                st.markdown(f"""
                <div class="activity-card">
                    <div class="activity-header">
                        <div class="activity-title">
                            <span class="activity-badge {badge_cls}">{badge_text}</span>
                            <span>{act['title']}</span>
                            {repo_tag_html}
                        </div>
                        <div class="activity-time">🕒 {act.get('timestamp', '')}</div>
                    </div>
                    {details_html}
                </div>
                """, unsafe_allow_html=True)

    with tab_past_chats:
        chat_col1, chat_col2 = st.columns([3, 1])
        with chat_col2:
            if st.button("🗑️ Clear Chat History", key="btn_clear_chat_history_tab", use_container_width=True):
                st.session_state.chat_history = []
                clear_chat_history(PROJECT_DIR, username=username)
                persist_session_state()
                st.success("Chat history cleared.")
                st.rerun()

        chat_history = load_chat_history(PROJECT_DIR, username=username)
        if not chat_history:
            st.markdown("""
            <div class="empty-state">
                <div class="icon">💬</div>
                <h3>No Chat History Found</h3>
                <p>Start a conversation in the Chat tab to view past conversations and queries here.</p>
            </div>
            """, unsafe_allow_html=True)
        else:
            pairs = []
            i = 0
            while i < len(chat_history):
                msg = chat_history[i]
                if msg.get("role") == "user":
                    question = msg.get("content", "")
                    timestamp = msg.get("timestamp", "")
                    answer = ""
                    sources = []
                    if i + 1 < len(chat_history) and chat_history[i + 1].get("role") == "assistant":
                        answer = chat_history[i + 1].get("content", "")
                        sources = chat_history[i + 1].get("sources", [])
                        i += 2
                    else:
                        i += 1
                    pairs.append({
                        "question": question,
                        "answer": answer,
                        "sources": sources,
                        "timestamp": timestamp,
                    })
                else:
                    i += 1

            st.markdown(f"**Total Conversations:** {len(pairs)}")
            for idx, p in enumerate(reversed(pairs)):
                time_str = f" · 🕒 {p['timestamp']}" if p.get('timestamp') else ""
                with st.expander(f"💬 Q: {p['question'][:80]}... {time_str}", expanded=(idx == 0)):
                    st.markdown("**User Question:**")
                    st.write(p["question"])
                    if p.get("answer"):
                        st.markdown("**AI Response:**")
                        st.markdown(p["answer"])
                    if p.get("sources"):
                        st.markdown("**Referenced Files:**")
                        source_html = " ".join([
                            f'<span class="source-badge">📄 {src}</span>'
                            for src in p["sources"]
                        ])
                        st.markdown(source_html, unsafe_allow_html=True)


def inject_pwa_support():
    pwa_html = """
    <link rel="manifest" href="/app/static/manifest.json">
    <script>
      // Register service worker
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/app/static/sw.js').then(registration => {
            console.log('SW registered: ', registration);
          }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
          });
        });
      }

      // Handle install prompt
      let deferredPrompt;
      window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Update UI to notify the user they can add to home screen
        const btn = document.getElementById('install-pwa-btn');
        if (btn) btn.style.display = 'block';
      });

      function installApp() {
        if (!deferredPrompt) return;
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
          } else {
            console.log('User dismissed the install prompt');
          }
          deferredPrompt = null;
          const btn = document.getElementById('install-pwa-btn');
          if (btn) btn.style.display = 'none';
        });
      }

      window.addEventListener('appinstalled', (evt) => {
        const btn = document.getElementById('install-pwa-btn');
        if (btn) btn.style.display = 'none';
      });
    </script>
    <button id="install-pwa-btn" onclick="installApp()" style="display: none; position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: linear-gradient(135deg, #58a6ff, #bc8cff); color: #fff; border: none; border-radius: 20px; padding: 10px 20px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-family: 'Inter', sans-serif;">
      ⬇ Install App
    </button>
    """
    components.html(pwa_html, height=0, width=0)


def main():
    init_db()
    if not st.session_state.get("authenticated", False):
        render_auth_page()
        return

    inject_pwa_support()
    init_session_state()
    render_sidebar()

    st.markdown("""
    <div class="hero-header">
        <h2>🧠 AI Codebase Mentor</h2>
        <p>Understand any GitHub repository instantly · Powered by Groq LLM + FAISS Vector Search</p>
    </div>
    """, unsafe_allow_html=True)

    if st.session_state.repo_path and st.session_state.repo_stats:
        stats = st.session_state.repo_stats
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("📄 Files", stats.get("total_files", 0))
        with col2:
            st.metric("📝 Lines", f"{stats.get('total_lines', 0):,}")
        with col3:
            ext_counts = stats.get("extension_counts", {})
            st.metric("🔤 Languages", len(ext_counts))
        with col4:
            status = "✅ Ready" if st.session_state.knowledge_base_built else "⚠️ No KB"
            st.metric("⚡ Status", status)

        st.markdown('<div class="divider"></div>', unsafe_allow_html=True)

    tab_chat, tab_summary, tab_bugs, tab_arch, tab_readme, tab_files, tab_activity = st.tabs([
        "💬 Chat",
        "📋 Summary",
        "🐛 Bug Finder",
        "🏗️ Architecture",
        "📝 README",
        "📁 File Explorer",
        "📜 Activity & History",
    ])

    with tab_chat:
        render_chat_tab()

    with tab_summary:
        render_summary_tab()

    with tab_bugs:
        render_bugs_tab()

    with tab_arch:
        render_architecture_tab()

    with tab_readme:
        render_readme_tab()

    with tab_files:
        render_file_explorer_tab()

    with tab_activity:
        render_activity_tab()

    if not st.session_state.repo_path and not any([
        st.session_state.repo_path,
    ]):
        st.markdown("""
        <div style="margin-top: 2rem;">
        """, unsafe_allow_html=True)

        col1, col2, col3 = st.columns(3)
        features = [
            ("💬", "Chat with Code",
             "Ask questions about any part of the codebase in natural language"),
            ("📋", "Repository Summary",
             "Get an instant overview of the project architecture and tech stack"),
            ("🐛", "Bug Finder", "Detect security issues, code smells, and quality problems"),
            ("🏗️", "Architecture Diagram",
             "Generate Mermaid diagrams of system architecture"),
            ("📝", "README Generator", "Auto-generate professional README documentation"),
            ("📁", "File Explorer",
             "Browse files with syntax highlighting and AI explanations"),
        ]
        for i, (icon, title, desc) in enumerate(features):
            with [col1, col2, col3][i % 3]:
                st.markdown(f"""
                <div class="metric-card" style="padding: 1.25rem; margin: 0.5rem 0;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">{icon}</div>
                    <div style="font-weight: 600; margin-bottom: 0.4rem; color: var(--text-primary);">{title}</div>
                    <div style="font-size: 0.82rem; color: var(--text-secondary);">{desc}</div>
                </div>
                """, unsafe_allow_html=True)

        st.markdown("</div>", unsafe_allow_html=True)

        st.markdown('<div class="divider"></div>', unsafe_allow_html=True)
        st.markdown("""
        ### 🚀 Getting Started

        1. **Enter your Groq API key** in the sidebar (get one free at [console.groq.com](https://console.groq.com))
        2. **Paste a GitHub repository URL** (e.g., `https://github.com/user/repo`)
        3. **Click Clone** to download the repository
        4. **Click Build KB** to create the vector knowledge base
        5. **Start chatting** or use any of the analysis tools above!
        """)


if __name__ == "__main__":
    main()

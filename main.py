import runpy
import sys
from pathlib import Path
import streamlit as st

PROJECT_DIR = Path(__file__).resolve().parent
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

from utils.auth import authenticate_user, register_user, init_db

# 1. Page Configuration (Must be the first Streamlit command)
st.set_page_config(
    page_title="AI Codebase Mentor",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)

# 2. Initialize Database on startup
init_db()

# 3. Custom CSS for Auth UI
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
    --bg-primary: #0d1117;
    --bg-secondary: #161b22;
    --bg-tertiary: #21262d;
    --border-color: #30363d;
    --accent-blue: #58a6ff;
    --accent-green: #3fb950;
    --accent-purple: #bc8cff;
    --text-primary: #c9d1d9;
    --text-secondary: #8b949e;
    --gradient-accent: linear-gradient(90deg, #58a6ff, #bc8cff);
    --radius-md: 10px;
    --radius-lg: 16px;
}

html, body, .stApp {
    background-color: var(--bg-primary) !important;
    font-family: 'Inter', sans-serif;
    color: var(--text-primary);
}

.auth-header {
    text-align: center;
    padding: 2.5rem 1rem 1rem;
    margin-bottom: 1.5rem;
}

.auth-header h1 {
    background: var(--gradient-accent);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-size: 2.2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
}

.auth-header p {
    color: var(--text-secondary);
    font-size: 0.95rem;
}

.auth-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 2rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    max-width: 480px;
    margin: 0 auto 2rem;
}

.user-badge {
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 0.6rem 0.8rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--text-primary);
}
</style>
""", unsafe_allow_html=True)

# 4. Session State Management
if "authenticated" not in st.session_state:
    st.session_state.authenticated = False
if "username" not in st.session_state:
    st.session_state.username = None


def render_auth_page():
    st.markdown("""
        <div class="auth-header">
            <h1>🧠 AI Codebase Mentor</h1>
            <p>Sign in to your account or register to access the repository analysis workspace.</p>
        </div>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 1.8, 1])
    with col2:
        tab_login, tab_register = st.tabs(["🔑 Sign In", "📝 Create Account"])

        # Tab: Sign In
        with tab_login:
            st.markdown("<br>", unsafe_allow_html=True)
            with st.form("login_form", clear_on_submit=False):
                login_user = st.text_input("Username", key="login_username", placeholder="Enter your username")
                login_pass = st.text_input("Password", type="password", key="login_password", placeholder="••••••••")
                submitted = st.form_submit_button("Sign In", use_container_width=True)

                if submitted:
                    success, message = authenticate_user(login_user, login_pass)
                    if success:
                        for k in list(st.session_state.keys()):
                            if k not in ("authenticated", "username"):
                                del st.session_state[k]
                        st.session_state.authenticated = True
                        st.session_state.username = message
                        st.rerun()
                    else:
                        st.error(message)

        # Tab: Register
        with tab_register:
            st.markdown("<br>", unsafe_allow_html=True)
            with st.form("register_form", clear_on_submit=True):
                reg_user = st.text_input("Choose Username", key="reg_username", placeholder="e.g. dev_johndoe")
                reg_pass = st.text_input("Choose Password", type="password", key="reg_password", placeholder="Min 6 characters")
                reg_pass_confirm = st.text_input("Confirm Password", type="password", key="reg_password_confirm", placeholder="••••••••")
                reg_submit = st.form_submit_button("Create Account", use_container_width=True)

                if reg_submit:
                    if reg_pass != reg_pass_confirm:
                        st.error("Passwords do not match.")
                    else:
                        ok, msg = register_user(reg_user, reg_pass)
                        if ok:
                            st.success(f"{msg} You can switch to the Sign In tab to log in.")
                        else:
                            st.error(msg)


# 5. Routing: Auth Guard or Run App
if not st.session_state.authenticated:
    render_auth_page()
else:
    # Render user session badge & logout in sidebar
    with st.sidebar:
        st.markdown(
            f"""
            <div class="user-badge">
                <span>👤 <strong>{st.session_state.username}</strong></span>
                <span style="color: var(--accent-green); font-size: 0.75rem;">● Active</span>
            </div>
            """,
            unsafe_allow_html=True
        )
        if st.button("🚪 Log Out", key="auth_logout_button", use_container_width=True):
            for k in list(st.session_state.keys()):
                del st.session_state[k]
            st.session_state.authenticated = False
            st.session_state.username = None
            st.rerun()
        st.markdown("---")

    # Temporarily override st.set_page_config so app.py doesn't error when called
    orig_set_page_config = st.set_page_config
    st.set_page_config = lambda *args, **kwargs: None
    try:
        runpy.run_path(str(PROJECT_DIR / "app.py"), run_name="__main__")
    finally:
        st.set_page_config = orig_set_page_config

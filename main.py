import runpy
import sys
from pathlib import Path
import streamlit as st

PROJECT_DIR = Path(__file__).resolve().parent
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

from utils.auth import authenticate_user, register_user, init_db, render_auth_page
from utils.helper import load_css

# 1. Page Configuration (Must be the first Streamlit command)
st.set_page_config(
    page_title="AI Codebase Mentor",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)

# 2. Initialize Database & Stylesheet
init_db()
load_css()

# 3. Session State Management
if "authenticated" not in st.session_state:
    st.session_state.authenticated = False
if "username" not in st.session_state:
    st.session_state.username = None


# 4. Routing: Auth Guard or Run App
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

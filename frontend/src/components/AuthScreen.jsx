import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  User, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle, 
  Sparkles, 
  Terminal, 
  ShieldCheck, 
  Zap, 
  Layers,
  HelpCircle,
  X
} from 'lucide-react';
import { api } from '../services/api';

// Official Google Multi-Color SVG Icon
function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export default function AuthScreen({ onAuthSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Google Auth State
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [showGoogleGuide, setShowGoogleGuide] = useState(false);
  const googleBtnRef = useRef(null);

  useEffect(() => {
    // 1. Fetch Auth Config to see if Google Client ID is configured
    api.getAuthConfig()
      .then((cfg) => {
        if (cfg.google_client_id) {
          setGoogleClientId(cfg.google_client_id);
          setGoogleAvailable(true);
          initGoogleClient(cfg.google_client_id);
        }
      })
      .catch((err) => console.log('Auth config check:', err));
  }, []);

  const initGoogleClient = (clientId) => {
    if (!clientId) return;

    // Load Google Identity Services script if not already present
    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => setupGsi(clientId);
      document.head.appendChild(script);
    } else {
      setupGsi(clientId);
    }
  };

  const setupGsi = (clientId) => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Render custom Google button if container exists
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: 360,
          text: 'continue_with',
          shape: 'rectangular',
        });
      }
    }
  };

  const handleGoogleResponse = async (response) => {
    if (!response || !response.credential) {
      setError('Google Sign-In was cancelled or failed.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await api.googleLogin(response.credential);
      localStorage.setItem('codementor_token', res.token);
      localStorage.setItem('codementor_user', res.username);
      setSuccessMsg(`Welcome, ${res.username}!`);
      setTimeout(() => {
        onAuthSuccess(res.username, res.session_state);
      }, 500);
    } catch (err) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    if (googleAvailable && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
      } catch (e) {
        console.warn('Google prompt fallback:', e);
      }
    } else {
      // Guide user on how to enable Google Auth
      setShowGoogleGuide(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide both username and password.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (tab === 'login') {
        const res = await api.login(username.trim(), password);
        localStorage.setItem('codementor_token', res.token);
        localStorage.setItem('codementor_user', res.username);
        onAuthSuccess(res.username, res.session_state);
      } else {
        const res = await api.register(username.trim(), password);
        localStorage.setItem('codementor_token', res.token);
        localStorage.setItem('codementor_user', res.username);
        setSuccessMsg('Account created successfully! Redirecting...');
        setTimeout(() => {
          onAuthSuccess(res.username, {});
        }, 600);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-fullscreen-container">
      {/* Dynamic Ambient Background Glows */}
      <div className="auth-glow-top" />
      <div className="auth-glow-bottom" />

      <div className="auth-content-wrapper">
        {/* Left / Hero Column */}
        <div className="auth-hero-column">
          <div className="auth-brand-badge">
            <Sparkles size={15} style={{ color: 'var(--accent-blue)' }} />
            <span>AI-Driven Code Intelligence</span>
          </div>

          <h1 className="auth-hero-title">
            Understand, Debug & Mentor <br />
            <span className="gradient-text">Any Codebase in Seconds</span>
          </h1>

          <p className="auth-hero-description">
            Sign in to unlock interactive AST-powered RAG chat, multi-file bug audits, 
            Mermaid architecture visualizers, and seamless session persistence.
          </p>

          <div className="auth-features-list">
            <div className="auth-feature-item">
              <div className="auth-feature-icon-box">
                <Zap size={18} style={{ color: 'var(--accent-blue)' }} />
              </div>
              <div>
                <div className="auth-feature-title">Ultra-Fast Groq Inference</div>
                <div className="auth-feature-sub">Deep reasoning with GPT-OSS 120B & LLaMA 3.1</div>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon-box">
                <Layers size={18} style={{ color: 'var(--accent-purple)' }} />
              </div>
              <div>
                <div className="auth-feature-title">FAISS Vector Code Search</div>
                <div className="auth-feature-sub">Context-aware embeddings matched directly to AST nodes</div>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon-box">
                <ShieldCheck size={18} style={{ color: 'var(--accent-green)' }} />
              </div>
              <div>
                <div className="auth-feature-title">TiDB Cloud Persistence</div>
                <div className="auth-feature-sub">Safe encrypted sessions, chat memory & activity logging</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Glassmorphism Authentication Form */}
        <div className="auth-card-container">
          <div className="auth-card">
            {/* Header / Logo */}
            <div className="auth-card-header">
              <div className="auth-logo-icon">
                <Brain size={30} style={{ color: 'var(--accent-blue)' }} />
              </div>
              <h2 className="auth-card-title">
                {tab === 'login' ? 'Welcome Back' : 'Create an Account'}
              </h2>
              <p className="auth-card-subtitle">
                {tab === 'login' 
                  ? 'Sign in to access your repositories & workspaces' 
                  : 'Get started with your free CodeMentorAI account'}
              </p>
            </div>

            {/* Google Authentication Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={handleGoogleClick}
                className="btn-google-auth"
              >
                <GoogleIcon size={19} />
                <span>Continue with Google</span>
              </button>

              {/* Hidden Google SDK container if active */}
              {googleAvailable && (
                <div ref={googleBtnRef} style={{ display: 'none' }} />
              )}
            </div>

            {/* Divider */}
            <div className="auth-divider">
              <span>or continue with username</span>
            </div>

            {/* Toggle Tabs (Sign In / Register) */}
            <div className="auth-tabs">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setError('');
                  setSuccessMsg('');
                }}
                className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setError('');
                  setSuccessMsg('');
                }}
                className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
              >
                Register
              </button>
            </div>

            {/* Alerts */}
            {error && (
              <div className="auth-alert-error">
                <AlertCircle size={17} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="auth-alert-success">
                <CheckCircle size={17} style={{ flexShrink: 0 }} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="input-group">
                <label className="input-label">Username</label>
                <div className="auth-input-wrapper">
                  <User size={16} className="auth-field-icon" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. alex_developer"
                    className="input-field auth-input"
                    autoComplete="username"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <div className="auth-input-wrapper">
                  <Lock size={16} className="auth-field-icon" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="input-field auth-input"
                    autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary auth-submit-btn"
              >
                <span>
                  {loading 
                    ? 'Authenticating...' 
                    : tab === 'login' 
                    ? 'Sign In to Workspace' 
                    : 'Create Account & Enter'}
                </span>
                <ArrowRight size={17} />
              </button>
            </form>

            <div className="auth-footer-hint">
              <Terminal size={14} style={{ color: 'var(--text-muted)' }} />
              <span>Session stored securely in encrypted TiDB database</span>
            </div>
          </div>
        </div>
      </div>

      {/* Google Setup Guide Modal (Shows if user clicks Google auth before configuring client ID) */}
      {showGoogleGuide && (
        <div className="modal-overlay" onClick={() => setShowGoogleGuide(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GoogleIcon size={22} />
                <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Enable Google Authentication</h3>
              </div>
              <button
                onClick={() => setShowGoogleGuide(false)}
                className="btn btn-outline"
                style={{ padding: '6px', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              To enable 1-click Google Sign-In, add your <strong>Google OAuth Client ID</strong> to your <code>.env</code> file:
            </p>

            <div style={{ background: 'var(--bg-primary)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--accent-blue)' }}>
              GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
            </div>

            <ol style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: '20px', marginBottom: '20px' }}>
              <li>Open <strong>Google Cloud Console</strong> &rarr; <em>APIs & Services</em> &rarr; <em>Credentials</em>.</li>
              <li>Create an <strong>OAuth 2.0 Client ID</strong> (Web Application).</li>
              <li>Add <code>http://localhost:5173</code> (or your Render URL) to <em>Authorized JavaScript Origins</em>.</li>
              <li>Paste the Client ID into <code>.env</code> and restart the backend.</li>
            </ol>

            <button
              onClick={() => setShowGoogleGuide(false)}
              className="btn btn-primary btn-block"
            >
              Got It!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

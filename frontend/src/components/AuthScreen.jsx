import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  User, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Layers,
  GitFork,
  Bug,
  Compass,
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
      }, 400);
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
      setShowGoogleGuide(true);
    }
  };

  const handleGuestEntry = () => {
    const guestUser = 'guest_dev';
    localStorage.setItem('codementor_user', guestUser);
    onAuthSuccess(guestUser, {});
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
        }, 500);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-fullscreen-container">
      {/* Ambient Radial Glows */}
      <div className="auth-glow-top" />
      <div className="auth-glow-bottom" />

      <div className="auth-content-wrapper">
        {/* Left Hero Column */}
        <div className="auth-hero-column">
          <div className="auth-brand-badge">
            <Sparkles size={14} style={{ color: 'var(--accent-blue)' }} />
            <span>AI Codebase Intelligence</span>
          </div>

          <h1 className="auth-hero-title">
            Understand & Mentor <br />
            <span className="gradient-text">Any Codebase Instantly</span>
          </h1>

          <p className="auth-hero-description">
            RAG semantic search, automated vulnerability scans, and interactive Diagram-as-Code architecture models in seconds.
          </p>

          {/* Clean 2x2 Feature Grid */}
          <div className="hero-feature-grid">
            <div className="hero-feature-pill">
              <div className="hero-pill-icon" style={{ background: 'rgba(88, 166, 255, 0.15)', color: 'var(--accent-blue)' }}>
                <Zap size={16} />
              </div>
              <div>
                <div className="hero-pill-title">Groq LLM Reasoning</div>
                <div className="hero-pill-sub">GPT-OSS 120B & LLaMA 3.1</div>
              </div>
            </div>

            <div className="hero-feature-pill">
              <div className="hero-pill-icon" style={{ background: 'rgba(188, 140, 255, 0.15)', color: 'var(--accent-purple)' }}>
                <Layers size={16} />
              </div>
              <div>
                <div className="hero-pill-title">FAISS Vector Search</div>
                <div className="hero-pill-sub">Semantic code citations</div>
              </div>
            </div>

            <div className="hero-feature-pill">
              <div className="hero-pill-icon" style={{ background: 'rgba(57, 211, 83, 0.15)', color: 'var(--accent-green)' }}>
                <GitFork size={16} />
              </div>
              <div>
                <div className="hero-pill-title">Diagram-as-Code</div>
                <div className="hero-pill-sub">Python Diagrams & Mermaid</div>
              </div>
            </div>

            <div className="hero-feature-pill">
              <div className="hero-pill-icon" style={{ background: 'rgba(240, 136, 62, 0.15)', color: 'var(--accent-orange)' }}>
                <Bug size={16} />
              </div>
              <div>
                <div className="hero-pill-title">Bug & Security Audits</div>
                <div className="hero-pill-sub">Severity scoring & fixes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Glassmorphism Auth Card */}
        <div className="auth-card-container">
          <div className="auth-card">
            {/* Header */}
            <div className="auth-card-header">
              <div className="auth-logo-icon">
                <Brain size={28} style={{ color: 'var(--accent-blue)' }} />
              </div>
              <h2 className="auth-card-title">
                {tab === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="auth-card-subtitle">
                {tab === 'login' ? 'Sign in to access your workspace' : 'Get started in seconds'}
              </p>
            </div>

            {/* Quick Guest Entry Button */}
            <button
              type="button"
              onClick={handleGuestEntry}
              className="btn btn-secondary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '10px 16px',
                fontSize: '0.88rem',
                gap: '8px',
                background: 'rgba(88, 166, 255, 0.1)',
                borderColor: 'rgba(88, 166, 255, 0.3)',
                color: '#fff',
              }}
            >
              <Compass size={16} style={{ color: 'var(--accent-blue)' }} />
              <span>Explore Workspace as Guest</span>
            </button>

            {/* Google Authentication Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={handleGoogleClick}
                className="btn-google-auth"
              >
                <GoogleIcon size={18} />
                <span>Continue with Google</span>
              </button>

              {googleAvailable && (
                <div ref={googleBtnRef} style={{ display: 'none' }} />
              )}
            </div>

            {/* Divider */}
            <div className="auth-divider">
              <span>or account credentials</span>
            </div>

            {/* Tabs */}
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
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="auth-alert-success">
                <CheckCircle size={16} style={{ flexShrink: 0 }} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="input-group">
                <label className="input-label">Username</label>
                <div className="auth-input-wrapper">
                  <User size={15} className="auth-field-icon" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="input-field auth-input"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <div className="auth-input-wrapper">
                  <Lock size={15} className="auth-field-icon" />
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
                <span>{loading ? 'Authenticating...' : tab === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Google Setup Guide Modal */}
      {showGoogleGuide && (
        <div className="modal-overlay" onClick={() => setShowGoogleGuide(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GoogleIcon size={20} />
                <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>Google Authentication</h3>
              </div>
              <button
                onClick={() => setShowGoogleGuide(false)}
                className="btn btn-icon"
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
              Add your <strong>Google OAuth Client ID</strong> to your <code>.env</code> file:
            </p>

            <div style={{ background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-blue)', wordBreak: 'break-all' }}>
              GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
            </div>

            <button
              onClick={() => setShowGoogleGuide(false)}
              className="btn btn-primary btn-block"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  User, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle, 
  Sparkles, 
  Compass, 
  X,
  ShieldCheck,
  Search,
  Code2,
  GitBranch
} from 'lucide-react';
import { api } from '../services/api';

function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        fill="#ffffff"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#e4e4e7"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24z"
      />
      <path
        fill="#a1a1aa"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
      />
      <path
        fill="#71717a"
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
          width: 340,
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
        setSuccessMsg('Account created successfully!');
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
      <div className="auth-glow-top" />
      <div className="auth-glow-bottom" />

      <div className="auth-content-wrapper">
        {/* Left Hero Column */}
        <div className="auth-hero-column">
          <div className="auth-brand-badge">
            <Sparkles size={13} style={{ color: '#ffffff' }} />
            <span>Codebase Intelligence</span>
          </div>

          <h1 className="auth-hero-title">
            Understand Any Codebase
          </h1>

          <p className="auth-hero-description">
            Explore architecture, find vulnerabilities, and chat with source files in a minimal workspace.
          </p>

          {/* Minimal 2x2 Feature Grid */}
          <div className="hero-feature-grid">
            <div className="hero-feature-pill">
              <div className="hero-pill-icon">
                <Search size={15} />
              </div>
              <div>
                <div className="hero-pill-title">Semantic Search</div>
                <div className="hero-pill-sub">Exact file citations</div>
              </div>
            </div>

            <div className="hero-feature-pill">
              <div className="hero-pill-icon">
                <GitBranch size={15} />
              </div>
              <div>
                <div className="hero-pill-title">Architecture Maps</div>
                <div className="hero-pill-sub">Visual component flow</div>
              </div>
            </div>

            <div className="hero-feature-pill">
              <div className="hero-pill-icon">
                <ShieldCheck size={15} />
              </div>
              <div>
                <div className="hero-pill-title">Security & Bugs</div>
                <div className="hero-pill-sub">Automated audit & fixes</div>
              </div>
            </div>

            <div className="hero-feature-pill">
              <div className="hero-pill-icon">
                <Code2 size={15} />
              </div>
              <div>
                <div className="hero-pill-title">Documentation</div>
                <div className="hero-pill-sub">Instant summaries & READMEs</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Monochrome Auth Card */}
        <div className="auth-card-container">
          <div className="auth-card">
            {/* Header */}
            <div className="auth-card-header">
              <div className="auth-logo-icon">
                <Brain size={22} />
              </div>
              <h2 className="auth-card-title">
                {tab === 'login' ? 'Sign In' : 'Create Account'}
              </h2>
              <p className="auth-card-subtitle">
                {tab === 'login' ? 'Enter credentials to continue' : 'Get started in seconds'}
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
                padding: '9px 14px',
                fontSize: '0.85rem',
                gap: '8px',
              }}
            >
              <Compass size={15} />
              <span>Explore as Guest</span>
            </button>

            {/* Google Authentication Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={handleGoogleClick}
                className="btn-google-auth"
              >
                <GoogleIcon size={16} />
                <span>Continue with Google</span>
              </button>

              {googleAvailable && (
                <div ref={googleBtnRef} style={{ display: 'none' }} />
              )}
            </div>

            {/* Divider */}
            <div className="auth-divider">
              <span>or</span>
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
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="auth-alert-success">
                <CheckCircle size={15} style={{ flexShrink: 0 }} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="input-group">
                <label className="input-label">Username</label>
                <div className="auth-input-wrapper">
                  <User size={14} className="auth-field-icon" />
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
                  <Lock size={14} className="auth-field-icon" />
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
                <ArrowRight size={15} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Google Setup Guide Modal */}
      {showGoogleGuide && (
        <div className="modal-overlay" onClick={() => setShowGoogleGuide(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GoogleIcon size={18} />
                <h3 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 600 }}>Google Sign-In Setup</h3>
              </div>
              <button
                onClick={() => setShowGoogleGuide(false)}
                className="btn btn-outline"
                style={{ padding: '4px', borderRadius: '50%' }}
              >
                <X size={15} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
              To enable Google Single Sign-On, configure <code>GOOGLE_CLIENT_ID</code> in your configuration.
            </p>

            <button
              onClick={() => setShowGoogleGuide(false)}
              className="btn btn-primary btn-block"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

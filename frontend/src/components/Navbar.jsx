import React, { useState } from 'react';
import { 
  Brain, 
  GitBranch, 
  Key, 
  User, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  Settings,
  Cpu,
  Menu,
  X,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

export default function Navbar({
  user,
  onLogout,
  onOpenAuth,
  activeRepo,
  groqApiKey,
  onApiKeyChange,
  selectedModel,
  onModelChange,
  isSidebarOpen,
  onToggleSidebar,
}) {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState(groqApiKey || '');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleSaveKey = (e) => {
    e.preventDefault();
    onApiKeyChange(tempKey.trim());
    setShowKeyModal(false);
  };

  const isKeyValid = groqApiKey && groqApiKey.length > 20 && groqApiKey.startsWith('gsk_');

  return (
    <>
      <header className="navbar">
        {/* Left: Hamburger (Mobile) + Brand */}
        <div className="nav-left-group">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="btn btn-icon sidebar-toggle-btn"
              title="Toggle Repository Sidebar"
              aria-label="Toggle Sidebar"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}

          <div className="nav-brand">
            <Brain size={26} style={{ color: '#58a6ff', flexShrink: 0 }} />
            <span className="brand-text">CodeMentorAI</span>
            <span className="brand-badge">FastAPI + React</span>
          </div>
        </div>

        {/* Center: Active Repo Badge */}
        <div className="nav-center">
          {activeRepo ? (
            <div className="active-repo-badge" title={`Active: ${activeRepo.name} (${activeRepo.info?.branch || 'main'})`}>
              <GitBranch size={15} style={{ color: '#3fb950', flexShrink: 0 }} />
              <strong className="repo-badge-name">{activeRepo.name}</strong>
              <span className="repo-badge-branch" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                ({activeRepo.info?.branch || 'main'})
              </span>
              {activeRepo.knowledgeBaseBuilt ? (
                <span className="status-badge status-ready" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                  ⚡ KB
                </span>
              ) : (
                <span className="status-badge status-pending" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                  ○ No KB
                </span>
              )}
            </div>
          ) : (
            <div className="active-repo-badge" style={{ color: 'var(--text-muted)' }}>
              <span className="repo-badge-empty">No Repo Selected</span>
            </div>
          )}
        </div>

        {/* Right: Desktop Controls */}
        <div className="nav-right desktop-nav-controls">
          {/* Model Selector */}
          <div className="model-selector-wrapper">
            <Cpu size={15} style={{ color: 'var(--text-secondary)' }} />
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="select-field nav-model-select"
            >
              <option value="openai/gpt-oss-120b">GPT-OSS 120B (Groq)</option>
              <option value="llama-3.1-8b-instant">Llama 3.1 8B (Fast)</option>
              <option value="gemma2-9b-it">Gemma 2 9B (Google)</option>
              <option value="mixtral-8x7b-32768">Mixtral 8x7B (32k)</option>
            </select>
          </div>

          {/* API Key Button */}
          <button
            onClick={() => setShowKeyModal(true)}
            className="btn btn-outline nav-key-btn"
            title="Configure Groq API Key"
          >
            <Key size={14} />
            <span className="btn-text">API Key</span>
            {isKeyValid ? (
              <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
            ) : (
              <AlertCircle size={14} style={{ color: 'var(--accent-orange)' }} />
            )}
          </button>

          {/* User Status / Login */}
          {user ? (
            <div className="nav-user-container">
              <div className="nav-user-pill" title={`Logged in as ${user}`}>
                <User size={14} style={{ color: 'var(--accent-purple)' }} />
                <span className="nav-user-name">{user}</span>
              </div>
              <button
                onClick={onLogout}
                className="btn btn-outline nav-logout-btn"
                title="Log Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button onClick={onOpenAuth} className="btn btn-primary nav-signin-btn">
              <User size={15} />
              <span>Sign In</span>
            </button>
          )}
        </div>

        {/* Right: Mobile Menu Toggle Button */}
        <div className="mobile-nav-toggle-group">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className={`btn btn-icon mobile-menu-btn ${showMobileMenu ? 'active' : ''}`}
            title="Open Menu"
            aria-label="Open Navigation Menu"
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </header>

      {/* Mobile Controls Collapsible Dropdown */}
      {showMobileMenu && (
        <div className="mobile-nav-dropdown">
          <div className="mobile-nav-row">
            <label className="mobile-nav-label">
              <Cpu size={14} />
              <span>LLM Model</span>
            </label>
            <select
              value={selectedModel}
              onChange={(e) => {
                onModelChange(e.target.value);
              }}
              className="select-field"
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="openai/gpt-oss-120b">GPT-OSS 120B (Groq)</option>
              <option value="llama-3.1-8b-instant">Llama 3.1 8B (Fast)</option>
              <option value="gemma2-9b-it">Gemma 2 9B (Google)</option>
              <option value="mixtral-8x7b-32768">Mixtral 8x7B (32k)</option>
            </select>
          </div>

          <div className="mobile-nav-actions">
            <button
              onClick={() => {
                setShowMobileMenu(false);
                setShowKeyModal(true);
              }}
              className="btn btn-outline"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <Key size={14} />
              <span>API Key</span>
              {isKeyValid ? (
                <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
              ) : (
                <AlertCircle size={14} style={{ color: 'var(--accent-orange)' }} />
              )}
            </button>

            {user ? (
              <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                <div
                  className="nav-user-pill"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <User size={14} style={{ color: 'var(--accent-purple)' }} />
                  <span className="nav-user-name">{user}</span>
                </div>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    onLogout();
                  }}
                  className="btn btn-outline"
                  title="Log Out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  onOpenAuth();
                }}
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <User size={14} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="modal-overlay" onClick={() => setShowKeyModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Key size={22} style={{ color: 'var(--accent-blue)' }} />
              <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Groq API Configuration</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Enter your Groq API key (starts with <code>gsk_...</code>). Free keys can be created at{' '}
              <a
                href="https://console.groq.com"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent-blue)' }}
              >
                console.groq.com
              </a>.
            </p>
            <form onSubmit={handleSaveKey} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">Groq API Key</label>
                <input
                  type="password"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="gsk_..."
                  className="input-field"
                  autoComplete="off"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}


import React, { useState } from 'react';
import { 
  Brain, 
  GitBranch, 
  Key, 
  Eye,
  EyeOff,
  User, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  Menu, 
  X, 
  SlidersHorizontal 
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
  const [showApiKey, setShowApiKey] = useState(false);
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
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          )}

          <div className="nav-brand">
            <Brain size={22} style={{ color: '#ffffff', flexShrink: 0 }} />
            <span className="brand-text">CodeMentor</span>
          </div>
        </div>

        {/* Center: Active Repo Indicator */}
        <div className="nav-center">
          {activeRepo ? (
            <div className="active-repo-badge" title={`Active: ${activeRepo.name} (${activeRepo.info?.branch || 'main'})`}>
              <GitBranch size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              <strong className="repo-badge-name">{activeRepo.name}</strong>
              <span className="repo-badge-branch" style={{ fontSize: '0.75rem' }}>
                ({activeRepo.info?.branch || 'main'})
              </span>
              {activeRepo.knowledgeBaseBuilt ? (
                <span className="status-badge status-ready" style={{ padding: '2px 6px', fontSize: '0.68rem' }}>
                  Indexed
                </span>
              ) : (
                <span className="status-badge status-pending" style={{ padding: '2px 6px', fontSize: '0.68rem' }}>
                  Not Indexed
                </span>
              )}
            </div>
          ) : (
            <div className="active-repo-badge" style={{ color: 'var(--text-muted)' }}>
              <span>No Repository Selected</span>
            </div>
          )}
        </div>

        {/* Right: Desktop Controls */}
        <div className="nav-right desktop-nav-controls">
          {/* Model Selector */}
          <div className="model-selector-wrapper">
            <Cpu size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="select-field nav-model-select"
            >
              <option value="openai/gpt-oss-120b">GPT-OSS 120B</option>
              <option value="llama-3.1-8b-instant">Llama 3.1 8B</option>
              <option value="gemma2-9b-it">Gemma 2 9B</option>
              <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
            </select>
          </div>

          {/* API Key Button */}
          <button
            onClick={() => setShowKeyModal(true)}
            className="btn btn-outline"
            style={{ padding: '6px 12px', fontSize: '0.82rem' }}
            title="Configure API Key"
          >
            <Key size={13} />
            <span>API Key</span>
            {isKeyValid ? (
              <CheckCircle2 size={13} style={{ color: '#ffffff' }} />
            ) : (
              <AlertCircle size={13} style={{ color: 'var(--text-muted)' }} />
            )}
          </button>

          {/* User Status / Login */}
          {user ? (
            <div className="nav-user-container">
              <div className="nav-user-pill" title={`Logged in as ${user}`}>
                <User size={13} style={{ color: 'var(--text-secondary)' }} />
                <span className="nav-user-name">{user}</span>
              </div>
              <button
                onClick={onLogout}
                className="btn btn-outline"
                style={{ padding: '6px 8px' }}
                title="Log Out"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button onClick={onOpenAuth} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
              <User size={13} />
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
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </header>

      {/* Mobile Controls Collapsible Dropdown */}
      {showMobileMenu && (
        <div className="mobile-nav-dropdown">
          <div className="mobile-nav-row">
            <label className="mobile-nav-label">
              <Cpu size={13} />
              <span>Model</span>
            </label>
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="select-field"
              style={{ width: '100%', fontSize: '0.82rem' }}
            >
              <option value="openai/gpt-oss-120b">GPT-OSS 120B</option>
              <option value="llama-3.1-8b-instant">Llama 3.1 8B</option>
              <option value="gemma2-9b-it">Gemma 2 9B</option>
              <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
            </select>
          </div>

          <div className="mobile-nav-actions">
            <button
              onClick={() => {
                setShowMobileMenu(false);
                setShowKeyModal(true);
              }}
              className="btn btn-outline"
              style={{ flex: 1, justifyContent: 'center', fontSize: '0.82rem' }}
            >
              <Key size={13} />
              <span>API Key</span>
              {isKeyValid && <CheckCircle2 size={13} style={{ color: '#ffffff' }} />}
            </button>

            {user ? (
              <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                <div
                  className="nav-user-pill"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <User size={13} style={{ color: 'var(--text-secondary)' }} />
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
                  <LogOut size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  onOpenAuth();
                }}
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.82rem' }}
              >
                <User size={13} />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Key size={20} style={{ color: '#ffffff' }} />
              <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 600 }}>API Configuration</h3>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              Enter your Groq API key to power code analysis and assistant queries.
            </p>
            <form onSubmit={handleSaveKey} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="input-group">
                <label className="input-label">API Key</label>
                <div className="auth-input-wrapper">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    placeholder="gsk_..."
                    className="input-field auth-input"
                    style={{ paddingLeft: '12px', paddingRight: '36px' }}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="auth-password-toggle"
                    aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                    title={showApiKey ? 'Hide API key' : 'Show API key'}
                  >
                    {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
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
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

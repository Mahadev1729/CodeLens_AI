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
  Cpu
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
}) {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState(groqApiKey || '');

  const handleSaveKey = (e) => {
    e.preventDefault();
    onApiKeyChange(tempKey.trim());
    setShowKeyModal(false);
  };

  const isKeyValid = groqApiKey && groqApiKey.length > 20 && groqApiKey.startsWith('gsk_');

  return (
    <>
      <header className="navbar">
        {/* Left: Brand */}
        <div className="nav-brand">
          <Brain size={28} style={{ color: '#58a6ff' }} />
          <span>CodeMentorAI</span>
          <span className="brand-badge">FastAPI + React</span>
        </div>

        {/* Center: Active Repo Badge */}
        <div className="nav-center">
          {activeRepo ? (
            <div className="active-repo-badge">
              <GitBranch size={16} style={{ color: '#3fb950' }} />
              <strong>{activeRepo.name}</strong>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                ({activeRepo.info?.branch || 'main'})
              </span>
              {activeRepo.knowledgeBaseBuilt ? (
                <span className="status-badge status-ready" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                  ⚡ KB Ready
                </span>
              ) : (
                <span className="status-badge status-pending" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                  ○ No KB
                </span>
              )}
            </div>
          ) : (
            <div className="active-repo-badge" style={{ color: 'var(--text-muted)' }}>
              <span>No Repository Loaded</span>
            </div>
          )}
        </div>

        {/* Right: Model Picker, API Key, User */}
        <div className="nav-right">
          {/* Model Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={16} style={{ color: 'var(--text-secondary)' }} />
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="select-field"
              style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'var(--bg-tertiary)' }}
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
            className="btn btn-outline"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            <Key size={14} />
            <span>API Key</span>
            {isKeyValid ? (
              <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
            ) : (
              <AlertCircle size={14} style={{ color: 'var(--accent-orange)' }} />
            )}
          </button>

          {/* User Status / Login */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--bg-tertiary)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                }}
              >
                <User size={15} style={{ color: 'var(--accent-purple)' }} />
                <strong>{user}</strong>
              </div>
              <button
                onClick={onLogout}
                className="btn btn-outline"
                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                title="Log Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button onClick={onOpenAuth} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
              <User size={15} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

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

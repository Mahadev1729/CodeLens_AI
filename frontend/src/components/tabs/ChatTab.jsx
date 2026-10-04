import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Trash2, 
  Sparkles, 
  FileText, 
  Bot, 
  User, 
  Loader2, 
  GitBranch, 
  DownloadCloud, 
  FolderGit2, 
  ArrowRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../../services/api';

const QUICK_REPOS = [
  { name: 'FastAPI', url: 'https://github.com/tiangolo/fastapi' },
  { name: 'Flask', url: 'https://github.com/pallets/flask' },
  { name: 'Express', url: 'https://github.com/expressjs/express' },
];

const SUGGESTIONS = [
  'Explain overall architecture',
  'How does authentication work?',
  'What are the main entry points?',
  'Find potential bugs or bottlenecks',
];

export default function ChatTab({
  activeRepo,
  groqApiKey,
  selectedModel,
  onOpenFileInExplorer,
  localRepos = [],
  onSelectRepo,
  onCloneRepo,
  onBuildKb,
  isCloning = false,
  isBuildingKb = false,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (activeRepo?.name) {
      loadHistory();
    }
  }, [activeRepo?.name]);

  const loadHistory = async () => {
    try {
      const res = await api.getChatHistory(activeRepo?.name);
      setMessages(res.chat_history || []);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (questionText) => {
    const text = questionText || input;
    if (!text.trim() || !activeRepo || loading) return;

    const userMsg = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.askChat(
        text,
        activeRepo.name,
        activeRepo.path,
        groqApiKey,
        selectedModel
      );

      const assistantMsg = {
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to generate answer.'}`,
        sources: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!activeRepo) return;
    try {
      await api.clearChatHistory(activeRepo.name);
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  if (!activeRepo) {
    return (
      <div style={{ maxWidth: '720px', margin: '30px auto 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="card" style={{ padding: '36px 28px', textAlign: 'center', background: '#121214', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
            Code Intelligence Workspace
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#a1a1aa', maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.5 }}>
            Clone a public GitHub repository from the sidebar or click a sample repository below to start exploring.
          </p>

          {onCloneRepo && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              {QUICK_REPOS.map((repo) => (
                <button
                  key={repo.name}
                  onClick={() => onCloneRepo(repo.url)}
                  disabled={isCloning}
                  className="hero-feature-pill"
                  style={{
                    cursor: isCloning ? 'not-allowed' : 'pointer',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: 'var(--radius-md)',
                    color: '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DownloadCloud size={16} style={{ color: '#ffffff' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ffffff' }}>{repo.name}</span>
                  </div>
                  <ArrowRight size={14} style={{ color: '#a1a1aa' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {localRepos && localRepos.length > 0 && onSelectRepo && (
          <div className="card" style={{ padding: '20px', background: '#121214', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
            <div style={{ fontSize: '0.78rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: 600 }}>
              Available Local Repositories
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {localRepos.map((r) => (
                <button
                  key={r.name}
                  onClick={() => onSelectRepo(r)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.84rem', color: '#ffffff', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                >
                  <GitBranch size={14} style={{ color: '#ffffff' }} />
                  <span>{r.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!activeRepo.knowledgeBaseBuilt) {
    return (
      <div className="empty-state">
        <h3 className="empty-title">Repository Not Indexed</h3>
        <p className="empty-desc" style={{ maxWidth: '400px', margin: '0 auto 16px' }}>
          Index <strong>{activeRepo.name}</strong> to enable semantic code search and context-aware responses.
        </p>
        {onBuildKb && (
          <button
            onClick={onBuildKb}
            disabled={isBuildingKb}
            className="btn btn-primary"
            style={{ padding: '8px 20px' }}
          >
            {isBuildingKb ? <Loader2 size={14} className="spin-animate" /> : null}
            <span>{isBuildingKb ? 'Indexing Repository...' : 'Index Codebase'}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff' }}>Chat</h2>
        </div>
        {messages.length > 0 && (
          <button onClick={handleClear} className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Suggested prompts when empty */}
      {messages.length === 0 && (
        <div style={{ marginTop: 'auto', marginBottom: '16px' }}>
          <div className="suggestions-grid">
            {SUGGESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="suggestion-btn"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message List */}
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-msg ${msg.role}`}>
            <div className="chat-body">
              <div className="markdown-body">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>

              {/* Referenced Files */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="chat-sources">
                  {msg.sources.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => onOpenFileInExplorer && onOpenFileInExplorer(src)}
                      className="source-badge"
                      style={{ cursor: 'pointer' }}
                      title={`Open ${src}`}
                    >
                      <FileText size={11} />
                      <span>{src}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-msg assistant">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
              <Loader2 size={14} className="spin-animate" />
              <span>Analyzing code...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="chat-input-bar"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the code..."
          className="chat-input"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn btn-primary"
          style={{ padding: '7px 14px', borderRadius: 'var(--radius-xl)' }}
        >
          <Send size={14} />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}

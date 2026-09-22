import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Sparkles, FileText, Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../../services/api';

const SUGGESTIONS = [
  'Explain the overall project architecture',
  'How does authentication and authorization work?',
  'What are the main API endpoints or entry points?',
  'Explain the database models and schemas',
  'What dependencies and third-party libraries are used?',
  'Find potential bugs or performance bottlenecks',
];

export default function ChatTab({
  activeRepo,
  groqApiKey,
  selectedModel,
  onOpenFileInExplorer,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Load chat history when repo changes
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
      timestamp: new Date().toLocaleTimeString(),
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
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: `⚠️ **Error:** ${err.message || 'Failed to generate answer. Please check your Groq API key and vector knowledge base.'}`,
        sources: [],
        timestamp: new Date().toLocaleTimeString(),
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
      <div className="empty-state">
        <div className="empty-icon">💬</div>
        <h3 className="empty-title">Chat Not Available</h3>
        <p className="empty-desc">
          Please clone a repository or select a local repository from the sidebar to chat with the codebase.
        </p>
      </div>
    );
  }

  if (!activeRepo.knowledgeBaseBuilt) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⚡</div>
        <h3 className="empty-title">Knowledge Base Not Built</h3>
        <p className="empty-desc">
          Click <strong>Build KB</strong> in the sidebar to index the repository before starting your conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} style={{ color: 'var(--accent-blue)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Chat with Codebase</h2>
        </div>
        {messages.length > 0 && (
          <button onClick={handleClear} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            <Trash2 size={14} />
            <span>Clear Chat</span>
          </button>
        )}
      </div>

      {/* Suggested prompts when empty */}
      {messages.length === 0 && (
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            💡 Try asking:
          </div>
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
            <div className="chat-avatar">
              {msg.role === 'user' ? (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(88,166,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={18} style={{ color: 'var(--accent-blue)' }} />
                </div>
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(188,140,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={18} style={{ color: 'var(--accent-purple)' }} />
                </div>
              )}
            </div>
            <div className="chat-body">
              <div className="markdown-body">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>

              {/* Referenced Files Badges */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="chat-sources">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Referenced:</span>
                  {msg.sources.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => onOpenFileInExplorer && onOpenFileInExplorer(src)}
                      className="source-badge"
                      style={{ border: 'none', cursor: 'pointer' }}
                      title={`Open ${src}`}
                    >
                      <FileText size={12} />
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
            <div className="chat-avatar">
              <Bot size={22} style={{ color: 'var(--accent-purple)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <Loader2 size={16} className="spin-animate" />
              <span>Analyzing codebase and retrieving context...</span>
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
          placeholder="Ask anything about the codebase (e.g. How does auth work? Explain architecture)..."
          className="chat-input"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn btn-primary"
          style={{ padding: '8px 16px', borderRadius: 'var(--radius-lg)' }}
        >
          <Send size={16} />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}

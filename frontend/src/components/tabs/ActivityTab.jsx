import React, { useState, useEffect } from 'react';
import { 
  History, 
  MessageSquare, 
  Trash2, 
  Search, 
  Filter, 
  FileText, 
  GitBranch, 
  Zap, 
  Bug, 
  Clock, 
  User,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../../services/api';

const ACTIVITY_TYPE_MAP = {
  clone: { label: '📦 Clone Repo', class: 'status-ready' },
  build_kb: { label: '⚡ Build KB', class: 'status-ready' },
  chat: { label: '💬 Chat Query', class: 'status-pending' },
  summary: { label: '📋 Summary', class: 'status-pending' },
  bugs: { label: '🐛 Bug Finder', class: 'status-error' },
  architecture: { label: '🏗️ Architecture', class: 'status-ready' },
  readme: { label: '📝 README', class: 'status-ready' },
  file_explain: { label: '🤖 File Explain', class: 'status-pending' },
};

export default function ActivityTab({ user }) {
  const [subTab, setSubTab] = useState('timeline'); // 'timeline' | 'chats'
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedChat, setExpandedChat] = useState(0);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [actRes, statsRes, chatRes] = await Promise.all([
        api.getActivities(),
        api.getActivityStats(),
        api.getChatHistory(),
      ]);
      setActivities(actRes.activities || []);
      setStats(statsRes || null);
      setChatHistory(chatRes.chat_history || []);
    } catch (err) {
      console.error('Failed to load activity data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearActivities = async () => {
    try {
      await api.clearActivities();
      setActivities([]);
      loadData();
    } catch (err) {
      console.error('Failed to clear activities:', err);
    }
  };

  const handleClearChatHistory = async () => {
    try {
      await api.clearChatHistory();
      setChatHistory([]);
      loadData();
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  };

  const filteredActivities = activities.filter((act) => {
    const matchesType = filterType === 'all' || act.activity_type === filterType;
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      (act.title || '').toLowerCase().includes(q) ||
      (act.details || '').toLowerCase().includes(q) ||
      (act.repo_name || '').toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  // Group chat history into Q&A pairs
  const chatPairs = [];
  let i = 0;
  while (i < chatHistory.length) {
    const msg = chatHistory[i];
    if (msg.role === 'user') {
      const q = msg.content;
      const ts = msg.timestamp;
      let ans = '';
      let sources = [];
      if (i + 1 < chatHistory.length && chatHistory[i + 1].role === 'assistant') {
        ans = chatHistory[i + 1].content;
        sources = chatHistory[i + 1].sources || [];
        i += 2;
      } else {
        i += 1;
      }
      chatPairs.push({
        question: q,
        answer: ans,
        sources,
        timestamp: ts,
        repo_name: msg.repo_name,
      });
    } else {
      i += 1;
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>📜 Past Activity & History Dashboard</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Detailed record of your past queries, repository analyses, and system interactions
        </p>
      </div>

      {/* Metric Cards */}
      {stats && (
        <div className="metric-grid">
          <div className="metric-card">
            <div className="metric-label">👤 Active Account</div>
            <div className="metric-val" style={{ fontSize: '1.1rem' }}>{user || 'Guest'}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">💬 Questions Asked</div>
            <div className="metric-val">{stats.total_questions || 0}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">📦 Repos Explored</div>
            <div className="metric-val">{stats.distinct_repos_count || 0}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">⚡ Total Activities</div>
            <div className="metric-val">{stats.total_activities || 0}</div>
          </div>
        </div>
      )}

      {/* Sub-tabs toggle */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button
          onClick={() => setSubTab('timeline')}
          className={`btn ${subTab === 'timeline' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          <Clock size={15} />
          <span>Activity Timeline ({activities.length})</span>
        </button>
        <button
          onClick={() => setSubTab('chats')}
          className={`btn ${subTab === 'chats' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          <MessageSquare size={15} />
          <span>Past Conversations ({chatPairs.length})</span>
        </button>
      </div>

      {/* 1. Activity Timeline View */}
      {subTab === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Controls */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search activities by title, repository, or details..."
                className="input-field"
                style={{ width: '100%', paddingLeft: '34px', fontSize: '0.85rem' }}
              />
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="select-field"
              style={{ fontSize: '0.85rem', padding: '8px 12px' }}
            >
              <option value="all">All Events</option>
              <option value="clone">📦 Clones</option>
              <option value="build_kb">⚡ Knowledge Base</option>
              <option value="chat">💬 Chat Questions</option>
              <option value="summary">📋 Summaries</option>
              <option value="bugs">🐛 Bug Reports</option>
              <option value="architecture">🏗️ Architecture</option>
              <option value="readme">📝 READMEs</option>
              <option value="file_explain">🤖 File Explanations</option>
            </select>

            {activities.length > 0 && (
              <button
                onClick={handleClearActivities}
                className="btn btn-danger"
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                <Trash2 size={14} />
                <span>Clear Log</span>
              </button>
            )}
          </div>

          {/* Timeline List */}
          {filteredActivities.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <History size={36} style={{ color: 'var(--text-muted)', marginBottom: '10px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No activities found matching your criteria.</p>
            </div>
          ) : (
            filteredActivities.map((act, index) => {
              const typeInfo = ACTIVITY_TYPE_MAP[act.activity_type] || {
                label: '⚡ Action',
                class: 'status-ready',
              };
              return (
                <div key={index} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`status-badge ${typeInfo.class}`}>
                        {typeInfo.label}
                      </span>
                      <strong style={{ fontSize: '0.92rem', color: '#fff' }}>{act.title}</strong>
                      {act.repo_name && (
                        <span className="source-badge">
                          📦 {act.repo_name}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      🕒 {act.timestamp}
                    </div>
                  </div>
                  {act.details && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '4px' }}>
                      {act.details}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. Past Chat Conversations View */}
      {subTab === 'chats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {chatPairs.length > 0 && (
              <button
                onClick={handleClearChatHistory}
                className="btn btn-danger"
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                <Trash2 size={14} />
                <span>Clear All Chat History</span>
              </button>
            )}
          </div>

          {chatPairs.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <MessageSquare size={36} style={{ color: 'var(--text-muted)', marginBottom: '10px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No previous chat conversations saved yet.</p>
            </div>
          ) : (
            chatPairs.map((pair, idx) => {
              const isExpanded = expandedChat === idx;
              return (
                <div key={idx} className="card" style={{ padding: '16px' }}>
                  <div
                    onClick={() => setExpandedChat(isExpanded ? -1 : idx)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MessageSquare size={16} style={{ color: 'var(--accent-blue)' }} />
                      <strong style={{ fontSize: '0.92rem', color: '#fff' }}>
                        Q: {pair.question.length > 80 ? `${pair.question.slice(0, 80)}...` : pair.question}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🕒 {pair.timestamp}</span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: 600, marginBottom: '4px' }}>
                          Question:
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#fff' }}>{pair.question}</p>
                      </div>

                      {pair.answer && (
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--accent-purple)', fontWeight: 600, marginBottom: '4px' }}>
                            Answer:
                          </div>
                          <div className="markdown-body" style={{ fontSize: '0.88rem' }}>
                            <ReactMarkdown>{pair.answer}</ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {pair.sources && pair.sources.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            Referenced Sources:
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {pair.sources.map((s, si) => (
                              <span key={si} className="source-badge">
                                📄 {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

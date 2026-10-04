import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  Search, 
  Clock, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../../services/api';

const ACTIVITY_TYPE_MAP = {
  clone: { label: 'Clone', class: 'status-ready' },
  build_kb: { label: 'Index', class: 'status-ready' },
  chat: { label: 'Chat', class: 'status-pending' },
  summary: { label: 'Summary', class: 'status-pending' },
  bugs: { label: 'Audit', class: 'status-error' },
  architecture: { label: 'Architecture', class: 'status-ready' },
  readme: { label: 'README', class: 'status-ready' },
  file_explain: { label: 'Explain', class: 'status-pending' },
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
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>Activity & History</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Log of past operations and queries
        </p>
      </div>

      {/* Metric Cards */}
      {stats && (
        <div className="metric-grid">
          <div className="metric-card">
            <div className="metric-label">Account</div>
            <div className="metric-val" style={{ fontSize: '1rem' }}>{user || 'Guest'}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Queries</div>
            <div className="metric-val">{stats.total_questions || 0}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Repositories</div>
            <div className="metric-val">{stats.distinct_repos_count || 0}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Events</div>
            <div className="metric-val">{stats.total_activities || 0}</div>
          </div>
        </div>
      )}

      {/* Sub-tabs toggle */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <button
          onClick={() => setSubTab('timeline')}
          className={`btn ${subTab === 'timeline' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 14px', fontSize: '0.82rem' }}
        >
          <Clock size={13} />
          <span>Timeline ({activities.length})</span>
        </button>
        <button
          onClick={() => setSubTab('chats')}
          className={`btn ${subTab === 'chats' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 14px', fontSize: '0.82rem' }}
        >
          <MessageSquare size={13} />
          <span>Conversations ({chatPairs.length})</span>
        </button>
      </div>

      {/* 1. Activity Timeline View */}
      {subTab === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search activity..."
                className="input-field"
                style={{ width: '100%', paddingLeft: '30px', fontSize: '0.82rem' }}
              />
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  left: '9px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="select-field"
              style={{ fontSize: '0.82rem', padding: '6px 10px' }}
            >
              <option value="all">All Events</option>
              <option value="clone">Clone</option>
              <option value="build_kb">Index</option>
              <option value="chat">Chat</option>
              <option value="summary">Summary</option>
              <option value="bugs">Audit</option>
              <option value="architecture">Architecture</option>
              <option value="readme">README</option>
              <option value="file_explain">Explain</option>
            </select>

            {activities.length > 0 && (
              <button
                onClick={handleClearActivities}
                className="btn btn-danger"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                <Trash2 size={13} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Timeline List */}
          {filteredActivities.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>No activity records found.</p>
            </div>
          ) : (
            filteredActivities.map((act, index) => {
              const typeInfo = ACTIVITY_TYPE_MAP[act.activity_type] || {
                label: 'Action',
                class: 'status-ready',
              };
              return (
                <div key={index} className="card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`status-badge ${typeInfo.class}`}>
                        {typeInfo.label}
                      </span>
                      <strong style={{ fontSize: '0.88rem', color: '#fff' }}>{act.title}</strong>
                      {act.repo_name && (
                        <span className="source-badge">
                          {act.repo_name}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {act.timestamp}
                    </div>
                  </div>
                  {act.details && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            {chatPairs.length > 0 && (
              <button
                onClick={handleClearChatHistory}
                className="btn btn-danger"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                <Trash2 size={13} />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {chatPairs.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>No chat history saved yet.</p>
            </div>
          ) : (
            chatPairs.map((pair, idx) => {
              const isExpanded = expandedChat === idx;
              return (
                <div key={idx} className="card" style={{ padding: '12px 16px' }}>
                  <div
                    onClick={() => setExpandedChat(isExpanded ? -1 : idx)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <strong style={{ fontSize: '0.88rem', color: '#fff' }}>
                      {pair.question.length > 80 ? `${pair.question.slice(0, 80)}...` : pair.question}
                    </strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{pair.timestamp}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {pair.answer && (
                        <div className="markdown-body" style={{ fontSize: '0.86rem' }}>
                          <ReactMarkdown>{pair.answer}</ReactMarkdown>
                        </div>
                      )}

                      {pair.sources && pair.sources.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {pair.sources.map((s, si) => (
                            <span key={si} className="source-badge">
                              {s}
                            </span>
                          ))}
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

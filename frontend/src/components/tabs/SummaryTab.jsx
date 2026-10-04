import React, { useState, useEffect } from 'react';
import { RefreshCw, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../../services/api';

export default function SummaryTab({
  activeRepo,
  groqApiKey,
  selectedModel,
  cachedSummary,
  onSummaryGenerated,
}) {
  const [summary, setSummary] = useState(cachedSummary || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cachedSummary) {
      setSummary(cachedSummary);
    }
  }, [cachedSummary]);

  const handleGenerate = async (regenerate = false) => {
    if (!activeRepo?.path) return;
    setLoading(true);
    setError('');

    try {
      const res = await api.generateSummary(
        activeRepo.path,
        activeRepo.name,
        groqApiKey,
        selectedModel,
        regenerate
      );
      setSummary(res.summary);
      if (onSummaryGenerated) {
        onSummaryGenerated(res.summary);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate summary.');
    } finally {
      setLoading(false);
    }
  };

  if (!activeRepo) {
    return (
      <div className="empty-state">
        <h3 className="empty-title">No Repository Loaded</h3>
        <p className="empty-desc">
          Select or clone a repository from the sidebar to view its summary.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>Overview</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Codebase structure and summary for {activeRepo.name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {summary && (
            <button
              onClick={() => handleGenerate(true)}
              disabled={loading}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.82rem' }}
            >
              <RefreshCw size={13} className={loading ? 'spin-animate' : ''} />
              <span>Regenerate</span>
            </button>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="card" style={{ background: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.3)', color: '#fca5a5', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Initial Trigger */}
      {!summary && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '6px', color: '#fff' }}>Generate Summary</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 16px' }}>
            Analyze modules, architecture, and entry points to produce a project overview.
          </p>
          <button onClick={() => handleGenerate(false)} className="btn btn-primary" style={{ padding: '8px 20px' }}>
            <span>Generate Summary</span>
          </button>
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <Loader2 size={28} className="spin-animate" style={{ color: '#ffffff', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '0.98rem', color: '#fff' }}>Analyzing repository...</h3>
        </div>
      )}

      {summary && !loading && (
        <div className="card markdown-body" style={{ padding: '24px' }}>
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

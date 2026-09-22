import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
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
      setError(err.message || 'Failed to generate repository summary.');
    } finally {
      setLoading(false);
    }
  };

  if (!activeRepo) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <h3 className="empty-title">No Repository Loaded</h3>
        <p className="empty-desc">
          Clone or select a repository from the sidebar to generate a comprehensive architectural and tech stack summary.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>📋 Repository Overview & Summary</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            AI-powered architecture analysis, folder organization, and tech stack detection for {activeRepo.name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {summary && (
            <button
              onClick={() => handleGenerate(true)}
              disabled={loading}
              className="btn btn-secondary"
            >
              <RefreshCw size={15} className={loading ? 'spin-animate' : ''} />
              <span>Regenerate</span>
            </button>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="card" style={{ background: 'rgba(248,81,73,0.1)', borderColor: 'rgba(248,81,73,0.3)', color: 'var(--accent-red)' }}>
          {error}
        </div>
      )}

      {/* Action / Content */}
      {!summary && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Sparkles size={36} style={{ color: 'var(--accent-blue)', marginBottom: '14px' }} />
          <h3 style={{ fontSize: '1.15rem', marginBottom: '8px', color: '#fff' }}>Generate Summary for {activeRepo.name}</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 20px' }}>
            Analyzes folder trees, entry points, configuration files, and core modules to produce an executive overview.
          </p>
          <button onClick={() => handleGenerate(false)} className="btn btn-primary" style={{ padding: '10px 24px' }}>
            <Sparkles size={16} />
            <span>Generate Summary</span>
          </button>
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Loader2 size={36} className="spin-animate" style={{ color: 'var(--accent-blue)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Analyzing repository components...</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Scanning folder tree, dependencies, entry points, and source code.
          </p>
        </div>
      )}

      {summary && !loading && (
        <div className="card markdown-body" style={{ padding: '28px', background: 'var(--bg-secondary)' }}>
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

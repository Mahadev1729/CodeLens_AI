import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Download, 
  Eye, 
  Code2, 
  Loader2 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../../services/api';

export default function ReadmeTab({
  activeRepo,
  groqApiKey,
  selectedModel,
  cachedReadme,
  onReadmeGenerated,
}) {
  const [readme, setReadme] = useState(cachedReadme || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('preview'); // 'preview' | 'raw'

  useEffect(() => {
    if (cachedReadme) {
      setReadme(cachedReadme);
    }
  }, [cachedReadme]);

  const handleGenerate = async (regenerate = false) => {
    if (!activeRepo?.path) return;
    setLoading(true);
    setError('');

    try {
      const res = await api.generateReadme(
        activeRepo.path,
        activeRepo.name,
        groqApiKey,
        selectedModel,
        regenerate
      );
      setReadme(res.readme);
      if (onReadmeGenerated) {
        onReadmeGenerated(res.readme);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate README.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!readme) return;
    const blob = new Blob([readme], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'README.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!activeRepo) {
    return (
      <div className="empty-state">
        <h3 className="empty-title">No Repository Loaded</h3>
        <p className="empty-desc">
          Select or clone a repository from the sidebar to generate documentation.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>Documentation</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            README generator for {activeRepo.name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {readme && (
            <>
              <button onClick={handleDownload} className="btn btn-outline" style={{ padding: '5px 12px', fontSize: '0.8rem' }}>
                <Download size={13} />
                <span>Download</span>
              </button>
              <button
                onClick={() => handleGenerate(true)}
                disabled={loading}
                className="btn btn-secondary"
                style={{ padding: '5px 12px', fontSize: '0.8rem' }}
              >
                <RefreshCw size={13} className={loading ? 'spin-animate' : ''} />
                <span>Regenerate</span>
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.3)', color: '#fca5a5', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Initial Trigger */}
      {!readme && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '6px', color: '#fff' }}>Generate README</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 16px' }}>
            Creates documentation including overview, setup, and usage guidelines.
          </p>
          <button onClick={() => handleGenerate(false)} className="btn btn-primary" style={{ padding: '8px 20px' }}>
            <span>Generate README</span>
          </button>
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <Loader2 size={28} className="spin-animate" style={{ color: '#ffffff', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '0.98rem', color: '#fff' }}>Drafting documentation...</h3>
        </div>
      )}

      {readme && !loading && (
        <>
          {/* View mode toggle */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setViewMode('preview')}
              className={`btn ${viewMode === 'preview' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '5px 12px', fontSize: '0.8rem' }}
            >
              <Eye size={13} />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`btn ${viewMode === 'raw' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '5px 12px', fontSize: '0.8rem' }}
            >
              <Code2 size={13} />
              <span>Markdown</span>
            </button>
          </div>

          {viewMode === 'preview' ? (
            <div className="card markdown-body" style={{ padding: '24px' }}>
              <ReactMarkdown>{readme}</ReactMarkdown>
            </div>
          ) : (
            <div className="card" style={{ padding: '16px' }}>
              <pre
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                }}
              >
                {readme}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}

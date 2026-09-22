import React, { useState, useEffect } from 'react';
import { 
  FileEdit, 
  RefreshCw, 
  Download, 
  Eye, 
  Code2, 
  Loader2, 
  Sparkles 
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
        <div className="empty-icon">📝</div>
        <h3 className="empty-title">No Repository Loaded</h3>
        <p className="empty-desc">
          Clone or select a repository from the sidebar to automatically generate a professional README.md document.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>📝 README.md Documentation Generator</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Auto-generate comprehensive markdown documentation with installation, architecture, and usage guides
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {readme && (
            <>
              <button onClick={handleDownload} className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                <Download size={14} />
                <span>Download README.md</span>
              </button>
              <button
                onClick={() => handleGenerate(true)}
                disabled={loading}
                className="btn btn-secondary"
              >
                <RefreshCw size={15} className={loading ? 'spin-animate' : ''} />
                <span>Regenerate</span>
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: 'rgba(248,81,73,0.1)', borderColor: 'rgba(248,81,73,0.3)', color: 'var(--accent-red)' }}>
          {error}
        </div>
      )}

      {/* Initial Trigger */}
      {!readme && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <FileEdit size={36} style={{ color: 'var(--accent-purple)', marginBottom: '14px' }} />
          <h3 style={{ fontSize: '1.15rem', marginBottom: '8px', color: '#fff' }}>Generate README for {activeRepo.name}</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 20px' }}>
            Builds a comprehensive, developer-ready README including badges, project structure, quick start, API reference, and tech stack.
          </p>
          <button onClick={() => handleGenerate(false)} className="btn btn-primary" style={{ padding: '10px 24px' }}>
            <Sparkles size={16} />
            <span>Generate README</span>
          </button>
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Loader2 size={36} className="spin-animate" style={{ color: 'var(--accent-blue)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Drafting README documentation...</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Synthesizing features, setup scripts, architecture layout, and dependencies.
          </p>
        </div>
      )}

      {readme && !loading && (
        <>
          {/* View mode toggle */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setViewMode('preview')}
              className={`btn ${viewMode === 'preview' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
            >
              <Eye size={14} />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`btn ${viewMode === 'raw' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
            >
              <Code2 size={14} />
              <span>Raw Markdown</span>
            </button>
          </div>

          {viewMode === 'preview' ? (
            <div className="card markdown-body" style={{ padding: '28px', background: 'var(--bg-secondary)' }}>
              <ReactMarkdown>{readme}</ReactMarkdown>
            </div>
          ) : (
            <div className="card" style={{ padding: '16px', background: 'var(--bg-secondary)' }}>
              <pre
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
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

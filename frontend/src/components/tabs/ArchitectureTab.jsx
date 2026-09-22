import React, { useState, useEffect, useRef } from 'react';
import { 
  GitFork, 
  RefreshCw, 
  Loader2, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles,
  Maximize2
} from 'lucide-react';
import mermaid from 'mermaid';
import { api } from '../../services/api';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#58a6ff',
    primaryTextColor: '#fff',
    primaryBorderColor: '#388bfd',
    lineColor: '#58a6ff',
    secondaryColor: '#161b22',
    tertiaryColor: '#0d1117',
    fontSize: '14px',
  },
  securityLevel: 'loose',
});

export default function ArchitectureTab({
  activeRepo,
  groqApiKey,
  selectedModel,
  cachedArch,
  onArchGenerated,
}) {
  const [data, setData] = useState(cachedArch || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [svgContent, setSvgContent] = useState('');
  const renderContainerRef = useRef(null);

  useEffect(() => {
    if (cachedArch) {
      setData(cachedArch);
    }
  }, [cachedArch]);

  useEffect(() => {
    if (data?.diagram_code) {
      renderDiagram(data.diagram_code);
    }
  }, [data?.diagram_code]);

  const renderDiagram = async (code) => {
    try {
      const cleanCode = code.trim();
      const uniqueId = `mermaid-svg-${Date.now()}`;
      const { svg } = await mermaid.render(uniqueId, cleanCode);
      setSvgContent(svg);
    } catch (err) {
      console.error('Mermaid render error:', err);
      setSvgContent('');
    }
  };

  const handleGenerate = async (regenerate = false) => {
    if (!activeRepo?.path) return;
    setLoading(true);
    setError('');

    try {
      const res = await api.generateArchitecture(
        activeRepo.path,
        activeRepo.name,
        groqApiKey,
        selectedModel,
        regenerate
      );
      setData(res);
      if (onArchGenerated) {
        onArchGenerated(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate architecture diagram.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!data?.diagram_code) return;
    navigator.clipboard.writeText(`\`\`\`mermaid\n${data.diagram_code}\n\`\`\``);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activeRepo) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🏗️</div>
        <h3 className="empty-title">No Repository Loaded</h3>
        <p className="empty-desc">
          Clone or select a repository from the sidebar to generate interactive Mermaid system architecture diagrams.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>🏗️ System Architecture Diagram</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Interactive Mermaid flowchart and component relationship model for {activeRepo.name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {data && (
            <>
              <button onClick={handleCopyCode} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                {copied ? <Check size={14} style={{ color: 'var(--accent-green)' }} /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
              <a
                href="https://mermaid.live"
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline"
                style={{ padding: '6px 12px', fontSize: '0.85rem', textDecoration: 'none' }}
              >
                <ExternalLink size={14} />
                <span>Live Editor</span>
              </a>
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
      {!data && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <GitFork size={36} style={{ color: 'var(--accent-cyan)', marginBottom: '14px' }} />
          <h3 style={{ fontSize: '1.15rem', marginBottom: '8px', color: '#fff' }}>Generate Architecture Diagram</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 20px' }}>
            Analyzes modules, dependencies, data flows, and subgraphs to produce a visual Mermaid architecture diagram.
          </p>
          <button onClick={() => handleGenerate(false)} className="btn btn-primary" style={{ padding: '10px 24px' }}>
            <Sparkles size={16} />
            <span>Generate Diagram</span>
          </button>
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Loader2 size={36} className="spin-animate" style={{ color: 'var(--accent-blue)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Modeling component architecture...</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Extracting modules, relationships, and generating top-down data flow diagram.
          </p>
        </div>
      )}

      {/* Diagram Render & Notes */}
      {data && !loading && (
        <>
          {/* Live SVG Diagram */}
          <div className="mermaid-viewer">
            {svgContent ? (
              <div
                dangerouslySetInnerHTML={{ __html: svgContent }}
                style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
              />
            ) : (
              <pre style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', overflowX: 'auto' }}>
                {data.diagram_code || data.raw}
              </pre>
            )}
          </div>

          {/* Architecture Notes */}
          {data.notes && (
            <div className="card" style={{ padding: '20px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                📝 Architecture Notes
              </h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {data.notes}
              </p>
            </div>
          )}

          {/* Raw Code Accordion */}
          {data.diagram_code && (
            <details className="card" style={{ padding: '14px', cursor: 'pointer' }}>
              <summary style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                View Raw Mermaid Diagram Syntax
              </summary>
              <pre
                style={{
                  background: 'var(--bg-primary)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  marginTop: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  overflowX: 'auto',
                  color: 'var(--text-primary)',
                }}
              >
                {data.diagram_code}
              </pre>
            </details>
          )}
        </>
      )}
    </div>
  );
}

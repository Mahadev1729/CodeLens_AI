import React, { useState, useEffect } from 'react';
import { 
  GitFork, 
  RefreshCw, 
  Loader2, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles,
  Download,
  Code2,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertTriangle,
  Layers
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
  const [selectedFormat, setSelectedFormat] = useState('python'); // 'python' | 'mermaid'
  const [data, setData] = useState(cachedArch || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [svgContent, setSvgContent] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    if (cachedArch) {
      setData(cachedArch);
      if (cachedArch.format) {
        setSelectedFormat(cachedArch.format);
      }
    }
  }, [cachedArch]);

  useEffect(() => {
    if (data?.format === 'mermaid' && data?.diagram_code) {
      renderMermaidDiagram(data.diagram_code);
    }
  }, [data?.diagram_code, data?.format]);

  const renderMermaidDiagram = async (code) => {
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

  const handleGenerate = async (regenerate = false, formatToUse = selectedFormat) => {
    if (!activeRepo?.path) return;
    setLoading(true);
    setError('');

    try {
      const res = await api.generateArchitecture(
        activeRepo.path,
        activeRepo.name,
        groqApiKey,
        selectedModel,
        regenerate,
        formatToUse
      );
      setData(res);
      setZoomLevel(1);
      if (onArchGenerated) {
        onArchGenerated(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate architecture diagram.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormatChange = (newFormat) => {
    setSelectedFormat(newFormat);
    if (data?.format !== newFormat) {
      handleGenerate(false, newFormat);
    }
  };

  const handleCopyCode = () => {
    if (!data?.diagram_code) return;
    const prefix = data.format === 'mermaid' ? '```mermaid' : '```python';
    navigator.clipboard.writeText(`${prefix}\n${data.diagram_code}\n\`\`\``);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = () => {
    if (!data?.image_base64) return;
    const a = document.createElement('a');
    a.href = data.image_base64;
    a.download = `${activeRepo.name}_architecture.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!activeRepo) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🏗️</div>
        <h3 className="empty-title">No Repository Loaded</h3>
        <p className="empty-desc">
          Clone or select a repository from the sidebar to generate architecture diagrams.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🏗️ System Architecture</span>
            <span className="brand-badge" style={{ fontSize: '0.72rem' }}>
              {selectedFormat === 'python' ? '🐍 Python Diagrams (Diagram-as-Code)' : '📊 Mermaid.js'}
            </span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {selectedFormat === 'python'
              ? 'Multi-layer system architecture with official cloud & framework icons'
              : 'Interactive flowchart illustrating module dependencies and data flows'}
          </p>
        </div>

        {/* Engine Switcher & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Format Toggle */}
          <div className="auth-tabs" style={{ padding: '3px', margin: 0 }}>
            <button
              onClick={() => handleFormatChange('python')}
              className={`auth-tab-btn ${selectedFormat === 'python' ? 'active' : ''}`}
              style={{ padding: '5px 12px', fontSize: '0.8rem' }}
            >
              🐍 Python Diagrams
            </button>
            <button
              onClick={() => handleFormatChange('mermaid')}
              className={`auth-tab-btn ${selectedFormat === 'mermaid' ? 'active' : ''}`}
              style={{ padding: '5px 12px', fontSize: '0.8rem' }}
            >
              📊 Mermaid
            </button>
          </div>

          {data && (
            <>
              {data.image_base64 && (
                <button
                  onClick={handleDownloadImage}
                  className="btn btn-outline"
                  style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                  title="Download Diagram PNG"
                >
                  <Download size={14} />
                  <span>Download PNG</span>
                </button>
              )}

              <button
                onClick={() => setShowCode(!showCode)}
                className={`btn ${showCode ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              >
                <Code2 size={14} />
                <span>{showCode ? 'Hide Code' : 'View Code'}</span>
              </button>

              <button
                onClick={handleCopyCode}
                className="btn btn-outline"
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              >
                {copied ? <Check size={14} style={{ color: 'var(--accent-green)' }} /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              {data.format === 'mermaid' && (
                <a
                  href="https://mermaid.live"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline"
                  style={{ padding: '6px 12px', fontSize: '0.82rem', textDecoration: 'none' }}
                >
                  <ExternalLink size={14} />
                  <span>Live Editor</span>
                </a>
              )}

              <button
                onClick={() => handleGenerate(true)}
                disabled={loading}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              >
                <RefreshCw size={14} className={loading ? 'spin-animate' : ''} />
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

      {/* Initial Trigger Screen */}
      {!data && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(88, 166, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={26} style={{ color: 'var(--accent-blue)' }} />
            </div>
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: '#fff' }}>
            Generate System Architecture
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto 24px', lineHeight: 1.5 }}>
            Synthesizes your codebase structure, packages, data stores, and framework layers into a clean architectural map with <strong>Python Diagram-as-Code</strong> or <strong>Mermaid</strong>.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button onClick={() => handleGenerate(false, 'python')} className="btn btn-primary" style={{ padding: '10px 24px' }}>
              <Sparkles size={16} />
              <span>Generate Python Diagrams</span>
            </button>
            <button onClick={() => handleGenerate(false, 'mermaid')} className="btn btn-secondary" style={{ padding: '10px 20px' }}>
              <span>Generate Mermaid</span>
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Loader2 size={36} className="spin-animate" style={{ color: 'var(--accent-blue)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>
            {selectedFormat === 'python'
              ? 'Generating Python Diagram-as-Code & Rendering Image...'
              : 'Synthesizing Mermaid Flowchart...'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Extracting modules, services, database tables, and connection pipelines.
          </p>
        </div>
      )}

      {/* Main Diagram Display */}
      {data && !loading && (
        <>
          {/* Python Diagram Renderer */}
          {data.format === 'python' ? (
            <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Image Controls */}
              {data.image_base64 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => setZoomLevel((prev) => Math.max(0.6, prev - 0.2))}
                    className="btn btn-outline"
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    title="Zoom Out"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '42px', textAlign: 'center' }}>
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((prev) => Math.min(2.5, prev + 0.2))}
                    className="btn btn-outline"
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    title="Zoom In"
                  >
                    <ZoomIn size={13} />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="btn btn-outline"
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    title="Reset Zoom"
                  >
                    Reset
                  </button>
                </div>
              )}

              {/* Rendered Image */}
              {data.image_base64 ? (
                <div
                  style={{
                    overflow: 'auto',
                    maxHeight: '650px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <img
                    src={data.image_base64}
                    alt={`${activeRepo.name} Architecture Diagram`}
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'top center',
                      transition: 'transform 0.15s ease-out',
                      maxWidth: zoomLevel <= 1 ? '100%' : 'none',
                      borderRadius: '8px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                    }}
                  />
                </div>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
                  <AlertTriangle size={32} style={{ color: 'var(--accent-orange)', marginBottom: '10px' }} />
                  <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '6px' }}>Graphviz Runtime Notice</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', maxWidth: '520px', margin: '0 auto 14px', lineHeight: 1.5 }}>
                    The Python Diagram code was generated successfully! To render PNG images directly on your local system, install Graphviz (<code>winget install Graphviz</code> on Windows or <code>apt-get install graphviz</code> on Linux).
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Click <strong>View Code</strong> above to run or copy the Python script.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Mermaid Diagram Renderer */
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
          )}

          {/* Architecture Notes */}
          {data.notes && (
            <div className="card" style={{ padding: '20px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
                📝 Architectural Breakdown
              </h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {data.notes}
              </p>
            </div>
          )}

          {/* Code Viewer Panel */}
          {showCode && data.diagram_code && (
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {data.format === 'python' ? '🐍 Python diagrams Source Code' : '📊 Mermaid Syntax'}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="btn btn-outline"
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                >
                  {copied ? <Check size={12} style={{ color: 'var(--accent-green)' }} /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre
                style={{
                  background: 'var(--bg-primary)',
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  overflowX: 'auto',
                  color: '#e6edf3',
                  lineHeight: 1.5,
                  border: '1px solid var(--border-color)',
                }}
              >
                {data.diagram_code}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}


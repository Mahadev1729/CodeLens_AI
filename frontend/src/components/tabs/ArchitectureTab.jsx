import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Loader2, 
  Copy, 
  Check, 
  Download, 
  Code2, 
  ZoomIn, 
  ZoomOut, 
  AlertTriangle 
} from 'lucide-react';
import mermaid from 'mermaid';
import { api } from '../../services/api';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#262626',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#52525b',
    lineColor: '#ffffff',
    secondaryColor: '#141414',
    tertiaryColor: '#0a0a0a',
    fontSize: '13px',
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
        <h3 className="empty-title">No Repository Loaded</h3>
        <p className="empty-desc">
          Select or clone a repository from the sidebar to view architecture.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
            System Architecture
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Component and dependency mapping for {activeRepo.name}
          </p>
        </div>

        {/* Engine Switcher & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Format Toggle */}
          <div className="auth-tabs" style={{ padding: '2px', margin: 0 }}>
            <button
              onClick={() => handleFormatChange('python')}
              className={`auth-tab-btn ${selectedFormat === 'python' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
            >
              Diagram
            </button>
            <button
              onClick={() => handleFormatChange('mermaid')}
              className={`auth-tab-btn ${selectedFormat === 'mermaid' ? 'active' : ''}`}
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
            >
              Flowchart
            </button>
          </div>

          {data && (
            <>
              {data.image_base64 && (
                <button
                  onClick={handleDownloadImage}
                  className="btn btn-outline"
                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                  title="Download PNG"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
              )}

              <button
                onClick={() => setShowCode(!showCode)}
                className="btn btn-outline"
                style={{ padding: '5px 10px', fontSize: '0.78rem' }}
              >
                <Code2 size={13} />
                <span>{showCode ? 'Hide Code' : 'Code'}</span>
              </button>

              <button
                onClick={handleCopyCode}
                className="btn btn-outline"
                style={{ padding: '5px 10px', fontSize: '0.78rem' }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={() => handleGenerate(true)}
                disabled={loading}
                className="btn btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.78rem' }}
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

      {/* Initial Trigger Screen */}
      {!data && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '6px', color: '#fff' }}>
            Generate Architecture
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 18px', lineHeight: 1.5 }}>
            Synthesizes codebase modules, services, and connections into a visual map.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <button onClick={() => handleGenerate(false, 'python')} className="btn btn-primary" style={{ padding: '8px 18px' }}>
              <span>Generate Diagram</span>
            </button>
            <button onClick={() => handleGenerate(false, 'mermaid')} className="btn btn-secondary" style={{ padding: '8px 18px' }}>
              <span>Generate Flowchart</span>
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <Loader2 size={28} className="spin-animate" style={{ color: '#ffffff', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '0.98rem', color: '#fff' }}>
            Generating architecture diagram...
          </h3>
        </div>
      )}

      {/* Main Diagram Display */}
      {data && !loading && (
        <>
          {data.format === 'python' ? (
            <div className="card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data.image_base64 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' }}>
                  <button
                    onClick={() => setZoomLevel((prev) => Math.max(0.6, prev - 0.2))}
                    className="btn btn-outline"
                    style={{ padding: '3px 6px', fontSize: '0.72rem' }}
                    title="Zoom Out"
                  >
                    <ZoomOut size={12} />
                  </button>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: '36px', textAlign: 'center' }}>
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((prev) => Math.min(2.5, prev + 0.2))}
                    className="btn btn-outline"
                    style={{ padding: '3px 6px', fontSize: '0.72rem' }}
                    title="Zoom In"
                  >
                    <ZoomIn size={12} />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="btn btn-outline"
                    style={{ padding: '3px 6px', fontSize: '0.72rem' }}
                  >
                    Reset
                  </button>
                </div>
              )}

              {data.image_base64 ? (
                <div
                  style={{
                    overflow: 'auto',
                    maxHeight: '600px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: '#000000',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
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
                      borderRadius: '6px',
                    }}
                  />
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                    Diagram code generated. View or copy code above.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="mermaid-viewer">
              {svgContent ? (
                <div
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                  style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                />
              ) : (
                <pre style={{ color: '#ffffff', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', overflowX: 'auto' }}>
                  {data.diagram_code || data.raw}
                </pre>
              )}
            </div>
          )}

          {data.notes && (
            <div className="card" style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>
                Breakdown
              </h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {data.notes}
              </p>
            </div>
          )}

          {showCode && data.diagram_code && (
            <div className="card" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Diagram Code
                </span>
                <button
                  onClick={handleCopyCode}
                  className="btn btn-outline"
                  style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre
                style={{
                  background: '#000000',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  overflowX: 'auto',
                  color: '#e4e4e7',
                  lineHeight: 1.5,
                  border: '1px solid var(--border-color)',
                  margin: 0,
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

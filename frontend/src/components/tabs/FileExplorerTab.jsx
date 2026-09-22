import React, { useState, useEffect } from 'react';
import { 
  FolderTree, 
  FileCode, 
  Search, 
  Filter, 
  Sparkles, 
  Loader2, 
  FileText, 
  Bot, 
  Code,
  Copy,
  Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../../services/api';

export default function FileExplorerTab({
  activeRepo,
  groqApiKey,
  selectedModel,
  selectedFileFromNav,
}) {
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedExt, setSelectedExt] = useState('All');
  const [activeFile, setActiveFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [viewTab, setViewTab] = useState('code'); // 'code' | 'explain'
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (activeRepo?.path) {
      loadFiles();
    }
  }, [activeRepo?.path]);

  useEffect(() => {
    if (selectedFileFromNav && files.length > 0) {
      const match = files.find((f) => f.path === selectedFileFromNav);
      if (match) {
        handleSelectFile(match);
      }
    }
  }, [selectedFileFromNav, files]);

  const loadFiles = async () => {
    try {
      const res = await api.getRepoFiles(activeRepo.path);
      setFiles(res.files || []);
      if (res.files && res.files.length > 0 && !activeFile) {
        handleSelectFile(res.files[0]);
      }
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  };

  const handleSelectFile = async (fileObj) => {
    setActiveFile(fileObj);
    setContentLoading(true);
    setExplanation(null);
    setViewTab('code');

    try {
      const res = await api.getFileContent(fileObj.path, activeRepo.path);
      setFileContent(res);
    } catch (err) {
      console.error('Failed to read file:', err);
      setFileContent({
        path: fileObj.path,
        filename: fileObj.filename,
        content: `Could not load file content: ${err.message}`,
        language: 'text',
        lines: 0,
        size_str: '0 KB',
      });
    } finally {
      setContentLoading(false);
    }
  };

  const handleExplainFile = async () => {
    if (!fileContent?.content || !activeFile) return;
    setExplaining(true);
    setViewTab('explain');

    try {
      const res = await api.explainFile(
        activeFile.path,
        fileContent.content,
        activeRepo.name,
        groqApiKey,
        selectedModel
      );
      setExplanation(res.explanation);
    } catch (err) {
      setExplanation(`⚠️ **Error:** Failed to explain file: ${err.message}`);
    } finally {
      setExplaining(false);
    }
  };

  const handleCopyCode = () => {
    if (!fileContent?.content) return;
    navigator.clipboard.writeText(fileContent.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activeRepo) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📁</div>
        <h3 className="empty-title">No Repository Loaded</h3>
        <p className="empty-desc">
          Clone or select a repository from the sidebar to explore and analyze files.
        </p>
      </div>
    );
  }

  const extensions = ['All', ...Array.from(new Set(files.map((f) => f.extension))).filter(Boolean).sort()];

  const filteredFiles = files.filter((f) => {
    const matchesSearch = !search || f.path.toLowerCase().includes(search.toLowerCase());
    const matchesExt = selectedExt === 'All' || f.extension.toLowerCase() === selectedExt.toLowerCase();
    return matchesSearch && matchesExt;
  });

  return (
    <div className="file-explorer-grid">
      {/* Left: Search & File Tree */}
      <div className="file-tree-pane">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <FolderTree size={18} style={{ color: 'var(--accent-blue)' }} />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>Files ({filteredFiles.length})</h3>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="input-field"
            style={{ width: '100%', paddingLeft: '32px', fontSize: '0.85rem' }}
          />
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
        </div>

        {/* Extension Filter */}
        <select
          value={selectedExt}
          onChange={(e) => setSelectedExt(e.target.value)}
          className="select-field"
          style={{ fontSize: '0.82rem', padding: '6px 10px' }}
        >
          {extensions.map((ext) => (
            <option key={ext} value={ext}>
              {ext === 'All' ? 'All File Types' : ext}
            </option>
          ))}
        </select>

        {/* File items list */}
        <div className="file-list">
          {filteredFiles.map((file, idx) => {
            const isSelected = activeFile?.path === file.path;
            return (
              <button
                key={idx}
                onClick={() => handleSelectFile(file)}
                className={`file-item-btn ${isSelected ? 'active' : ''}`}
                title={file.path}
              >
                <FileCode size={14} style={{ flexShrink: 0, color: isSelected ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.path}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Code Viewer & AI Explainer */}
      <div className="code-viewer-pane">
        {activeFile ? (
          <>
            {/* Header */}
            <div className="code-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={18} style={{ color: 'var(--accent-blue)' }} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>{activeFile.path}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {fileContent?.lines || 0} lines · {fileContent?.size_str || '0 KB'} · {fileContent?.language || 'text'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setViewTab('code')}
                  className={`btn ${viewTab === 'code' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  <Code size={14} />
                  <span>Code</span>
                </button>

                <button
                  onClick={handleExplainFile}
                  disabled={explaining}
                  className={`btn ${viewTab === 'explain' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  {explaining ? (
                    <Loader2 size={14} className="spin-animate" />
                  ) : (
                    <Bot size={14} style={{ color: 'var(--accent-purple)' }} />
                  )}
                  <span>Explain File</span>
                </button>

                <button
                  onClick={handleCopyCode}
                  className="btn btn-outline"
                  style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                  title="Copy code"
                >
                  {copied ? <Check size={14} style={{ color: 'var(--accent-green)' }} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="code-body">
              {contentLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', color: 'var(--text-secondary)' }}>
                  <Loader2 size={24} className="spin-animate" />
                  <span>Loading file content...</span>
                </div>
              ) : viewTab === 'code' ? (
                <pre style={{ margin: 0, color: '#e6edf3', lineHeight: 1.6 }}>
                  <code>{fileContent?.content}</code>
                </pre>
              ) : (
                <div style={{ padding: '10px', maxWidth: '800px' }}>
                  {explaining ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', padding: '20px 0' }}>
                      <Loader2 size={20} className="spin-animate" />
                      <span>AI analyzing purpose, components, and patterns of {activeFile.filename}...</span>
                    </div>
                  ) : explanation ? (
                    <div className="markdown-body">
                      <ReactMarkdown>{explanation}</ReactMarkdown>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)' }}>Click "Explain File" to generate AI analysis.</p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">👈</div>
            <h3 className="empty-title">Select a File</h3>
            <p className="empty-desc">Choose any file from the file explorer tree to view code and AI explanation.</p>
          </div>
        )}
      </div>
    </div>
  );
}

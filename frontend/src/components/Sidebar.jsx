import React, { useState } from 'react';
import { 
  DownloadCloud, 
  GitBranch, 
  FileCode, 
  FolderGit2, 
  Loader2, 
  X,
  Layers
} from 'lucide-react';

export default function Sidebar({
  activeRepo,
  localRepos,
  onSelectRepo,
  onCloneRepo,
  onBuildKb,
  isCloning,
  isBuildingKb,
  isOpen = false,
  onClose,
}) {
  const [repoUrl, setRepoUrl] = useState('');

  const handleClone = (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    onCloneRepo(repoUrl.trim());
  };

  const stats = activeRepo?.stats;
  const info = activeRepo?.info;
  const extCounts = stats?.extension_counts || {};
  const topExts = Object.entries(extCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      {/* Mobile Drawer Header */}
      <div className="sidebar-mobile-header">
        <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#ffffff' }}>
          Workspace
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="btn btn-outline"
            style={{ padding: '4px', borderRadius: '50%' }}
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 1. Clone New Repo */}
      <div className="sidebar-section">
        <div className="section-title">
          <DownloadCloud size={14} />
          <span>Clone Repository</span>
        </div>
        <form onSubmit={handleClone} className="input-group">
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/user/repo"
            className="input-field"
            disabled={isCloning}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
            <button
              type="submit"
              disabled={isCloning || !repoUrl.trim()}
              className="btn btn-primary"
            >
              {isCloning ? (
                <>
                  <Loader2 size={14} className="spin-animate" />
                  <span>Cloning...</span>
                </>
              ) : (
                <span>Clone</span>
              )}
            </button>

            <button
              type="button"
              onClick={onBuildKb}
              disabled={!activeRepo || isBuildingKb}
              className="btn btn-secondary"
            >
              {isBuildingKb ? (
                <>
                  <Loader2 size={14} className="spin-animate" />
                  <span>Indexing...</span>
                </>
              ) : (
                <span>Index</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Switch Local Repos */}
      {localRepos && localRepos.length > 0 && (
        <div className="sidebar-section">
          <div className="section-title">
            <FolderGit2 size={14} />
            <span>Repositories</span>
          </div>
          <select
            value={activeRepo?.name || ''}
            onChange={(e) => {
              const selected = localRepos.find((r) => r.name === e.target.value);
              if (selected) onSelectRepo(selected);
            }}
            className="select-field"
          >
            <option value="" disabled>Select repository...</option>
            {localRepos.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name} {r.knowledge_base_built ? '✓' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 3. Repo Status & Info */}
      {activeRepo ? (
        <>
          <div className="sidebar-section">
            <div className="section-title">
              <GitBranch size={14} />
              <span>Details</span>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Branch</span>
                <strong style={{ color: '#ffffff' }}>{info?.branch || 'N/A'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Commit</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {info?.commit_hash ? info.commit_hash.slice(0, 7) : 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                {activeRepo.knowledgeBaseBuilt ? (
                  <span className="status-badge status-ready">Indexed</span>
                ) : (
                  <span className="status-badge status-pending">Not Indexed</span>
                )}
              </div>
            </div>
          </div>

          {/* 4. Repo Statistics */}
          {stats && (
            <div className="sidebar-section">
              <div className="section-title">
                <FileCode size={14} />
                <span>Overview</span>
              </div>
              <div className="metric-grid">
                <div className="metric-card">
                  <div className="metric-label">Files</div>
                  <div className="metric-val">{stats.total_files || 0}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Lines</div>
                  <div className="metric-val">{(stats.total_lines || 0).toLocaleString()}</div>
                </div>
              </div>

              {topExts.length > 0 && (
                <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {topExts.map(([ext, count]) => (
                    <span
                      key={ext}
                      className="source-badge"
                    >
                      {ext || 'other'}: {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="sidebar-section">
          <div className="card" style={{ textAlign: 'center', padding: '20px 14px' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Clone or select a repository to get started.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}

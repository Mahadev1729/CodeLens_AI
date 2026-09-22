import React, { useState } from 'react';
import { 
  DownloadCloud, 
  Zap, 
  GitBranch, 
  FileCode, 
  Hash, 
  FolderGit2, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({
  activeRepo,
  localRepos,
  onSelectRepo,
  onCloneRepo,
  onBuildKb,
  isCloning,
  isBuildingKb,
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
    .slice(0, 6);

  return (
    <aside className="sidebar">
      {/* 1. Clone New Repo */}
      <div className="sidebar-section">
        <div className="section-title">
          <DownloadCloud size={16} />
          <span>Clone GitHub Repo</span>
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
                  <Loader2 size={16} className="spin-animate" />
                  <span>Cloning...</span>
                </>
              ) : (
                <>
                  <DownloadCloud size={16} />
                  <span>Clone</span>
                </>
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
                  <Loader2 size={16} className="spin-animate" />
                  <span>Indexing...</span>
                </>
              ) : (
                <>
                  <Zap size={16} style={{ color: 'var(--accent-orange)' }} />
                  <span>Build KB</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Switch Local Repos */}
      {localRepos && localRepos.length > 0 && (
        <div className="sidebar-section">
          <div className="section-title">
            <FolderGit2 size={16} />
            <span>Local Repositories</span>
          </div>
          <select
            value={activeRepo?.name || ''}
            onChange={(e) => {
              const selected = localRepos.find((r) => r.name === e.target.value);
              if (selected) onSelectRepo(selected);
            }}
            className="select-field"
          >
            <option value="" disabled>Select a repository...</option>
            {localRepos.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name} {r.knowledge_base_built ? '⚡ (KB Ready)' : ''}
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
              <GitBranch size={16} />
              <span>Repository Details</span>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Branch:</span>
                <strong>{info?.branch || 'N/A'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Commit:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{info?.commit_hash || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Knowledge Base:</span>
                {activeRepo.knowledgeBaseBuilt ? (
                  <span className="status-badge status-ready">⚡ Ready</span>
                ) : (
                  <span className="status-badge status-pending">○ Not Built</span>
                )}
              </div>
            </div>
          </div>

          {/* 4. Repo Statistics */}
          {stats && (
            <div className="sidebar-section">
              <div className="section-title">
                <FileCode size={16} />
                <span>Code Statistics</span>
              </div>
              <div className="metric-grid">
                <div className="metric-card">
                  <div className="metric-label">Total Files</div>
                  <div className="metric-val">{stats.total_files || 0}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Total Lines</div>
                  <div className="metric-val">{(stats.total_lines || 0).toLocaleString()}</div>
                </div>
              </div>

              {/* Language breakdown */}
              {topExts.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Language Distribution
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {topExts.map(([ext, count]) => (
                      <span
                        key={ext}
                        className="source-badge"
                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                      >
                        {ext || 'other'}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="sidebar-section">
          <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
            <FolderGit2 size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Clone a GitHub repository or choose a local one above to begin.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Loader2, 
  Search,
  ShieldCheck
} from 'lucide-react';
import { api } from '../../services/api';

export default function BugFinderTab({
  activeRepo,
  groqApiKey,
  selectedModel,
  cachedBugReport,
  onBugsAnalyzed,
}) {
  const [data, setData] = useState(cachedBugReport || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (cachedBugReport) {
      setData(cachedBugReport);
    }
  }, [cachedBugReport]);

  const handleAnalyze = async (regenerate = false) => {
    if (!activeRepo?.path) return;
    setLoading(true);
    setError('');

    try {
      const res = await api.findBugs(
        activeRepo.path,
        activeRepo.name,
        groqApiKey,
        selectedModel,
        regenerate
      );
      setData(res);
      if (onBugsAnalyzed) {
        onBugsAnalyzed(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze bugs and code quality.');
    } finally {
      setLoading(false);
    }
  };

  if (!activeRepo) {
    return (
      <div className="empty-state">
        <h3 className="empty-title">No Repository Loaded</h3>
        <p className="empty-desc">
          Select or clone a repository from the sidebar to scan for issues and vulnerabilities.
        </p>
      </div>
    );
  }

  const issues = data?.issues || [];
  const counts = data?.counts || { total: 0, high: 0, medium: 0, low: 0 };

  const filteredIssues = issues.filter((issue) => {
    const matchesSeverity =
      filterSeverity === 'all' ||
      (issue.severity || '').toLowerCase() === filterSeverity.toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      (issue.title || '').toLowerCase().includes(q) ||
      (issue.file || '').toLowerCase().includes(q) ||
      (issue.category || '').toLowerCase().includes(q);
    return matchesSeverity && matchesSearch;
  });

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>Bug Finder</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Code analysis and vulnerability report for {activeRepo.name}
          </p>
        </div>
        <div>
          {data && (
            <button
              onClick={() => handleAnalyze(true)}
              disabled={loading}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.82rem' }}
            >
              <RefreshCw size={13} className={loading ? 'spin-animate' : ''} />
              <span>Re-Analyze</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.3)', color: '#fca5a5', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Trigger Button if not analyzed */}
      {!data && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '6px', color: '#fff' }}>Start Code Audit</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 16px' }}>
            Inspects logic, exceptions, security patterns, and resource management.
          </p>
          <button onClick={() => handleAnalyze(false)} className="btn btn-primary" style={{ padding: '8px 20px' }}>
            <span>Run Analysis</span>
          </button>
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <Loader2 size={28} className="spin-animate" style={{ color: '#ffffff', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '0.98rem', color: '#fff' }}>Scanning source files...</h3>
        </div>
      )}

      {/* Metrics & Filter Controls */}
      {data && !loading && (
        <>
          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-label">Total</div>
              <div className="metric-val">{counts.total}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">High</div>
              <div className="metric-val">{counts.high}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Medium</div>
              <div className="metric-val">{counts.medium}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Low</div>
              <div className="metric-val">{counts.low}</div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search issues by title or file..."
                className="input-field"
                style={{ width: '100%', paddingLeft: '32px', fontSize: '0.84rem' }}
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

            <div style={{ display: 'flex', gap: '4px' }}>
              {['all', 'high', 'medium', 'low'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`btn ${filterSeverity === sev ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: '0.78rem', textTransform: 'capitalize' }}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Issue Cards */}
          <div>
            {filteredIssues.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No issues found for this filter.</p>
              </div>
            ) : (
              filteredIssues.map((issue, idx) => {
                const sev = (issue.severity || 'low').toLowerCase();
                return (
                  <div key={idx} className="bug-card">
                    <div className="bug-header">
                      <div className="bug-title">{issue.title || 'Code Issue'}</div>
                      <span className={`status-badge ${sev === 'high' ? 'status-error' : sev === 'medium' ? 'status-pending' : 'status-ready'}`}>
                        {issue.severity || 'Low'}
                      </span>
                    </div>
                    <div className="bug-meta">
                      {issue.file && <span>{issue.file}</span>}
                      {issue.category && <span>{issue.category}</span>}
                    </div>
                    {issue.description && <div className="bug-desc">{issue.description}</div>}
                    {issue.fix && (
                      <div className="bug-fix">
                        <strong style={{ color: '#ffffff' }}>Fix: </strong>
                        {issue.fix}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

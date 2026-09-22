import React, { useState, useEffect } from 'react';
import { 
  Bug, 
  ShieldAlert, 
  RefreshCw, 
  Loader2, 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  Search,
  Filter,
  Code
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
        <div className="empty-icon">🐛</div>
        <h3 className="empty-title">No Repository Loaded</h3>
        <p className="empty-desc">
          Clone or select a repository from the sidebar to run static bug analysis, security audit, and code smell detection.
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
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>🐛 Bug Finder & Code Quality Scanner</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Detects potential bugs, security vulnerabilities, dead code, and code smells across {activeRepo.name}
          </p>
        </div>
        <div>
          {data && (
            <button
              onClick={() => handleAnalyze(true)}
              disabled={loading}
              className="btn btn-secondary"
            >
              <RefreshCw size={15} className={loading ? 'spin-animate' : ''} />
              <span>Re-Analyze</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: 'rgba(248,81,73,0.1)', borderColor: 'rgba(248,81,73,0.3)', color: 'var(--accent-red)' }}>
          {error}
        </div>
      )}

      {/* Trigger Button if not analyzed */}
      {!data && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <ShieldAlert size={36} style={{ color: 'var(--accent-red)', marginBottom: '14px' }} />
          <h3 style={{ fontSize: '1.15rem', marginBottom: '8px', color: '#fff' }}>Run Bug & Quality Audit</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 20px' }}>
            Inspects code logic, exception handling, resource leaks, hardcoded secrets, and SQL vulnerabilities.
          </p>
          <button onClick={() => handleAnalyze(false)} className="btn btn-primary" style={{ padding: '10px 24px' }}>
            <Bug size={16} />
            <span>Start Code Analysis</span>
          </button>
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Loader2 size={36} className="spin-animate" style={{ color: 'var(--accent-blue)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Scanning source files for bugs and smells...</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Analyzing logic, edge cases, vulnerability patterns, and security risks.
          </p>
        </div>
      )}

      {/* Metrics & Filter Controls */}
      {data && !loading && (
        <>
          <div className="metric-grid">
            <div className="metric-card" style={{ borderLeft: '3px solid var(--accent-blue)' }}>
              <div className="metric-label">Total Detected</div>
              <div className="metric-val">{counts.total}</div>
            </div>
            <div className="metric-card" style={{ borderLeft: '3px solid var(--accent-red)' }}>
              <div className="metric-label">🔴 High Severity</div>
              <div className="metric-val" style={{ color: 'var(--accent-red)' }}>{counts.high}</div>
            </div>
            <div className="metric-card" style={{ borderLeft: '3px solid var(--accent-orange)' }}>
              <div className="metric-label">🟠 Medium Severity</div>
              <div className="metric-val" style={{ color: 'var(--accent-orange)' }}>{counts.medium}</div>
            </div>
            <div className="metric-card" style={{ borderLeft: '3px solid var(--accent-blue)' }}>
              <div className="metric-label">🔵 Low Severity</div>
              <div className="metric-val" style={{ color: 'var(--accent-blue)' }}>{counts.low}</div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search issues by title, file, or category..."
                className="input-field"
                style={{ width: '100%', paddingLeft: '36px' }}
              />
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {['all', 'high', 'medium', 'low'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`btn ${filterSeverity === sev ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '8px 14px', fontSize: '0.8rem', textTransform: 'capitalize' }}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Issue Cards */}
          <div>
            {filteredIssues.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
                <p style={{ color: 'var(--text-secondary)' }}>No issues match the selected filter criteria.</p>
              </div>
            ) : (
              filteredIssues.map((issue, idx) => {
                const sev = (issue.severity || 'low').toLowerCase();
                return (
                  <div key={idx} className={`bug-card ${sev}`}>
                    <div className="bug-header">
                      <div className="bug-title">{issue.title || 'Code Issue'}</div>
                      <span className={`status-badge status-${sev === 'high' ? 'error' : sev === 'medium' ? 'pending' : 'ready'}`}>
                        {issue.severity || 'Low'}
                      </span>
                    </div>
                    <div className="bug-meta">
                      {issue.file && <span>📁 {issue.file}</span>}
                      {issue.category && <span>🏷 {issue.category}</span>}
                    </div>
                    {issue.description && <div className="bug-desc">{issue.description}</div>}
                    {issue.fix && (
                      <div className="bug-fix">
                        <strong>💡 Recommendation:</strong> {issue.fix}
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

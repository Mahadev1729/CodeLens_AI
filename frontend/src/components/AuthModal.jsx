import React, { useState } from 'react';
import { User, Lock, ArrowRight, X, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (tab === 'login') {
        const res = await api.login(username, password);
        localStorage.setItem('codementor_token', res.token);
        localStorage.setItem('codementor_user', res.username);
        onAuthSuccess(res.username, res.session_state);
        onClose();
      } else {
        const res = await api.register(username, password);
        localStorage.setItem('codementor_token', res.token);
        localStorage.setItem('codementor_user', res.username);
        setSuccessMsg('Account registered successfully!');
        setTimeout(() => {
          onAuthSuccess(res.username, {});
          onClose();
        }, 800);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(88, 166, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={20} style={{ color: 'var(--accent-blue)' }} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
              {tab === 'login' ? 'Sign In to CodeMentorAI' : 'Create Account'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn btn-outline"
            style={{ padding: '6px', borderRadius: '50%' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '4px',
            marginBottom: '20px',
          }}
        >
          <button
            onClick={() => {
              setTab('login');
              setError('');
            }}
            className={`tab-btn ${tab === 'login' ? 'active' : ''}`}
            style={{ justifyContent: 'center' }}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setTab('register');
              setError('');
            }}
            className={`tab-btn ${tab === 'register' ? 'active' : ''}`}
            style={{ justifyContent: 'center' }}
          >
            Create Account
          </button>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(248, 81, 73, 0.12)',
              border: '1px solid rgba(248, 81, 73, 0.3)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--accent-red)',
              fontSize: '0.85rem',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(63, 185, 80, 0.12)',
              border: '1px solid rgba(63, 185, 80, 0.3)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--accent-green)',
              fontSize: '0.85rem',
              marginBottom: '16px',
            }}
          >
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="input-group">
            <label className="input-label">Username</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="developer_123"
                className="input-field"
                style={{ width: '100%', paddingLeft: '36px' }}
                autoComplete="username"
                required
              />
              <User
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
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                style={{ width: '100%', paddingLeft: '36px' }}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                required
              />
              <Lock
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-block"
            style={{ marginTop: '10px' }}
          >
            <span>{tab === 'login' ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

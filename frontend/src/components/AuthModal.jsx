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
        }, 600);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
              {tab === 'login' ? 'Sign In' : 'Create Account'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn btn-outline"
            style={{ padding: '4px', borderRadius: '50%' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '3px',
            marginBottom: '16px',
            border: '1px solid var(--border-color)',
          }}
        >
          <button
            onClick={() => {
              setTab('login');
              setError('');
            }}
            className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
            style={{ justifyContent: 'center' }}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setTab('register');
              setError('');
            }}
            className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
            style={{ justifyContent: 'center' }}
          >
            Register
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="auth-alert-error" style={{ marginBottom: '14px' }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-alert-success" style={{ marginBottom: '14px' }}>
            <CheckCircle size={15} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="input-group">
            <label className="input-label">Username</label>
            <div className="auth-input-wrapper">
              <User size={14} className="auth-field-icon" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="input-field auth-input"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="auth-input-wrapper">
              <Lock size={14} className="auth-field-icon" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field auth-input"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-block"
            style={{ marginTop: '8px' }}
          >
            <span>{tab === 'login' ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}

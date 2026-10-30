import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, UserCheck, UserPlus, KeyRound, AlertCircle, Delete } from 'lucide-react';
import { User } from '../types';
import { api } from '../api';

interface AuthModalProps {
  currentUser: User | null;
  onSelectUser: (user: User) => void;
  onClose?: () => void;
  isStandalone?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ currentUser, onSelectUser, onClose, isStandalone }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New staff form state
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Officer');
  const [newDept, setNewDept] = useState('Records & Archives');
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const list = await api.listUsers();
      setUsers(list);
      if (list.length > 0 && !selectedUserId) {
        const savedId = localStorage.getItem('lan_tracker_user_id');
        const match = list.find((u) => u.id === savedId);
        setSelectedUserId(currentUser?.id || (match ? match.id : list[0].id));
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (tab !== 'login') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, tab, selectedUserId, loading]);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        attemptLogin(selectedUserId, nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const attemptLogin = async (userId: string, pinCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(userId, pinCode);
      if (res.success && res.user) {
        onSelectUser(res.user);
        if (onClose) onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect PIN code');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newPin.length !== 4) {
      setError('Please provide full name and a 4-digit PIN');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const created = await api.createUser(
        {
          name: newName.trim(),
          role: newRole,
          department: newDept,
          pin: newPin
        },
        currentUser?.id
      );
      onSelectUser(created);
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const cardContent = (
    <div className="modal-content" style={{ maxWidth: '440px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(99, 102, 241, 0.15)',
            color: '#818cf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
              {isStandalone ? 'Staff Sign-In' : 'Team Sign-In & Authorization'}
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              {isStandalone ? 'Enter 4-digit PIN to access system' : 'Sign off on stage changes and audit stamps'}
            </p>
          </div>
        </div>
        {!isStandalone && onClose && (
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: '0.35rem' }}>
            <X size={16} />
          </button>
        )}
      </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(17, 24, 39, 0.4)'
        }}>
          <button
            onClick={() => { setTab('login'); setError(null); }}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'login' ? '2px solid var(--primary)' : '2px solid transparent',
              color: tab === 'login' ? 'var(--text-main)' : 'var(--text-muted)',
              fontWeight: 500,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <UserCheck size={15} /> Switch Staff Account
          </button>
          {currentUser?.role?.toLowerCase() === 'admin' && (
            <button
              onClick={() => { setTab('register'); setError(null); }}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'none',
                border: 'none',
                borderBottom: tab === 'register' ? '2px solid var(--primary)' : '2px solid transparent',
                color: tab === 'register' ? 'var(--text-main)' : 'var(--text-muted)',
                fontWeight: 500,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <UserPlus size={15} /> Add Team Member
            </button>
          )}
        </div>

        <div className="modal-body" style={{ padding: '1.25rem 1.5rem' }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 0.85rem',
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              borderRadius: '8px',
              color: 'var(--danger)',
              fontSize: '0.8125rem'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {tab === 'login' ? (
            <div>
              {/* Select Staff Member */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Select Staff Member</label>
                <select
                  className="select"
                  value={selectedUserId}
                  onChange={(e) => {
                    setSelectedUserId(e.target.value);
                    setPin('');
                    setError(null);
                  }}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.role} ({u.department})
                    </option>
                  ))}
                </select>
              </div>

              {selectedUser && (
                <div style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>
                      {selectedUser.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      {selectedUser.department}
                    </div>
                  </div>
                  <span className="badge" style={{
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#818cf8',
                    border: '1px solid rgba(99, 102, 241, 0.3)'
                  }}>
                    {selectedUser.role}
                  </span>
                </div>
              )}

              {/* PIN Code Indicator */}
              <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8125rem',
                  color: '#9ca3af',
                  marginBottom: '0.75rem'
                }}>
                  <KeyRound size={14} /> Enter 4-Digit Security PIN
                </div>

                <div className="pin-dots">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`pin-dot ${pin.length > idx ? 'filled' : ''}`}
                    />
                  ))}
                </div>
              </div>

              {/* PIN Numpad */}
              <div className="pin-grid">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    className="pin-key"
                    disabled={loading}
                    onClick={() => handleKeyPress(digit)}
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  className="pin-key"
                  disabled={loading}
                  onClick={() => setPin('')}
                  style={{ fontSize: '0.75rem', color: '#9ca3af' }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="pin-key"
                  disabled={loading}
                  onClick={() => handleKeyPress('0')}
                >
                  0
                </button>
                <button
                  type="button"
                  className="pin-key"
                  disabled={loading}
                  onClick={handleBackspace}
                  style={{ color: '#9ca3af' }}
                >
                  <Delete size={20} />
                </button>
              </div>

              <div style={{
                textAlign: 'center',
                marginTop: '1rem',
                fontSize: '0.75rem',
                color: '#6b7280'
              }}>
                Default seed accounts: Admin: <strong style={{ color: '#9ca3af' }}>1234</strong> • Staff: <strong style={{ color: '#9ca3af' }}>1111</strong>, <strong style={{ color: '#9ca3af' }}>2222</strong>, <strong style={{ color: '#9ca3af' }}>3333</strong>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label required">Full Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Elena Rostova"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label required">Role</label>
                  <select
                    className="select"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  >
                    <option value="Officer">Officer</option>
                    <option value="Reviewer">Reviewer</option>
                    <option value="Auditor">Auditor</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label required">Department</label>
                  <select
                    className="select"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                  >
                    <option value="Records & Archives">Records & Archives</option>
                    <option value="Finance & Billing">Finance & Billing</option>
                    <option value="Legal & Compliance">Legal & Compliance</option>
                    <option value="Operations">Operations</option>
                    <option value="Executive Office">Executive Office</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label required">4-Digit Security PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  className="input font-mono"
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  Used to sign off on lifecycle stage advancements and audit stamps.
                </span>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: '0.5rem' }}
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Team Account & Sign In'}
              </button>
            </form>
          )}
        </div>
      </div>
  );

  if (isStandalone) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'radial-gradient(circle at 50% 25%, rgba(99, 102, 241, 0.12) 0%, transparent 65%), var(--bg-main)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
            marginBottom: '0.75rem'
          }}>
            <ShieldCheck size={28} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', margin: 0 }}>
            DocTrack <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', fontWeight: 700, verticalAlign: 'middle' }}>LGU</span>
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#9ca3af', margin: '0.35rem 0 0 0' }}>
            Document Tracking & Custodial Routing Information System
          </p>
        </div>
        {cardContent}
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      {cardContent}
    </div>
  );
};

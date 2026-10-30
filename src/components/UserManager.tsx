import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Search,
  Building,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { User, MUNICIPAL_OFFICES } from '../types';
import { api } from '../api';

interface UserManagerProps {
  currentUser: User | null;
  users: User[];
  offices?: string[];
  onUsersUpdated: (users: User[]) => void;
}

export const UserManager: React.FC<UserManagerProps> = ({
  currentUser,
  users,
  offices,
  onUsersUpdated
}) => {
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
  const officeList = offices && offices.length > 0 ? offices : MUNICIPAL_OFFICES;

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states for Add/Edit
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('Officer');
  const [formDept, setFormDept] = useState(officeList[0] || 'Office of the Mayor');
  const [formPin, setFormPin] = useState('');

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const roles = ['Admin', 'Approver', 'Officer', 'Staff'];

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.department.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const openAddModal = () => {
    setFormName('');
    setFormRole('Officer');
    setFormDept(officeList[0] || 'Office of the Mayor');
    setFormPin('');
    setStatusMsg(null);
    setShowAddModal(true);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormRole(u.role);
    setFormDept(u.department);
    setFormPin(''); // blank means keep existing PIN
    setStatusMsg(null);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isAdmin) return;
    if (!formName.trim() || formPin.trim().length !== 4) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid full name and exactly 4-digit PIN.' });
      return;
    }

    setSaving(true);
    setStatusMsg(null);
    try {
      const created = await api.createUser(
        {
          name: formName.trim(),
          role: formRole,
          department: formDept,
          pin: formPin.trim()
        },
        currentUser.id
      );

      const updatedList = [...users, created].sort((a, b) => a.name.localeCompare(b.name));
      onUsersUpdated(updatedList);
      setShowAddModal(false);
      setStatusMsg({ type: 'success', text: `User account "${created.name}" created successfully.` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to create user.' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isAdmin || !editingUser) return;
    if (!formName.trim()) {
      setStatusMsg({ type: 'error', text: 'Full name cannot be empty.' });
      return;
    }
    if (formPin && formPin.trim().length !== 4) {
      setStatusMsg({ type: 'error', text: 'New PIN must be exactly 4 digits (or leave blank to keep current PIN).' });
      return;
    }

    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await api.updateUser(
        editingUser.id,
        {
          name: formName.trim(),
          role: formRole,
          department: formDept,
          pin: formPin.trim() ? formPin.trim() : undefined
        },
        currentUser.id
      );

      const updatedList = users.map((u) => (u.id === editingUser.id ? res.user : u));
      onUsersUpdated(updatedList);
      setEditingUser(null);
      setStatusMsg({ type: 'success', text: `User account "${res.user.name}" updated successfully.` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update user.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (!currentUser || !isAdmin) return;
    if (u.id === currentUser.id) {
      if (!window.confirm('Warning: You are currently signed in as this user. Are you sure you want to delete your own account?')) {
        return;
      }
    } else if (!window.confirm(`Are you sure you want to delete user account "${u.name}" (${u.role})? This action cannot be undone.`)) {
      return;
    }

    setSaving(true);
    setStatusMsg(null);
    try {
      await api.deleteUser(u.id, currentUser.id);
      const updatedList = users.filter((user) => user.id !== u.id);
      onUsersUpdated(updatedList);
      setStatusMsg({ type: 'success', text: `User "${u.name}" has been deleted.` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete user.' });
    } finally {
      setSaving(false);
    }
  };

  // If not admin, restrict access
  if (!isAdmin) {
    return (
      <div style={{
        maxWidth: '800px',
        margin: '2rem auto',
        padding: '2.5rem',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-medium)',
        borderRadius: '16px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem'
        }}>
          <ShieldAlert size={28} />
        </div>
        <h2 style={{ color: '#f8fafc', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Admin Access Required
        </h2>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: '1.5', maxWidth: '460px', margin: '0 auto' }}>
          Staff and user account management is strictly restricted to authorized <strong>Administrators</strong>. You are currently logged in as <strong>{currentUser?.name || 'Guest'}</strong> ({currentUser?.role || 'Staff'}).
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-medium)',
        borderRadius: '16px',
        padding: '1.25rem 1.75rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.2)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={18} />
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Staff & User Accounts
            </h1>
            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontWeight: 700 }}>
              Admin Only
            </span>
          </div>
          <p style={{ color: '#9ca3af', fontSize: '0.8125rem', marginTop: '0.35rem' }}>
            Manage authorized municipal officers, departments, approval roles, and 4-digit routing PINs.
          </p>
        </div>

        <button className="btn btn-primary" onClick={openAddModal}>
          <UserPlus size={16} /> Add New User
        </button>
      </div>

      {/* Notifications */}
      {statusMsg && (
        <div style={{
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          fontSize: '0.8125rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: statusMsg.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: statusMsg.type === 'success' ? '#4ade80' : '#f87171',
          border: `1px solid ${statusMsg.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          <AlertCircle size={16} />
          <span>{statusMsg.text}</span>
          <button
            onClick={() => setStatusMsg(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search by name, role, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.4rem' }}
          />
        </div>
        <div style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
          Total registered users: <strong style={{ color: '#f8fafc' }}>{users.length}</strong>
        </div>
      </div>

      {/* Users Table */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-medium)',
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-medium)', color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '0.85rem 1.25rem' }}>Officer Name</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Role</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Municipal Department</th>
              <th style={{ padding: '0.85rem 1.25rem' }}>Account ID</th>
              <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                  No user accounts match your search.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isCurrent = currentUser?.id === u.id;
                const isAdminRole = u.role.toLowerCase() === 'admin';

                return (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isCurrent ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: isAdminRole ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                          color: isAdminRole ? '#f87171' : '#818cf8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8125rem'
                        }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {u.name}
                            {isCurrent && (
                              <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', fontSize: '0.65rem' }}>
                                (You)
                              </span>
                            )}
                          </strong>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span className="badge" style={{
                        background: isAdminRole
                          ? 'rgba(239, 68, 68, 0.15)'
                          : u.role === 'Approver'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(99, 102, 241, 0.15)',
                        color: isAdminRole
                          ? '#f87171'
                          : u.role === 'Approver'
                            ? '#fbbf24'
                            : '#818cf8',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        {u.role}
                      </span>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', color: '#d1d5db' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Building size={14} color="#6b7280" />
                        <span>{u.department}</span>
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', color: '#6b7280', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {u.id}
                    </td>

                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEditModal(u)}
                          title="Edit user details or reset PIN"
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDeleteUser(u)}
                          disabled={saving}
                          style={{ color: '#ef4444' }}
                          title="Delete user account"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={18} color="#818cf8" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Add Municipal Staff Account
                </h3>
              </div>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label className="label">Full Name & Title *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Atty. Sarah Diaz, Engr. Mark Ramos"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="label">Access Role *</label>
                  <select
                    className="select"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    required
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">4-Digit Routing PIN *</label>
                  <input
                    type="password"
                    maxLength={4}
                    className="input font-mono"
                    placeholder="••••"
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Municipal Office / Department *</label>
                <select
                  className="select"
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  required
                >
                  {officeList.map((off) => (
                    <option key={off} value={off}>{off}</option>
                  ))}
                </select>
              </div>

              <div className="modal-footer" style={{ marginTop: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <ShieldCheck size={16} /> {saving ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 size={18} color="#818cf8" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Edit Account: {editingUser.name}
                </h3>
              </div>
              <button className="modal-close" onClick={() => setEditingUser(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label className="label">Full Name & Title *</label>
                <input
                  type="text"
                  className="input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="label">Access Role *</label>
                  <select
                    className="select"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    required
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <KeyRound size={13} color="#818cf8" /> Reset 4-Digit PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    className="input font-mono"
                    placeholder="Leave blank to keep"
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                </div>
              </div>

              <div>
                <label className="label">Municipal Office / Department *</label>
                <select
                  className="select"
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  required
                >
                  {officeList.map((off) => (
                    <option key={off} value={off}>{off}</option>
                  ))}
                </select>
              </div>

              <div className="modal-footer" style={{ marginTop: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Check size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

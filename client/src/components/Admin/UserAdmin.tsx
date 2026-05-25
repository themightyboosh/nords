/**
 * UserAdmin.tsx — User Management + Invite Keys Panel
 *
 * Admin-only panel showing:
 * 1. Users table with role toggling and delete
 * 2. Invite keys table with create and revoke
 */

import { useState, useEffect, useCallback } from 'react';
import { Shield, ShieldCheck, Trash2, Users, RefreshCw, Key, Plus, X, Copy, Check } from 'lucide-react';
import { api } from '../../api/client';

interface UserRow {
  id: string;
  firebase_uid: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

interface InviteKeyRow {
  id: string;
  key: string;
  label: string | null;
  max_uses: number | null;
  use_count: number;
  created_at: string;
  revoked_at: string | null;
}

export default function UserAdmin() {
  // ── Users ──
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Invite Keys ──
  const [inviteKeys, setInviteKeys] = useState<InviteKeyRow[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<UserRow[]>('/api/admin/users');
      setUsers(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInviteKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const data = await api.get<InviteKeyRow[]>('/api/admin/invite-keys');
      setInviteKeys(data);
    } catch {
      // Silently handle — not critical
    } finally {
      setKeysLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); loadInviteKeys(); }, [loadUsers, loadInviteKeys]);

  const toggleRole = async (user: UserRow) => {
    const newRole = user.role === 'admin' ? 'member' : 'admin';
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    try {
      await api.put(`/api/admin/users/${user.id}`, { role: newRole });
    } catch {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: user.role } : u));
    }
  };

  const deleteUser = async (user: UserRow) => {
    if (!window.confirm(`Delete user "${user.email}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/admin/users/${user.id}`);
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete user');
    }
  };

  // ── Invite Key Actions ──
  const createKey = async () => {
    if (!newKeyValue.trim()) return;
    try {
      const created = await api.post<InviteKeyRow>('/api/admin/invite-keys', {
        key: newKeyValue.trim(),
        label: newKeyLabel.trim() || null,
      });
      setInviteKeys(prev => [created, ...prev]);
      setNewKeyValue('');
      setNewKeyLabel('');
      setShowCreateKey(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to create invite key');
    }
  };

  const revokeKey = async (key: InviteKeyRow) => {
    if (!window.confirm(`Revoke invite key "${key.key}"?`)) return;
    try {
      await api.delete(`/api/admin/invite-keys/${key.id}`);
      setInviteKeys(prev => prev.map(k => k.id === key.id ? { ...k, revoked_at: new Date().toISOString() } : k));
    } catch (err: any) {
      alert(err?.message || 'Failed to revoke key');
    }
  };

  const copyKey = (key: InviteKeyRow) => {
    navigator.clipboard.writeText(key.key);
    setCopiedKeyId(key.id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  return (
    <div className="nords-user-admin" data-testid="user-admin">
      {/* ═══ Users Section ═══ */}
      <div className="nords-user-admin__header">
        <h2 className="nords-user-admin__title">
          <Users size={16} strokeWidth={1.5} />
          User Management
        </h2>
        <button className="nords-user-admin__refresh" onClick={loadUsers} title="Refresh">
          <RefreshCw size={14} strokeWidth={1.5} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      {error && (
        <div className="nords-user-admin__error">{error}</div>
      )}

      <div className="nords-user-admin__table-wrap">
        <table className="nords-user-admin__table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td className="nords-user-admin__name-cell">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="nords-user-admin__avatar" />
                  ) : (
                    <div className="nords-user-admin__avatar-placeholder">
                      {(user.display_name || user.email)[0].toUpperCase()}
                    </div>
                  )}
                  <span>{user.display_name || '—'}</span>
                </td>
                <td className="nords-user-admin__email">{user.email}</td>
                <td>
                  <button
                    className={`nords-user-admin__role-badge ${user.role === 'admin' ? 'is-admin' : ''}`}
                    onClick={() => toggleRole(user)}
                    title={`Click to ${user.role === 'admin' ? 'demote to member' : 'promote to admin'}`}
                  >
                    {user.role === 'admin' ? <ShieldCheck size={12} /> : <Shield size={12} />}
                    {user.role}
                  </button>
                </td>
                <td className="nords-user-admin__date">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td>
                  <button
                    className="nords-user-admin__delete-btn"
                    onClick={() => deleteUser(user)}
                    title="Delete user"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--nords-color-text-disabled)' }}>
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ═══ Invite Keys Section ═══ */}
      <div className="nords-user-admin__header" style={{ marginTop: 32 }}>
        <h2 className="nords-user-admin__title">
          <Key size={16} strokeWidth={1.5} />
          Invite Keys
        </h2>
        <button
          className="nords-user-admin__refresh"
          onClick={() => setShowCreateKey(!showCreateKey)}
          title="Create invite key"
          style={{ gap: 4, display: 'flex', alignItems: 'center', padding: '5px 10px' }}
        >
          {showCreateKey ? <X size={14} /> : <Plus size={14} />}
          <span style={{ fontSize: 11 }}>{showCreateKey ? 'Cancel' : 'New Key'}</span>
        </button>
      </div>

      {/* Create key inline form */}
      {showCreateKey && (
        <div className="nords-user-admin__create-key">
          <input
            type="text"
            placeholder="Key value (e.g. NORDS-BETA-2026)"
            value={newKeyValue}
            onChange={e => setNewKeyValue(e.target.value)}
            className="nords-user-admin__key-input"
            autoFocus
          />
          <input
            type="text"
            placeholder="Label (optional)"
            value={newKeyLabel}
            onChange={e => setNewKeyLabel(e.target.value)}
            className="nords-user-admin__key-input"
          />
          <button
            className="nords-user-admin__key-create-btn"
            onClick={createKey}
            disabled={!newKeyValue.trim()}
          >
            Create
          </button>
        </div>
      )}

      <div className="nords-user-admin__table-wrap">
        <table className="nords-user-admin__table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Label</th>
              <th>Uses</th>
              <th>Created</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {inviteKeys.map(key => (
              <tr key={key.id} style={key.revoked_at ? { opacity: 0.4 } : undefined}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <code style={{ fontSize: 12, letterSpacing: 0.5 }}>{key.key}</code>
                    <button
                      className="nords-user-admin__delete-btn"
                      onClick={() => copyKey(key)}
                      title="Copy key"
                      style={{ color: copiedKeyId === key.id ? '#10b981' : undefined }}
                    >
                      {copiedKeyId === key.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </td>
                <td style={{ color: 'var(--nords-color-text-secondary)', fontSize: 12 }}>
                  {key.label || '—'}
                </td>
                <td style={{ fontSize: 12 }}>
                  {key.use_count}{key.max_uses !== null ? ` / ${key.max_uses}` : ''}
                </td>
                <td className="nords-user-admin__date">
                  {new Date(key.created_at).toLocaleDateString()}
                </td>
                <td>
                  {key.revoked_at ? (
                    <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500 }}>Revoked</span>
                  ) : (
                    <span style={{ color: '#10b981', fontSize: 11, fontWeight: 500 }}>Active</span>
                  )}
                </td>
                <td>
                  {!key.revoked_at && (
                    <button
                      className="nords-user-admin__delete-btn"
                      onClick={() => revokeKey(key)}
                      title="Revoke key"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {inviteKeys.length === 0 && !keysLoading && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--nords-color-text-disabled)' }}>
                  No invite keys — create one to allow new signups
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * UserAdmin.tsx — User Management Panel
 *
 * Admin-only table showing all users with role toggling and delete.
 * Loaded inside the ProjectDashboard when "Users" is selected.
 */

import { useState, useEffect, useCallback } from 'react';
import { Shield, ShieldCheck, Trash2, Users, RefreshCw } from 'lucide-react';
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

export default function UserAdmin() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const toggleRole = async (user: UserRow) => {
    const newRole = user.role === 'admin' ? 'member' : 'admin';
    // Optimistic
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    try {
      await api.put(`/api/admin/users/${user.id}`, { role: newRole });
    } catch {
      // Revert
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

  return (
    <div className="nords-user-admin" data-testid="user-admin">
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
    </div>
  );
}

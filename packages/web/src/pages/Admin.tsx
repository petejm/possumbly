import { useState, useEffect } from 'react';
import { admin, invites, InviteCode, User, Stats } from '../lib/api';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'invites' | 'users' | 'stats'>('invites');
  const [inviteList, setInviteList] = useState<InviteCode[]>([]);
  const [userList, setUserList] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creatingInvite, setCreatingInvite] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'invites') {
        const data = await invites.list();
        setInviteList(data);
      } else if (activeTab === 'users') {
        const data = await admin.getUsers();
        setUserList(data);
      } else if (activeTab === 'stats') {
        const data = await admin.getStats();
        setStats(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    setCreatingInvite(true);
    try {
      const newInvite = await invites.create();
      setInviteList((prev) => [
        { ...newInvite, used_by: null, used_at: null } as InviteCode,
        ...prev,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite');
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invite code?')) return;
    try {
      await invites.delete(id);
      setInviteList((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invite');
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Change this user's role to ${newRole}?`)) return;
    try {
      await admin.setUserRole(userId, newRole);
      setUserList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole as 'admin' | 'user' } : u))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-themed-primary mb-8">Admin Panel</h1>

      {error && (
        <div
          className="px-4 py-3 rounded-lg mb-6 border"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'var(--color-error)',
            color: 'var(--color-error)',
          }}
        >
          {error}
          <button onClick={() => setError('')} className="float-right font-bold">
            &times;
          </button>
        </div>
      )}

      <div className="flex gap-4 mb-6 border-b border-themed">
        {(['invites', 'users', 'stats'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'text-themed-primary border-current'
                : 'text-themed-muted border-transparent hover:text-themed-secondary'
            }`}
            style={activeTab === tab ? { borderColor: 'var(--color-bg-accent)' } : {}}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div
            className="animate-spin rounded-full h-12 w-12 border-4 border-themed"
            style={{ borderTopColor: 'var(--color-bg-accent)' }}
          ></div>
        </div>
      ) : (
        <>
          {activeTab === 'invites' && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleCreateInvite}
                  className="btn btn-primary"
                  disabled={creatingInvite}
                >
                  {creatingInvite ? 'Creating...' : 'Generate Invite Code'}
                </button>
              </div>
              <div className="card overflow-hidden p-0">
                <table className="w-full">
                  <thead className="bg-themed-tertiary">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-themed-secondary">
                        Code
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-themed-secondary">
                        Created
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-themed-secondary">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-themed-secondary">
                        Used By
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-themed-secondary">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-themed">
                    {inviteList.map((invite) => (
                      <tr key={invite.id}>
                        <td className="px-4 py-3">
                          <code className="bg-themed-tertiary px-2 py-1 rounded font-mono text-sm">
                            {invite.code}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-sm text-themed-muted">
                          {formatDate(invite.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded-full ${
                              invite.used_by
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {invite.used_by ? 'Used' : 'Available'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-themed-muted">
                          {invite.used_by_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => copyToClipboard(invite.code)}
                            className="text-themed-muted hover:text-themed-primary mr-2 transition-colors"
                            title="Copy code"
                          >
                            Copy
                          </button>
                          {!invite.used_by && (
                            <button
                              onClick={() => handleDeleteInvite(invite.id)}
                              className="hover:opacity-80 transition-opacity"
                              style={{ color: 'var(--color-error)' }}
                              title="Delete invite"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {inviteList.length === 0 && (
                  <p className="text-center py-8 text-themed-muted">No invite codes yet</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="card overflow-hidden p-0">
              <table className="w-full">
                <thead className="bg-themed-tertiary">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-themed-secondary">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-themed-secondary">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-themed-secondary">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-themed-secondary">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-themed-secondary">
                      Joined
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-themed-secondary">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-themed">
                  {userList.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.avatar_url && (
                            <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                          )}
                          <div>
                            <p className="font-medium text-themed-primary">
                              {user.name || 'Unknown'}
                            </p>
                            <p className="text-sm text-themed-muted">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm capitalize text-themed-muted">
                        {user.provider}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-themed-tertiary text-themed-primary'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full ${
                            user.invite_redeemed
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {user.invite_redeemed ? 'Active' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-themed-muted">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleRole(user.id, user.role)}
                          className="text-themed-muted hover:text-themed-primary transition-colors"
                        >
                          {user.role === 'admin' ? 'Demote' : 'Promote'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {userList.length === 0 && (
                <p className="text-center py-8 text-themed-muted">No users yet</p>
              )}
            </div>
          )}

          {activeTab === 'stats' && stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card">
                <p className="text-themed-muted text-sm mb-1">Total Users</p>
                <p className="text-3xl font-bold text-themed-primary">{stats.totalUsers}</p>
              </div>
              <div className="card">
                <p className="text-themed-muted text-sm mb-1">Active Users</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-success)' }}>
                  {stats.activeUsers}
                </p>
              </div>
              <div className="card">
                <p className="text-themed-muted text-sm mb-1">Pending Users</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-warning)' }}>
                  {stats.pendingUsers}
                </p>
              </div>
              <div className="card">
                <p className="text-themed-muted text-sm mb-1">Admin Users</p>
                <p className="text-3xl font-bold text-purple-600">{stats.adminUsers}</p>
              </div>
              <div className="card">
                <p className="text-themed-muted text-sm mb-1">Total Invites</p>
                <p className="text-3xl font-bold text-themed-primary">{stats.totalInvites}</p>
              </div>
              <div className="card">
                <p className="text-themed-muted text-sm mb-1">Used Invites</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-success)' }}>
                  {stats.usedInvites}
                </p>
              </div>
              <div className="card">
                <p className="text-themed-muted text-sm mb-1">Available Invites</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--color-warning)' }}>
                  {stats.availableInvites}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

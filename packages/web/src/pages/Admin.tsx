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
      setInviteList((prev) => [{ ...newInvite, used_by: null, used_at: null } as InviteCode, ...prev]);
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
      <h1 className="text-3xl font-bold text-possum-800 mb-8">Admin Panel</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
          <button onClick={() => setError('')} className="float-right font-bold">
            &times;
          </button>
        </div>
      )}

      <div className="flex gap-4 mb-6 border-b border-possum-200">
        {(['invites', 'users', 'stats'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'text-possum-800 border-possum-600'
                : 'text-possum-500 border-transparent hover:text-possum-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-possum-600 border-t-transparent"></div>
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
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-possum-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-possum-700">
                        Code
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-possum-700">
                        Created
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-possum-700">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-possum-700">
                        Used By
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-possum-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-possum-100">
                    {inviteList.map((invite) => (
                      <tr key={invite.id}>
                        <td className="px-4 py-3">
                          <code className="bg-possum-100 px-2 py-1 rounded font-mono text-sm">
                            {invite.code}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-sm text-possum-600">
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
                        <td className="px-4 py-3 text-sm text-possum-600">
                          {invite.used_by_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => copyToClipboard(invite.code)}
                            className="text-possum-500 hover:text-possum-700 mr-2"
                            title="Copy code"
                          >
                            Copy
                          </button>
                          {!invite.used_by && (
                            <button
                              onClick={() => handleDeleteInvite(invite.id)}
                              className="text-red-500 hover:text-red-700"
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
                  <p className="text-center py-8 text-possum-500">No invite codes yet</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-possum-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-possum-700">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-possum-700">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-possum-700">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-possum-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-possum-700">
                      Joined
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-possum-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-possum-100">
                  {userList.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.avatar_url && (
                            <img
                              src={user.avatar_url}
                              alt=""
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <div>
                            <p className="font-medium text-possum-800">
                              {user.name || 'Unknown'}
                            </p>
                            <p className="text-sm text-possum-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm capitalize text-possum-600">
                        {user.provider}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-possum-100 text-possum-800'
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
                      <td className="px-4 py-3 text-sm text-possum-600">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleRole(user.id, user.role)}
                          className="text-possum-500 hover:text-possum-700"
                        >
                          {user.role === 'admin' ? 'Demote' : 'Promote'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {userList.length === 0 && (
                <p className="text-center py-8 text-possum-500">No users yet</p>
              )}
            </div>
          )}

          {activeTab === 'stats' && stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card">
                <p className="text-possum-500 text-sm mb-1">Total Users</p>
                <p className="text-3xl font-bold text-possum-800">{stats.totalUsers}</p>
              </div>
              <div className="card">
                <p className="text-possum-500 text-sm mb-1">Active Users</p>
                <p className="text-3xl font-bold text-green-600">{stats.activeUsers}</p>
              </div>
              <div className="card">
                <p className="text-possum-500 text-sm mb-1">Pending Users</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pendingUsers}</p>
              </div>
              <div className="card">
                <p className="text-possum-500 text-sm mb-1">Admin Users</p>
                <p className="text-3xl font-bold text-purple-600">{stats.adminUsers}</p>
              </div>
              <div className="card">
                <p className="text-possum-500 text-sm mb-1">Total Invites</p>
                <p className="text-3xl font-bold text-possum-800">{stats.totalInvites}</p>
              </div>
              <div className="card">
                <p className="text-possum-500 text-sm mb-1">Used Invites</p>
                <p className="text-3xl font-bold text-green-600">{stats.usedInvites}</p>
              </div>
              <div className="card">
                <p className="text-possum-500 text-sm mb-1">Available Invites</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.availableInvites}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { invites, admin } from '../lib/api';

export default function RedeemInvite() {
  const { refreshUser, logout, inviteRedeemed } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);

  // Redirect if already has invite
  if (inviteRedeemed) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await invites.redeem(code.trim());
      await refreshUser();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to redeem invite code');
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrap = async () => {
    setBootstrapping(true);
    setError('');

    try {
      await admin.bootstrap();
      await refreshUser();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bootstrap admin');
    } finally {
      setBootstrapping(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-possum-100 to-possum-200 p-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-possum-800 mb-2">Enter Invite Code</h1>
          <p className="text-possum-600">You need an invite code to access Possumbly</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-possum-700 mb-1">
              Invite Code
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXXXXXXXXXX"
              className="input w-full text-center text-lg tracking-widest uppercase"
              disabled={loading}
              maxLength={12}
            />
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Redeeming...' : 'Redeem Code'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-possum-200">
          <p className="text-center text-possum-500 text-sm mb-4">
            Don't have an invite code? Ask an existing member for one.
          </p>
          <div className="flex gap-4">
            <button
              onClick={handleBootstrap}
              disabled={bootstrapping}
              className="btn btn-secondary flex-1 text-sm"
            >
              {bootstrapping ? 'Setting up...' : 'First User? Become Admin'}
            </button>
            <button onClick={logout} className="btn btn-secondary flex-1 text-sm">
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

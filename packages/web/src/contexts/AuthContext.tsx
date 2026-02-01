import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, User } from '../lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  inviteRedeemed: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (provider: 'google' | 'github' | 'discord') => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteRedeemed, setInviteRedeemed] = useState(false);

  const refreshUser = async () => {
    try {
      const status = await auth.getStatus();
      if (status.authenticated) {
        const userData = await auth.getMe();
        setUser(userData);
        setInviteRedeemed(status.inviteRedeemed);
      } else {
        setUser(null);
        setInviteRedeemed(false);
      }
    } catch {
      setUser(null);
      setInviteRedeemed(false);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const login = (provider: 'google' | 'github' | 'discord') => {
    window.location.href = auth.loginUrl(provider);
  };

  const logout = async () => {
    await auth.logout();
    setUser(null);
    setInviteRedeemed(false);
  };

  const value: AuthContextType = {
    user,
    loading,
    inviteRedeemed,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

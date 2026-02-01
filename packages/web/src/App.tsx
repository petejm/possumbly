import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import RedeemInvite from './pages/RedeemInvite';
import Templates from './pages/Templates';
import Editor from './pages/Editor';
import MyMemes from './pages/MyMemes';
import Admin from './pages/Admin';

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-themed-secondary">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-themed" style={{ borderTopColor: 'var(--color-bg-accent)' }}></div>
    </div>
  );
}

function ProtectedRoute({ children, requireInvite = true }: { children: React.ReactNode; requireInvite?: boolean }) {
  const { isAuthenticated, inviteRedeemed, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireInvite && !inviteRedeemed) {
    return <Navigate to="/redeem-invite" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/redeem-invite"
        element={
          <ProtectedRoute requireInvite={false}>
            <RedeemInvite />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Templates />} />
        <Route path="editor/:templateId" element={<Editor />} />
        <Route path="editor/:templateId/:memeId" element={<Editor />} />
        <Route path="my-memes" element={<MyMemes />} />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
      </Route>
    </Routes>
  );
}

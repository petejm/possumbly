import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import RedeemInvite from './pages/RedeemInvite';
import Templates from './pages/Templates';

// Lazy load heavy/infrequently-used pages
const Editor = lazy(() => import('./pages/Editor'));
const MyMemes = lazy(() => import('./pages/MyMemes'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Admin = lazy(() => import('./pages/Admin'));

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-themed-secondary">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-themed" style={{ borderTopColor: 'var(--color-bg-accent)' }}></div>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-themed" style={{ borderTopColor: 'var(--color-bg-accent)' }}></div>
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
        <Route path="gallery" element={<Suspense fallback={<PageLoader />}><Gallery /></Suspense>} />
        <Route path="editor/:templateId" element={<Suspense fallback={<PageLoader />}><Editor /></Suspense>} />
        <Route path="editor/:templateId/:memeId" element={<Suspense fallback={<PageLoader />}><Editor /></Suspense>} />
        <Route path="my-memes" element={<Suspense fallback={<PageLoader />}><MyMemes /></Suspense>} />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <Suspense fallback={<PageLoader />}><Admin /></Suspense>
            </AdminRoute>
          }
        />
      </Route>
    </Routes>
  );
}

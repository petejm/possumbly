import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-possum-50">
      <header className="bg-possum-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 text-xl font-bold">
                <span className="text-2xl">P</span>
                <span>Possumbly</span>
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link
                  to="/"
                  className={`transition-colors ${isActive('/') ? 'text-white' : 'text-possum-300 hover:text-white'}`}
                >
                  Templates
                </Link>
                <Link
                  to="/my-memes"
                  className={`transition-colors ${isActive('/my-memes') ? 'text-white' : 'text-possum-300 hover:text-white'}`}
                >
                  My Memes
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className={`transition-colors ${isActive('/admin') ? 'text-white' : 'text-possum-300 hover:text-white'}`}
                  >
                    Admin
                  </Link>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3">
                  {user.avatar_url && (
                    <img src={user.avatar_url} alt={user.name || 'User'} className="w-8 h-8 rounded-full" />
                  )}
                  <span className="hidden sm:block text-sm">{user.name || user.email}</span>
                </div>
              )}
              <button
                onClick={logout}
                className="text-sm text-possum-300 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}

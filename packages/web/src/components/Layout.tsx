import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ThemeSelector from './ThemeSelector';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-themed-secondary">
      <header className="bg-themed-header text-themed-header shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 group">
                <svg
                  className="w-8 h-8 text-themed-header group-hover:scale-110 transition-transform"
                  viewBox="0 0 32 32"
                  fill="currentColor"
                >
                  {/* Simple possum-inspired icon */}
                  <circle cx="16" cy="16" r="12" opacity="0.2" />
                  <circle cx="16" cy="16" r="8" />
                  <circle cx="12" cy="14" r="1.5" fill="var(--color-header-bg)" />
                  <circle cx="20" cy="14" r="1.5" fill="var(--color-header-bg)" />
                  <ellipse cx="16" cy="18" rx="2" ry="1.5" fill="var(--color-header-bg)" />
                  {/* Ears */}
                  <circle cx="9" cy="9" r="3" />
                  <circle cx="23" cy="9" r="3" />
                </svg>
                <span className="text-xl font-semibold tracking-tight">Possumbly</span>
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link
                  to="/"
                  className={`transition-colors ${isActive('/') ? 'text-themed-header font-medium' : 'text-themed-header-muted hover:text-themed-header'}`}
                >
                  Templates
                </Link>
                <Link
                  to="/gallery"
                  className={`transition-colors ${isActive('/gallery') ? 'text-themed-header font-medium' : 'text-themed-header-muted hover:text-themed-header'}`}
                >
                  Gallery
                </Link>
                <Link
                  to="/my-memes"
                  className={`transition-colors ${isActive('/my-memes') ? 'text-themed-header font-medium' : 'text-themed-header-muted hover:text-themed-header'}`}
                >
                  My Memes
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className={`transition-colors ${isActive('/admin') ? 'text-themed-header font-medium' : 'text-themed-header-muted hover:text-themed-header'}`}
                  >
                    Admin
                  </Link>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <ThemeSelector />
              <div className="w-px h-6 bg-white/20" />
              {user && (
                <div className="flex items-center gap-2">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-full ring-2 ring-white/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-themed-header text-sm font-medium">
                      {(user.name || user.email || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={logout}
                    className="text-sm text-themed-header-muted hover:text-themed-header transition-colors px-2 py-1 rounded hover:bg-white/10"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation */}
      <nav className="md:hidden bg-themed-tertiary border-b border-themed">
        <div className="max-w-7xl mx-auto px-4 flex gap-4 py-2">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isActive('/')
                ? 'bg-themed-accent text-themed-inverse'
                : 'text-themed-secondary hover:bg-themed-secondary'
            }`}
          >
            Templates
          </Link>
          <Link
            to="/gallery"
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isActive('/gallery')
                ? 'bg-themed-accent text-themed-inverse'
                : 'text-themed-secondary hover:bg-themed-secondary'
            }`}
          >
            Gallery
          </Link>
          <Link
            to="/my-memes"
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isActive('/my-memes')
                ? 'bg-themed-accent text-themed-inverse'
                : 'text-themed-secondary hover:bg-themed-secondary'
            }`}
          >
            My Memes
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isActive('/admin')
                  ? 'bg-themed-accent text-themed-inverse'
                  : 'text-themed-secondary hover:bg-themed-secondary'
              }`}
            >
              Admin
            </Link>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}

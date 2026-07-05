import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 w-full z-50 bg-bg/80 backdrop-blur-xl border-b border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group" aria-label="Pulse home">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/[0.12] border border-accent/25 text-accent transition-colors group-hover:bg-accent/20">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M2 12h4l2-5 3 10 2.5-6 1.5 3H22"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-lg font-bold tracking-tight text-ink">Pulse</span>
          </Link>

          {/* Center nav */}
          {user && (
            <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
              <Link
                to="/"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/')
                    ? 'text-ink bg-white/5'
                    : 'text-ink-muted hover:text-ink hover:bg-white/5'
                }`}
              >
                Feed
              </Link>
              <Link
                to="/search"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/search')
                    ? 'text-ink bg-white/5'
                    : 'text-ink-muted hover:text-ink hover:bg-white/5'
                }`}
              >
                Explore
              </Link>
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  to="/search"
                  aria-label="Search"
                  className={`p-2 rounded-lg transition-colors ${
                    isActive('/search')
                      ? 'text-accent bg-white/5'
                      : 'text-ink-muted hover:text-ink hover:bg-white/5'
                  }`}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </Link>

                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center gap-2.5 rounded-full pl-2.5 pr-1 py-1 hover:bg-white/5 transition-colors group"
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen}
                  >
                    <span className="hidden md:block text-sm font-medium text-ink-muted group-hover:text-ink transition-colors">
                      {user.username}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-xs font-semibold text-ink border border-line group-hover:border-accent/50 transition-colors overflow-hidden">
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(user.username)
                      )}
                    </div>
                  </button>

                  {isMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-52 card shadow-pop py-1.5 animate-fade-up origin-top-right"
                    >
                      <Link
                        to={`/u/${user.username}`}
                        onClick={() => setIsMenuOpen(false)}
                        role="menuitem"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-muted hover:bg-white/5 hover:text-ink transition-colors"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        Profile
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setIsMenuOpen(false)}
                        role="menuitem"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-muted hover:bg-white/5 hover:text-ink transition-colors"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Settings
                      </Link>
                      <div className="h-px bg-line my-1.5 mx-2" />
                      <button
                        onClick={logout}
                        role="menuitem"
                        className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm">
                  Log in
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  Join Pulse
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

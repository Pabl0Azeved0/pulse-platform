import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  // Close menu when clicking outside
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
    <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* LEFT: Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-tr from-pulse-blue to-pulse-green rounded-full animate-pulse group-hover:scale-110 transition-transform" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-tighter">
              PULSE
            </span>
          </Link>

          {/* CENTER: Desktop Navigation (New addition) */}
          {user && (
            <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
              <Link
                to="/"
                className={`text-sm font-bold transition-colors ${
                  isActive('/') ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Feed
              </Link>
              <Link
                to="/search"
                className={`text-sm font-bold transition-colors ${
                  isActive('/search') ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Explore
              </Link>
            </div>
          )}

          {/* RIGHT SIDE: Icons & Dropdown */}
          <div className="flex items-center gap-6">
            {user ? (
              // --- LOGGED IN STATE ---
              <>
                {/* Search Icon (Visible on Mobile/Tablet or as quick access) */}
                <Link
                  to="/search"
                  className={`transition-colors p-2 rounded-full hover:bg-white/5 ${
                    isActive('/search') ? 'text-pulse-blue' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </Link>

                {/* User Dropdown */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center gap-3 focus:outline-none group"
                  >
                    <span className="hidden md:block text-sm font-bold text-gray-300 group-hover:text-white transition-colors">
                      {user.username}
                    </span>

                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-white font-bold border border-white/20 group-hover:border-pulse-blue transition-all overflow-hidden">
                      {user.avatar ? (
                        <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(user.username)
                      )}
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-3 w-48 bg-gray-900 rounded-xl shadow-2xl py-2 border border-white/10 ring-1 ring-black ring-opacity-5 animate-fade-in origin-top-right">
                      {/* My Profile Link */}
                      <Link
                        to={`/u/${user.username}`}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        My Profile
                      </Link>

                      <div className="h-px bg-white/10 my-1 mx-2" />

                      {/* Logout */}
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
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
              // --- LOGGED OUT STATE ---
              <>
                <Link
                  to="/login"
                  className="text-gray-300 hover:text-white transition-colors text-sm font-bold tracking-wide"
                >
                  LOG IN
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-pulse-blue to-pulse-green text-black font-bold py-2 px-6 rounded-full text-sm hover:opacity-90 hover:shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all"
                >
                  JOIN
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

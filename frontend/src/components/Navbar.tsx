import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Helper to get initials (e.g., "Pablo" -> "PA")
  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  return (
    <nav className="fixed top-0 w-full z-50 bg-pulse-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pulse-blue to-pulse-green">
              PULSE
            </span>
          </Link>

          {/* RIGHT SIDE: Conditional Rendering */}
          <div className="flex items-center gap-4">
            
            {user ? (
              // --- LOGGED IN STATE ---
              <div className="relative">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 focus:outline-none"
                >
                  <span className="hidden md:block text-sm font-medium text-gray-300">
                    {user.username}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pulse-blue to-pulse-green flex items-center justify-center text-black font-bold border-2 border-transparent hover:border-white transition-all">
                    {getInitials(user.username)}
                  </div>
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-pulse-dark rounded-md shadow-lg py-1 border border-white/10 ring-1 ring-black ring-opacity-5">
                    <Link to="/settings" className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5">
                      Settings
                    </Link>
                    <button 
                      onClick={logout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // --- LOGGED OUT STATE ---
              <>
                <Link to="/login" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="bg-gradient-to-r from-pulse-blue to-pulse-green text-black font-bold py-2 px-4 rounded-full text-sm hover:opacity-90 transition-opacity"
                >
                  Register
                </Link>
              </>
            )}

          </div>
        </div>
      </div>
    </nav>
  );
}
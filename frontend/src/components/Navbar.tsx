import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-pulse-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* LEFT SIDE: Logo & Home */}
          <div className="flex items-center gap-8">
            {/* The Logo: Gradient Text */}
            <Link to="/" className="text-2xl font-bold tracking-tighter">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pulse-blue to-pulse-green">
                PULSE
              </span>
            </Link>
            
            <Link to="/" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
              Home
            </Link>
          </div>

          {/* RIGHT SIDE: Auth Buttons */}
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
              Login
            </Link>
            
            <Link 
              to="/register" 
              className="bg-gradient-to-r from-pulse-blue to-pulse-green text-black font-bold py-2 px-4 rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              Register
            </Link>
          </div>

        </div>
      </div>
    </nav>
  );
}

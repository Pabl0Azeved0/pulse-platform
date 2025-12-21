import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './Login';
import Register from './Register';
import Home from './Home';
import { AuthProvider } from './context/AuthContext';
import Settings from './Settings';
import Profile from './Profile';
import Search from './Search';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-pulse-black text-white font-sans">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/u/:username" element={<Profile />} />
            <Route path="/search" element={<Search />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

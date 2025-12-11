import PulseWave from './components/PulseWave';
import Feed from './Feed'; // <--- Import Feed
import { useAuth } from './context/AuthContext'; // <--- Import Auth

export default function Home() {
  const { user } = useAuth(); // <--- Check logic

  // --- IF LOGGED IN: SHOW FEED ---
  if (user) {
    return <Feed />;
  }

  // --- IF LOGGED OUT: SHOW LANDING PAGE ---
  return (
    <div className="pt-24 pb-20 px-4 max-w-7xl mx-auto">
      {/* ... keeping your existing Hero/Landing code here ... */}
      <div className="text-center mb-20">
        <div className="mb-6 flex justify-center">
          <PulseWave />
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
          Feel the <span className="text-transparent bg-clip-text bg-gradient-to-r from-pulse-blue to-pulse-green">Pulse</span>
        </h1>
        {/* ... rest of the landing page ... */}
         <div className="flex justify-center gap-4">
          <a href="/register" className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition">
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
}

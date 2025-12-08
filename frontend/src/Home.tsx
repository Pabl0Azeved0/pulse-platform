import PulseWave from './components/PulseWave';

export default function Home() {
  // Mock Data for the feed
  const posts = [
    { id: 1, user: 'Alex', content: 'Just deployed the new backend! 🚀 #python #graphql', time: '2h ago' },
    { id: 2, user: 'Sarah', content: 'Does anyone know a good gym in Rio? 🏋️‍♀️', time: '4h ago' },
    { id: 3, user: 'PulseTeam', content: 'Welcome to the future of social networking.', time: 'Just now' },
  ];

  return (
    <div className="pt-24 pb-20 px-4 max-w-7xl mx-auto">
      
      {/* --- HERO SECTION --- */}
      <div className="text-center mb-20">
        <div className="mb-6 flex justify-center">
          <PulseWave />
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
          Feel the <span className="text-transparent bg-clip-text bg-gradient-to-r from-pulse-blue to-pulse-green">Pulse</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          The real-time social platform for developers, creators, and athletes. 
          Connect instantly. No algorithms. Just pure signal.
        </p>
        
        <div className="flex justify-center gap-4">
          <a href="/register" className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition">
            Get Started
          </a>
          <a href="#feed" className="px-8 py-3 border border-white/20 rounded-full hover:bg-white/10 transition">
            Explore Feed
          </a>
        </div>
      </div>

      {/* --- MOCK APP "VIDEO" PREVIEW --- */}
      <div className="relative mx-auto max-w-4xl mb-24 rounded-xl border border-white/10 shadow-2xl overflow-hidden bg-pulse-dark">
        {/* Fake Window Header */}
        <div className="bg-black/50 px-4 py-2 flex items-center gap-2 border-b border-white/5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <div className="ml-4 text-xs text-gray-500 font-mono">pulse-platform.exe</div>
        </div>
        
        {/* Fake Video Content (A simple animation of a chat) */}
        <div className="h-64 md:h-96 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-8 relative">
           <div className="absolute inset-0 flex items-center justify-center opacity-30">
              <PulseWave />
           </div>
           <div className="z-10 bg-black/80 backdrop-blur border border-white/10 p-6 rounded-lg max-w-sm w-full animate-bounce-slow">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-full bg-pulse-blue"></div>
                 <div>
                    <div className="h-3 w-24 bg-gray-700 rounded mb-1"></div>
                    <div className="h-2 w-16 bg-gray-800 rounded"></div>
                 </div>
              </div>
              <div className="space-y-2">
                 <div className="h-2 w-full bg-gray-800 rounded"></div>
                 <div className="h-2 w-3/4 bg-gray-800 rounded"></div>
              </div>
           </div>
        </div>
      </div>

      {/* --- EXAMPLE FEED --- */}
      <div id="feed" className="max-w-2xl mx-auto">
        <h3 className="text-2xl font-bold mb-8 border-b border-white/10 pb-4">Latest Activity</h3>
        <div className="space-y-6">
          {posts.map(post => (
            <div key={post.id} className="bg-pulse-dark p-6 rounded-xl border border-white/5 hover:border-pulse-blue/50 transition-colors cursor-default">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center font-bold text-white">
                    {post.user[0]}
                  </div>
                  <span className="font-bold text-white">{post.user}</span>
                </div>
                <span className="text-xs text-gray-500">{post.time}</span>
              </div>
              <p className="text-gray-300 leading-relaxed">
                {post.content}
              </p>
              <div className="mt-4 flex gap-4 text-gray-500 text-sm">
                <button className="hover:text-pulse-green transition">Like</button>
                <button className="hover:text-pulse-blue transition">Comment</button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

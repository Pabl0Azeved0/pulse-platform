export default function PulseWave() {
  return (
    <div className="flex items-end justify-center gap-1 h-16 w-full">
      {[...Array(5)].map((_, i) => (
        <div 
          key={i}
          className="w-3 bg-gradient-to-t from-pulse-blue to-pulse-green rounded-full animate-pulse"
          style={{ 
            height: '100%', 
            animationDuration: `${0.8 + i * 0.2}s`,
            animationName: 'bounce' 
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 100% { height: 20%; opacity: 0.5; }
          50% { height: 100%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}

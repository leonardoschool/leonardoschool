'use client';

export default function ScienceCanvasLight() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black" />
      
      {/* Floating science symbols - CSS only */}
      <div className="absolute inset-0">
        {/* Math symbols */}
        <div className="absolute top-[10%] left-[15%] text-6xl text-[#D54F8A] opacity-20 animate-float-slow">∫</div>
        <div className="absolute top-[70%] left-[10%] text-5xl text-[#D54F8A] opacity-30 animate-float-medium" style={{animationDelay: '2s'}}>π</div>
        <div className="absolute top-[40%] left-[85%] text-7xl text-[#D54F8A] opacity-25 animate-float-fast">∑</div>
        <div className="absolute top-[85%] left-[80%] text-4xl text-[#D54F8A] opacity-20 animate-float-slow" style={{animationDelay: '4s'}}>∞</div>
        
        {/* Chemistry symbols */}
        <div className="absolute top-[25%] left-[75%] text-5xl text-[#68BCE8] opacity-25 animate-float-medium" style={{animationDelay: '1s'}}>H₂O</div>
        <div className="absolute top-[60%] left-[20%] text-6xl text-[#68BCE8] opacity-30 animate-float-fast" style={{animationDelay: '3s'}}>CO₂</div>
        <div className="absolute top-[15%] left-[45%] text-4xl text-[#68BCE8] opacity-20 animate-float-slow" style={{animationDelay: '5s'}}>ATP</div>
        
        {/* Biology symbols */}
        <div className="absolute top-[50%] left-[5%] text-7xl opacity-20 animate-float-fast" style={{animationDelay: '1.5s'}}>🧬</div>
        <div className="absolute top-[30%] left-[90%] text-6xl opacity-25 animate-float-medium" style={{animationDelay: '2.5s'}}>🔬</div>
        <div className="absolute top-[80%] left-[50%] text-5xl opacity-30 animate-float-slow" style={{animationDelay: '3.5s'}}>🧫</div>
        
        {/* Physics symbols */}
        <div className="absolute top-[45%] left-[60%] text-5xl text-[#EEB550] opacity-25 animate-float-medium" style={{animationDelay: '0.5s'}}>E=mc²</div>
        <div className="absolute top-[20%] left-[25%] text-6xl text-[#EEB550] opacity-20 animate-float-fast" style={{animationDelay: '4.5s'}}>⚛️</div>
        <div className="absolute top-[65%] left-[70%] text-4xl text-[#EEB550] opacity-30 animate-float-slow" style={{animationDelay: '1s'}}>⚡</div>
        
        {/* Additional symbols for more coverage */}
        <div className="absolute top-[35%] left-[35%] text-5xl text-[#B5B240] opacity-15 animate-float-medium" style={{animationDelay: '2.8s'}}>λ</div>
        <div className="absolute top-[75%] left-[40%] text-6xl text-[#D54F8A] opacity-20 animate-float-fast" style={{animationDelay: '3.2s'}}>∇</div>
        <div className="absolute top-[10%] left-[65%] text-4xl text-[#68BCE8] opacity-25 animate-float-slow" style={{animationDelay: '1.8s'}}>DNA</div>
      </div>

      {/* Glowing orbs */}
      <div className="absolute top-[20%] left-[20%] w-64 h-64 bg-[#D54F8A] rounded-full blur-[100px] opacity-10 animate-pulse-slow" />
      <div className="absolute top-[60%] right-[15%] w-80 h-80 bg-[#68BCE8] rounded-full blur-[120px] opacity-15 animate-pulse-slow" style={{animationDelay: '2s'}} />
      <div className="absolute bottom-[10%] left-[50%] w-72 h-72 bg-[#EEB550] rounded-full blur-[110px] opacity-10 animate-pulse-slow" style={{animationDelay: '4s'}} />

      {/* Rotating DNA helix */}
      <div className="absolute top-[15%] right-[10%] animate-spin-slow opacity-10">
        <svg width="120" height="240" viewBox="0 0 100 200" className="text-red-500">
          <path
            d="M 30 0 Q 50 25, 30 50 T 30 100 T 30 150 T 30 200"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M 70 0 Q 50 25, 70 50 T 70 100 T 70 150 T 70 200"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
          />
        </svg>
      </div>

      {/* Atom structure */}
      <div className="absolute bottom-[20%] left-[10%] opacity-10">
        <svg width="150" height="150" viewBox="0 0 100 100" className="text-blue-400">
          <circle cx="50" cy="50" r="5" fill="currentColor" />
          <ellipse cx="50" cy="50" rx="40" ry="15" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" />
          <ellipse cx="50" cy="50" rx="40" ry="15" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" style={{ animationDirection: 'reverse' }} />
          <ellipse cx="50" cy="50" rx="15" ry="40" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" />
        </svg>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EmbedMind AI — Command Console Portal',
  description: 'Tactical authentication node link.',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[#050505] text-[#F8FAFC] flex items-center justify-center p-4 md:p-8 overflow-hidden select-none font-sans scanlines">
      
      {/* 1. FUTURISTIC SCIFI SCANLINE GRID BACKGROUND */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#150000_1px,transparent_1px),linear-gradient(to_bottom,#150000_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] opacity-40 z-0"></div>
      
      {/* 2. PCB SCHEMATIC RED DRAWING WATERMARK */}
      <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden opacity-25">
        <svg className="w-full h-full min-w-[1200px]" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="red-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="redTraceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c1121f" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#e10600" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#050505" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Central ARM Cortex Style Watermark Core Grid */}
          <g transform="translate(960, 540)">
            <circle cx="0" cy="0" r="160" fill="none" stroke="#2a0000" strokeWidth="1" strokeDasharray="4,12" />
            
            {/* Silicon Chip Body (Black/Red package) */}
            <rect x="-80" y="-80" width="160" height="160" rx="4" fill="#101010" stroke="#2a0000" strokeWidth="3" />
            <rect x="-70" y="-70" width="140" height="140" fill="none" stroke="#e10600" strokeWidth="1" opacity="0.3" />
            
            {/* Metal pins leads */}
            {[-70, -50, -30, -10, 10, 30, 50, 70].map((pos) => (
              <g key={pos}>
                <line x1={pos} y1="-80" x2={pos} y2="-95" stroke="#e10600" strokeWidth="1.5" opacity="0.6" />
                <line x1={pos} y1="80" x2={pos} y2="95" stroke="#e10600" strokeWidth="1.5" opacity="0.6" />
                <line x1="-80" y1={pos} x2="-95" y2={pos} stroke="#e10600" strokeWidth="1.5" opacity="0.6" />
                <line x1="80" y1={pos} x2="95" y2={pos} stroke="#e10600" strokeWidth="1.5" opacity="0.6" />
              </g>
            ))}

            {/* Neural Net connections inside Cortex (glowing red) */}
            <circle cx="-35" cy="-30" r="2.5" fill="#e10600" />
            <circle cx="35" cy="-20" r="2.5" fill="#c1121f" />
            <circle cx="-20" cy="30" r="2.5" fill="#e10600" />
            <circle cx="25" cy="35" r="2.5" fill="#e10600" filter="url(#red-glow)" />
            <circle cx="0" cy="0" r="6" fill="#e10600" filter="url(#red-glow)" />
            
            <line x1="-35" y1="-30" x2="0" y2="0" stroke="#e10600" strokeWidth="1" opacity="0.5" />
            <line x1="35" y1="-20" x2="0" y2="0" stroke="#e10600" strokeWidth="1" opacity="0.5" />
            <line x1="-20" y1="30" x2="0" y2="0" stroke="#c1121f" strokeWidth="1" opacity="0.5" />
            <line x1="25" y1="35" x2="0" y2="0" stroke="#e10600" strokeWidth="1" opacity="0.5" />
          </g>

          {/* Glowing Red traces extending across background */}
          <path d="M 865 445 L 600 445 L 450 295 L 100 295" stroke="url(#redTraceGrad)" strokeWidth="1.5" fill="none" />
          <path id="tr_path1" d="M 865 445 L 600 445 L 450 295 L 100 295" stroke="none" fill="none" />
          
          <path d="M 1055 445 L 1300 445 L 1450 295 L 1800 295" stroke="url(#redTraceGrad)" strokeWidth="1.5" fill="none" />
          <path id="tr_path2" d="M 1055 445 L 1300 445 L 1450 295 L 1800 295" stroke="none" fill="none" />
          
          <path d="M 865 635 L 620 635 L 480 775 L 200 775" stroke="url(#redTraceGrad)" strokeWidth="1.5" fill="none" />
          <path id="tr_path3" d="M 865 635 L 620 635 L 480 775 L 200 775" stroke="none" fill="none" />
          
          <path d="M 1055 635 L 1320 635 L 1460 775 L 1750 775" stroke="url(#redTraceGrad)" strokeWidth="1.5" fill="none" />
          <path id="tr_path4" d="M 1055 635 L 1320 635 L 1460 775 L 1750 775" stroke="none" fill="none" />

          {/* Slow-moving Red Data Packets */}
          <circle r="3.5" fill="#e10600" filter="url(#red-glow)">
            <animateMotion dur="6s" repeatCount="indefinite">
              <mpath href="#tr_path1" />
            </animateMotion>
          </circle>
          <circle r="3.5" fill="#e10600" filter="url(#red-glow)">
            <animateMotion dur="8s" repeatCount="indefinite" begin="2s">
              <mpath href="#tr_path2" />
            </animateMotion>
          </circle>
          <circle r="3.5" fill="#e10600" filter="url(#red-glow)">
            <animateMotion dur="7s" repeatCount="indefinite" begin="1s">
              <mpath href="#tr_path3" />
            </animateMotion>
          </circle>
          <circle r="3.5" fill="#e10600" filter="url(#red-glow)">
            <animateMotion dur="9s" repeatCount="indefinite" begin="3s">
              <mpath href="#tr_path4" />
            </animateMotion>
          </circle>
        </svg>
      </div>

      {/* 3. SHIELD CORE GRID STRUCTURAL WRAPPER */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        
        {/* Left Side Column: Centered Login Card */}
        <div className="lg:col-span-7 flex justify-center w-full">
          <div className="w-full max-w-md bg-[#101010]/95 border-y-2 lg:border-x-2 border-[#2a0000] shadow-neon-red shadow-black/80 rounded-2xl p-8 md:p-10 space-y-6 relative overflow-hidden transition-all duration-300">
            {/* Top and Bottom red glowing charging rails */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#e10600] to-transparent animate-pulse"></div>
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#e10600] to-transparent animate-pulse"></div>
            
            {children}
          </div>
        </div>

        {/* Right Side Column: Mission Control Panel Info */}
        <div className="lg:col-span-5 hidden lg:block space-y-8 pr-4 font-sans">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#2a0000]/60 border border-[#e10600]/40 text-[10px] font-bold text-[#e10600] tracking-widest uppercase font-orbitron">
              JARVIS CONTROL NODE
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white font-orbitron uppercase">
              EmbedMind <span className="text-[#e10600]">AI</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed font-rajdhani">
              Next-generation multi-agent command shell orchestrating device blueprints, pin layouts, optimized C++ drivers, and debugger stack logic.
            </p>
          </div>

          {/* Feature highlights with red custom markers */}
          <div className="space-y-4 pt-2 font-rajdhani">
            {[
              { title: 'AI State-Graph Co-orchestrator', desc: 'Collaborating design agents managing telemetry constraints.' },
              { title: 'Interactive Board Synthesis', desc: 'Real-time BOM analysis, peripheral lists, and MCU maps.' },
              { title: 'Tactical Firmware Generator', desc: 'Automated drivers generation integrated with Monaco Editor.' },
              { title: 'Compiler Static Debugger', desc: 'Upload code loops to audit logic leaks and register warnings.' }
            ].map((feat, idx) => (
              <div key={idx} className="flex gap-4 items-start">
                {/* Red warning check tick */}
                <div className="mt-1 flex-shrink-0 w-4 h-4 rounded bg-[#101010] border border-[#e10600] flex items-center justify-center text-[9px] font-bold text-[#e10600] shadow-neon-red">
                  ▲
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">{feat.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Secure label and metadata */}
          <div className="border-t border-[#2a0000] pt-6 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>CORE NODE: SECURE</span>
            <span className="flex items-center gap-1.5 text-[#e10600] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e10600] animate-pulse-red"></span>
              FIREWALL: ACTIVE
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

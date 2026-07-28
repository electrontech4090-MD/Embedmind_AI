'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, initialize, logout, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#050505] text-[#e10600]">
        <div className="flex flex-col items-center gap-4 font-mono">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <div className="absolute h-full w-full rounded-full border-2 border-[#2a0000]"></div>
            <div className="absolute h-full w-full rounded-full border-t-2 border-[#e10600] animate-spin"></div>
          </div>
          <span className="text-xs font-bold tracking-widest uppercase animate-pulse">CONNECTING SECURE TUNNEL...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const projectMatch = pathname.match(/\/projects\/([^\/]+)/);
  const activeProjectId = projectMatch ? projectMatch[1] : null;

  return (
    <div className="flex h-screen bg-[#050505] text-slate-100 font-sans overflow-hidden scanlines">
      
      {/* 1. FUTURISTIC SIDEBAR CONTROL DECK */}
      <aside className="w-64 bg-[#101010] border-r border-[#2a0000] flex flex-col flex-shrink-0 relative">
        <div className="absolute top-0 right-0 bottom-0 w-[1px] bg-gradient-to-b from-[#e10600]/10 via-[#e10600]/5 to-transparent"></div>
        
        {/* Sidebar Brand header */}
        <div className="h-16 flex items-center px-6 border-b border-[#2a0000] bg-[#151515] relative">
          <Link href="/dashboard" className="flex items-center gap-3.5 group">
            <div className="w-8 h-8 rounded bg-[#101010] border border-[#e10600] flex items-center justify-center text-[#e10600] font-bold text-xs shadow-neon-red font-orbitron">
              EM
            </div>
            <span className="font-black tracking-widest text-white font-orbitron text-sm uppercase group-hover:text-[#e10600] transition">
              EmbedMind <span className="text-[#e10600]">AI</span>
            </span>
          </Link>
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#e10600]/40 to-transparent"></div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto font-rajdhani">
          
          {/* General Navigation */}
          <div className="space-y-1">
            <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">// CORE NODES</div>
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 px-3 py-2 rounded border text-xs font-bold uppercase tracking-wider transition ${
                pathname === '/dashboard'
                  ? 'bg-[#2a0000]/30 text-[#e10600] border-[#e10600]/40 shadow-neon-red-inset'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-[#151515]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Control Dashboard
            </Link>
          </div>

          {/* Contextual Project links */}
          {activeProjectId && (
            <Suspense fallback={<div className="text-slate-500 text-[10px] px-3 font-mono">// TUNNEL_CONNECT...</div>}>
              <SidebarProjectLinks activeProjectId={activeProjectId} pathname={pathname} />
            </Suspense>
          )}

          {/* Sci-Fi Server Health monitors inside sidebar */}
          <div className="space-y-2 pt-4 border-t border-[#2a0000]/60">
            <div className="px-3 mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">// LOCAL SERVICE HEALTH</div>
            <div className="space-y-1.5 px-3 font-mono text-[9px] text-slate-400">
              <div className="flex justify-between items-center">
                <span>SQLITE_REPO</span>
                <span className="text-[#00ff88]">● ACTIVE</span>
              </div>
              <div className="flex justify-between items-center">
                <span>GEMINI_API</span>
                <span className="text-[#00ff88]">● ONLINE</span>
              </div>
              <div className="flex justify-between items-center">
                <span>GRAPH_ROUTER</span>
                <span className="text-[#e10600] animate-pulse">● ROUTING</span>
              </div>
            </div>
          </div>
        </nav>

        {/* User profile footer */}
        <div className="p-4 border-t border-[#2a0000] bg-[#151515] flex items-center justify-between font-mono text-[10px]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded bg-[#101010] border border-[#2a0000] flex items-center justify-center font-bold text-slate-300">
              {user?.email?.charAt(0).toUpperCase() || 'E'}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-slate-400 truncate">{user?.email || 'Engineer'}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded hover:bg-[#202020] text-slate-400 hover:text-[#e10600] transition cursor-pointer"
            title="Disconnect node authentication"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      {/* 2. MAIN MISSION CENTER SHELL CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Top Header Deck featuring CPU, Memory and GPU logs */}
        <header className="h-16 border-b border-[#2a0000] bg-[#101010]/95 flex items-center justify-between px-8 z-10 font-mono text-[10px]">
          <div className="flex items-center gap-4">
            <span className="font-bold tracking-widest text-slate-400 uppercase font-orbitron">SYSTEM CONTROL DECK</span>
            <div className="flex items-center gap-2 px-2.5 py-0.5 rounded bg-[#2a0000]/60 border border-[#e10600]/30 text-xs font-bold text-[#e10600]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e10600] animate-pulse-red"></span>
              SECURE CONNECTED
            </div>
          </div>

          {/* System resource monitors grid */}
          <div className="hidden md:flex items-center gap-6 text-slate-400">
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-slate-500">HOST_CPU</span>
              <span className="font-bold text-white">12.4%</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-slate-500">HOST_RAM</span>
              <span className="font-bold text-white">4.8 GB</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-slate-500">AI_QUOTA</span>
              <span className="font-bold text-[#00ff88]">98%</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-slate-500">CORE_TEMP</span>
              <span className="font-bold text-[#e10600]">44°C</span>
            </div>
          </div>
        </header>

        {/* Dynamic Inner views */}
        <main className="flex-1 overflow-auto bg-[#050505]">
          {children}
        </main>
      </div>

    </div>
  );
}

function SidebarProjectLinks({ activeProjectId, pathname }: { activeProjectId: string, pathname: string }) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'requirements';

  return (
    <div className="space-y-1">
      <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">// ACTIVE WORKSPACE</div>
      {[
        { id: 'requirements', label: 'Requirement Agent', icon: '📝' },
        { id: 'design', label: 'Embedded Design', icon: '🔌' },
        { id: 'firmware', label: 'Firmware Developer', icon: '💻' },
        { id: 'debugger', label: 'Code Auditor', icon: '🐞' },
        { id: 'reports', label: 'Documentation Agent', icon: '📊' }
      ].map((tab) => {
        const isActive = pathname.startsWith(`/projects/${activeProjectId}`) && currentTab === tab.id;
        return (
          <Link
            key={tab.id}
            href={`/projects/${activeProjectId}?tab=${tab.id}`}
            className={`flex items-center gap-3 px-3 py-2 rounded border text-xs font-bold uppercase tracking-wider transition ${
              isActive
                ? 'bg-[#2a0000]/30 text-[#e10600] border-[#e10600]/40 shadow-neon-red-inset'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-[#151515]'
            }`}
          >
            <span className="text-xs shrink-0">{tab.icon}</span>
            <span className="truncate">{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

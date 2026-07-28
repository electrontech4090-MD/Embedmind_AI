'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';

interface Project {
  id: string;
  name: string;
  status: string;
  created_at: string;
  requirement_doc?: {
    status: string;
  };
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [initialIdea, setInitialIdea] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const router = useRouter();

  const fetchProjects = async () => {
    try {
      const data = await apiRequest('/api/v1/projects');
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setIsCreating(true);
    try {
      const res = await apiRequest('/api/v1/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          initial_idea: initialIdea || null,
        }),
      });
      
      setShowCreateModal(false);
      router.push(`/projects/${res.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create project.');
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-10 space-y-8 relative font-sans">
      
      {/* Background blueprint glows */}
      <div className="absolute top-10 right-10 w-96 h-96 bg-[#e10600]/5 rounded-full blur-3xl pointer-events-none z-0 animate-pulse"></div>

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#2a0000] pb-6 relative z-10">
        <div>
          <span className="text-[9px] font-bold tracking-widest text-[#e10600] uppercase font-mono bg-[#2a0000]/40 px-2 py-0.5 border border-[#e10600]/30 rounded">
            COMMAND CONTROL OVERVIEW
          </span>
          <h1 className="text-3xl font-black text-white tracking-widest mt-1.5 uppercase font-orbitron">
            OPERATING SYSTEM DECK
          </h1>
          <p className="text-xs text-slate-400 font-rajdhani tracking-wider uppercase font-semibold">Orchestrate and deploy collaborating AI agents to synthesize hardware & firmware.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-3 rounded font-black text-white bg-gradient-to-r from-[#c1121f] to-[#e10600] hover:from-[#e10600] hover:to-[#ff2a24] shadow-neon-red transition cursor-pointer text-xs border border-[#e10600]/40 uppercase tracking-widest font-orbitron"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          ALLOCATE NODE TERMINAL
        </button>
      </div>

      {error && (
        <div className="p-4 rounded border border-[#e10600]/40 bg-[#c1121f]/10 text-rose-300 text-xs font-mono">
          [ERROR] {error}
        </div>
      )}

      {/* 1. FUTURISTIC RESOURCE GAUGES AND COUNTERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
        {[
          { label: 'Active Workspace Nodes', val: projects.length, desc: 'Allocated core directories', color: 'text-[#e10600]' },
          { label: 'Sub-agent Threads Active', val: '5 ONLINE', desc: 'LangGraph orchestrators ready', color: 'text-[#e10600]' },
          { label: 'Synthesizer Stability', val: '99.4%', desc: 'Gemini request success', color: 'text-[#00ff88]' },
          { label: 'Firmware Line Counter', val: '12,480 Lines', desc: 'Synthesized C++ code stubs', color: 'text-white' },
        ].map((stat, i) => (
          <div key={i} className="p-5 rounded border border-[#2a0000] bg-[#101010]/80 shadow-neon-red-inset hover:border-[#e10600]/40 transition duration-150 flex flex-col justify-between space-y-3 font-mono">
            <span className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">{stat.label}</span>
            <div className={`text-2xl font-black ${stat.color} font-orbitron`}>{stat.val}</div>
            <span className="text-[9px] text-slate-400 font-sans tracking-wide leading-none">{stat.desc}</span>
          </div>
        ))}
      </div>

      {/* 2. PIPELINE GRAPH AND ACTIVITY GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Left Side: Pipeline visualizer (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded border border-[#2a0000] bg-[#101010]/70 flex flex-col justify-between space-y-6">
          <div className="space-y-1">
            <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-[#e10600] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e10600] animate-pulse-red"></span>
              // ACTIVE COLLABORATION MATRIX ROUTER
            </h3>
            <p className="text-[11px] text-slate-400 font-rajdhani font-semibold tracking-wider uppercase">Pipeline flow diagrams tracking state changes across agents</p>
          </div>

          {/* Node graph flow */}
          <div className="grid grid-cols-5 gap-3 items-center justify-between text-center font-mono py-4 overflow-x-auto">
            {[
              { id: 'req', title: 'Requirements Spec', icon: '📝', desc: 'Specs definition', active: true },
              { id: 'design', title: 'Hardware Design', icon: '🔌', desc: 'MCU BOM/Pins', active: true },
              { id: 'firmware', title: 'Firmware Dev', icon: '💻', desc: 'Monaco C++ stub', active: true },
              { id: 'debugger', title: 'Code Auditor', icon: '🐞', desc: 'Leaks debugger', active: true },
              { id: 'reports', title: 'Reports Agent', icon: '📊', desc: 'PDF and README', active: true }
            ].map((node, i) => (
              <React.Fragment key={node.id}>
                {i > 0 && (
                  <div className="text-[#2a0000] text-xs font-bold shrink-0 select-none animate-pulse-red">──▶</div>
                )}
                <div className="p-3.5 rounded border border-[#2a0000] bg-[#050505] flex flex-col items-center space-y-2 shrink-0 min-w-[125px] hover:border-[#e10600]/40 transition shadow-neon-red-inset">
                  <span className="text-lg">{node.icon}</span>
                  <div className="text-[10px] font-black text-white font-orbitron uppercase tracking-wider leading-tight">{node.title}</div>
                  <div className="text-[8px] text-slate-500 leading-none">{node.desc}</div>
                </div>
              </React.Fragment>
            ))}
          </div>

          <div className="text-[9px] text-slate-500 font-mono flex justify-between items-center border-t border-[#2a0000]/60 pt-4">
            <span>GRAPH STATE: PIPELINE ROUTING INACTIVE (WAITING INTERRUPT EVENT)</span>
            <span className="flex items-center gap-1.5 text-[#e10600] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e10600] animate-pulse-red"></span>
              ORCHESTRATOR ONLINE
            </span>
          </div>
        </div>

        {/* Right Side: health monitor logs (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded border border-[#2a0000] bg-[#101010]/70 flex flex-col justify-between space-y-6">
          <div className="space-y-1">
            <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-[#e10600]">// LIVE SOCKET MONITORS</h3>
            <p className="text-[11px] text-slate-400 font-rajdhani font-semibold tracking-wider uppercase">Active service nodes statistics</p>
          </div>

          {/* Sockets */}
          <div className="space-y-2 font-mono text-[9px] text-slate-300">
            {[
              { label: 'SQLite DB Transaction Sockets', val: 'Online (0.2ms)', active: true },
              { label: 'Gemini Generative API key', val: 'Quota Valid', active: true },
              { label: 'Active LangGraph Pipeline Threads', val: 'Listening', active: true },
              { label: 'Monaco editor syntax compiler', val: 'Stubs active', active: true }
            ].map((mon, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 rounded border border-[#2a0000] bg-[#050505] shadow-neon-red-inset">
                <div>
                  <div className="font-bold text-white uppercase">{mon.label}</div>
                  <div className="text-slate-500 text-[8px]">{mon.val}</div>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#2a0000]/60 border border-[#e10600]/40 text-[#e10600]">
                  READY
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. WORKSPACE DIRECTORY CARDS SECTION */}
      <div className="space-y-4 relative z-10">
        <div className="space-y-1">
          <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-500">// ALLOCATED CORE DIRECTORIES</h2>
          <p className="text-xs text-slate-400 font-rajdhani tracking-wider uppercase font-semibold">Select an active node directory to initialize workspace session.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-44 rounded border border-[#2a0000] bg-[#101010]/80 p-6 animate-pulse space-y-4">
                <div className="h-5 bg-slate-900 rounded w-2/3"></div>
                <div className="h-3 bg-slate-900 rounded w-full"></div>
                <div className="h-3 bg-slate-900 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 rounded border border-dashed border-[#2a0000] bg-[#101010]/30 text-center space-y-4">
            <div className="w-14 h-14 rounded bg-[#101010] border border-[#e10600] flex items-center justify-center text-[#e10600] shadow-neon-red">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V4a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-bold text-white font-mono uppercase">// NO_NODES_DETECTION</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1.5 mx-auto font-rajdhani tracking-wider uppercase leading-relaxed font-semibold">
                No active target directories allocated. Allocate a new console terminal to provision agent threads.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded font-black bg-gradient-to-r from-[#c1121f] to-[#e10600] hover:from-[#e10600] hover:to-[#ff2a24] text-xs text-white transition border border-[#e10600]/40 cursor-pointer font-orbitron uppercase tracking-widest"
            >
              PROVISION DIRECTORY NODE
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project) => {
              const isFinalized = project.requirement_doc?.status === 'finalized' || project.status === 'finalized';
              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="group p-5 rounded border border-[#2a0000] bg-[#101010]/80 shadow-neon-red-inset hover:border-[#e10600]/60 hover:bg-[#151010]/90 cursor-pointer transition duration-150 flex flex-col justify-between h-44"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-bold text-white font-orbitron uppercase tracking-widest group-hover:text-[#e10600] transition truncate max-w-[170px]">
                        {project.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold border uppercase tracking-widest ${
                        isFinalized
                          ? 'bg-[#2a0000]/10 border-[#e10600]/30 text-[#e10600] shadow-neon-red'
                          : 'bg-amber-950/20 border-amber-900/30 text-amber-500'
                      }`}>
                        {isFinalized ? 'SYS_DESIGN_ONLINE' : 'REQ_PLANNING'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-rajdhani font-semibold tracking-wider uppercase leading-relaxed line-clamp-2">
                      {isFinalized
                        ? 'Workspace directory mapped. Access hardware pin outlines, Monaco code buffer driver files, and audit compiler debugger logs.'
                        : 'Orchestrating system requirements specifications. Input peripheral goals to generate hardware schematic map.'}
                    </p>
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 flex justify-between items-center border-t border-[#2a0000]/40 pt-3">
                    <span>ALLOCATE IND {new Date(project.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1 text-[#e10600] font-bold group-hover:translate-x-1 transition duration-150">
                      SYNC TUNNEL
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Allocate Project Modal Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded border border-[#2a0000] bg-[#101010] shadow-neon-red p-8 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#e10600]"></div>
            
            <div className="flex justify-between items-start border-b border-[#2a0000] pb-4">
              <div>
                <h3 className="text-md font-bold text-white font-orbitron uppercase tracking-widest">// ALLOCATE_TARGET_DIR</h3>
                <p className="text-slate-400 text-xs mt-1 font-rajdhani font-semibold tracking-wider uppercase">Configure project metrics to boot active orchestrator node.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded hover:bg-[#202020] text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1.5 font-rajdhani">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono" htmlFor="project-name">
                  Target Directory Name (Project Name)
                </label>
                <input
                  id="project-name"
                  type="text"
                  placeholder="e.g. WeatherStation Node 1"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-3 rounded border border-[#2a0000] bg-[#050505] text-white placeholder-slate-700 focus:outline-none focus:border-[#e10600] focus:ring-1 focus:ring-[#e10600]/30 transition text-xs shadow-neon-red-inset"
                  required
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-1.5 font-rajdhani">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="initial-idea">
                  Target Spec Concepts (Optional)
                </label>
                <textarea
                  id="initial-idea"
                  placeholder="Describe board: peripheral components, microcontroller, battery configurations, MQTT telemetry..."
                  value={initialIdea}
                  onChange={(e) => setInitialIdea(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded border border-[#2a0000] bg-[#050505] text-white placeholder-slate-700 focus:outline-none focus:border-[#e10600] focus:ring-1 focus:ring-[#e10600]/30 transition resize-none text-xs leading-relaxed shadow-neon-red-inset"
                  disabled={isCreating}
                />
              </div>

              <div className="flex gap-4 pt-4 justify-end border-t border-[#2a0000]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="px-4 py-2.5 rounded font-bold text-slate-400 hover:text-white bg-[#202020]/40 hover:bg-[#202020] transition text-xs cursor-pointer font-rajdhani"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2.5 rounded font-black text-white bg-gradient-to-r from-[#c1121f] to-[#e10600] hover:from-[#e10600] hover:to-[#ff2a24] transition shadow-neon-red text-xs cursor-pointer border border-[#e10600]/40 font-orbitron uppercase tracking-widest"
                >
                  {isCreating ? 'Provisioning...' : 'Provision Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

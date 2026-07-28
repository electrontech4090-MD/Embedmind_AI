'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest, getAuthToken, API_BASE_URL } from '@/lib/api';
import Editor from '@monaco-editor/react';

interface Message {
  id: string;
  role: string;
  content: string;
  agent_name?: string;
  created_at: string;
}

interface RequirementDoc {
  summary: string;
  goals: string[];
  constraints: string[];
  status: string;
}

interface ComponentItem {
  name: string;
  package: string;
  purpose: string;
}

interface PinMappingItem {
  mcu_pin: string;
  device_pin: string;
  description: string;
}

interface DesignDoc {
  components: ComponentItem[];
  pin_mappings: PinMappingItem[];
  firmware_architecture: string;
  sample_code: string;
}

export default function DesignWorkspacePage() {
  const { projectId } = useParams();
  const [project, setProject] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reqDoc, setReqDoc] = useState<RequirementDoc>({
    summary: 'Initializing requirement analysis...',
    goals: [],
    constraints: [],
    status: 'draft',
  });
  const [designDoc, setDesignDoc] = useState<DesignDoc>({
    components: [],
    pin_mappings: [],
    firmware_architecture: '',
    sample_code: '',
  });
  const [activeTab, setActiveTab] = useState<'requirements' | 'design'>('design'); // default to design in this workspace
  const [isLoading, setIsLoading] = useState(true);

  // UI & SSE states
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [error, setError] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Scroll chat to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, agentStatus]);

  // Load project details, chat history, and design doc
  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        setIsLoading(true);
        const projectData = await apiRequest(`/api/v1/projects/${projectId}`);
        setProject(projectData);
        if (projectData.requirement_doc) {
          setReqDoc({
            summary: projectData.requirement_doc.summary || 'No summary yet.',
            goals: projectData.requirement_doc.goals || [],
            constraints: projectData.requirement_doc.constraints || [],
            status: projectData.requirement_doc.status || 'draft',
          });
        }
        if (projectData.design_doc) {
          setDesignDoc({
            components: projectData.design_doc.components || [],
            pin_mappings: projectData.design_doc.pin_mappings || [],
            firmware_architecture: projectData.design_doc.firmware_architecture || 'No design details yet.',
            sample_code: projectData.design_doc.sample_code || '',
          });
        }
        
        // Load messages filtered by agent_name=design_agent
        const messagesData = await apiRequest(`/api/v1/projects/${projectId}/messages?agent_name=design_agent`);
        setMessages(messagesData);
      } catch (err: any) {
        setError(err.message || 'Error loading project.');
        router.push('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      loadWorkspace();
    }
  }, [projectId, router]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const userMessageContent = inputText.trim();
    setInputText('');
    setIsSending(true);
    setError('');

    // Append user's message locally
    const userMsgLocal: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageContent,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsgLocal]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ 
          content: userMessageContent,
          agent_name: 'design_agent'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start chat stream.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
              const dataStr = line.trim().slice(6).trim();
              if (dataStr) {
                const parsed = JSON.parse(dataStr);
                
                if (parsed.event === 'status') {
                  setAgentStatus(parsed.message);
                } else if (parsed.event === 'message') {
                  setAgentStatus(null);
                  setMessages((prev) => [...prev, parsed.message]);
                  if (parsed.requirement_doc) {
                    setReqDoc(parsed.requirement_doc);
                  }
                  if (parsed.design_doc) {
                    setDesignDoc(parsed.design_doc);
                  }
                } else if (parsed.event === 'error') {
                  setError(parsed.message);
                  setAgentStatus(null);
                }
              }
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Connection lost.');
      setAgentStatus(null);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[#07070a] text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute h-full w-full rounded-full border-2 border-violet-600/20"></div>
            <div className="absolute h-full w-full rounded-full border-t-2 border-r-2 border-violet-500 animate-spin"></div>
          </div>
          <span className="text-[11px] font-mono text-violet-400 tracking-wider">SYNCING DESIGN SPACE...</span>
        </div>
      </div>
    );
  }

  // Lock workspace if requirements are not finalized
  if (reqDoc.status !== 'finalized') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-[#07070a] text-slate-400 p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-950/20 border border-amber-900/30 flex items-center justify-center text-amber-500 shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white font-mono">// DESIGN_WORKSPACE_LOCKED</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Please finalize the requirements specification first to unlock hardware and firmware design.
          </p>
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition cursor-pointer"
          >
            Go to Requirement Spec
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Workspace Panel: Chat Workspace */}
      <div className="w-1/2 border-r border-slate-900 flex flex-col h-full bg-[#07070a]">
        {/* Workspace Title bar */}
        <div className="h-14 px-6 border-b border-slate-900 flex items-center justify-between bg-[#08080e]">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs text-violet-400 font-semibold">// EMBEDDED_DESIGN_AGENT</span>
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
            <span className="text-xs text-slate-400">Hardware & Firmware Design Architect</span>
          </div>
        </div>

        {/* Chat Message Box */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && !agentStatus && (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-500 max-w-sm mx-auto space-y-3">
              <svg className="w-10 h-10 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <div>
                <h4 className="text-white font-medium text-sm">Start Hardware Design</h4>
                <p className="text-xs mt-1 text-slate-500">
                  Ask the design agent to select components, establish MCU pinout mappings, outline the firmware structure, and write driver stubs.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 border text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-violet-950/20 border-violet-900/40 text-violet-200'
                    : 'bg-[#0d0d14] border-slate-900 text-slate-200'
                }`}
              >
                {msg.role !== 'user' && (
                  <div className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1.5">
                    {msg.agent_name || 'System Agent'}
                  </div>
                )}
                <div className="whitespace-pre-line">{msg.content}</div>
              </div>
            </div>
          ))}

          {agentStatus && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl p-4 border bg-[#0d0d14] border-slate-900 text-slate-400 text-sm flex items-center gap-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                </span>
                <span className="font-mono text-xs tracking-wider">{agentStatus.toUpperCase()}</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Error bar */}
        {error && (
          <div className="px-6 py-2 bg-rose-950/20 border-t border-rose-900/30 text-rose-300 text-xs font-mono">
            [ERROR] {error}
          </div>
        )}

        {/* Chat input form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-900 bg-[#08080d]">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="e.g. Generate pin connections or sample drivers for the components..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isSending}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-800 bg-[#0d0d14] text-white placeholder-slate-600 focus:outline-none focus:border-violet-600 transition"
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="px-5 py-3 rounded-xl font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 transition"
            >
              Send
            </button>
          </div>
        </form>
      </div>

      {/* Right Workspace Panel: Specification Document & Embedded Design */}
      <div className="w-1/2 h-full flex flex-col bg-[#08080d]">
        {/* Workspace panel tabs */}
        <div className="h-14 px-4 border-b border-slate-900 flex items-center justify-between bg-[#08080e]">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('requirements')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'requirements'
                  ? 'bg-slate-900 text-violet-400 border border-slate-800'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Requirements
            </button>
            <button
              onClick={() => setActiveTab('design')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'design'
                  ? 'bg-slate-900 text-violet-400 border border-slate-800'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              System Design
            </button>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider bg-emerald-950/20 border-emerald-900/30 text-emerald-400">
            {reqDoc.status}
          </span>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'requirements' ? (
            <div className="p-8 space-y-8">
              {/* Technical Summary */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">System Summary</h4>
                <div className="p-5 rounded-2xl border border-slate-900 bg-[#0c0c12] text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {reqDoc.summary}
                </div>
              </div>

              {/* Technical Goals */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">System Goals</h4>
                {reqDoc.goals.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-900 text-xs text-slate-600 font-mono">
                    No technical goals identified yet.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {reqDoc.goals.map((goal, idx) => (
                      <li
                        key={idx}
                        className="flex gap-3 items-start p-4 rounded-xl border border-slate-900 bg-[#0c0c12] text-sm text-slate-300"
                      >
                        <span className="w-5 h-5 rounded-md bg-violet-950/20 border border-violet-900/20 text-violet-400 flex items-center justify-center text-xs font-bold font-mono">
                          {idx + 1}
                        </span>
                        <span>{goal}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Design Constraints */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Design Constraints</h4>
                {reqDoc.constraints.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-900 text-xs text-slate-600 font-mono">
                    No design constraints identified yet.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {reqDoc.constraints.map((constraint, idx) => (
                      <li
                        key={idx}
                        className="flex gap-3 items-start p-4 rounded-xl border border-slate-900 bg-[#0c0c12] text-sm text-slate-300"
                      >
                        <span className="w-5 h-5 rounded-md bg-amber-950/20 border border-amber-900/20 text-amber-400 flex items-center justify-center text-xs font-bold font-mono">
                          !
                        </span>
                        <span>{constraint}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 space-y-8">
              {/* Components */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Hardware Components</h4>
                {designDoc.components.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-900 text-xs text-slate-600 font-mono">
                    No components defined yet. Ask the design agent to generate components.
                  </div>
                ) : (
                  <div className="border border-slate-900 rounded-xl overflow-hidden bg-[#0c0c12]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-900 text-slate-500 font-mono bg-slate-950/40">
                          <th className="p-3">Component</th>
                          <th className="p-3">Package</th>
                          <th className="p-3">Purpose</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-300 divide-y divide-slate-900/50">
                        {designDoc.components.map((c, idx) => (
                          <tr key={idx} className="hover:bg-slate-950/20">
                            <td className="p-3 font-semibold text-white">{c.name}</td>
                            <td className="p-3 text-slate-400">{c.package}</td>
                            <td className="p-3">{c.purpose}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pin Mapping */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Pin Connection Mapping</h4>
                {designDoc.pin_mappings.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-900 text-xs text-slate-600 font-mono">
                    No pin mappings established yet.
                  </div>
                ) : (
                  <div className="border border-slate-900 rounded-xl overflow-hidden bg-[#0c0c12]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-900 text-slate-500 font-mono bg-slate-950/40">
                          <th className="p-3">MCU Pin</th>
                          <th className="p-3">Device Pin</th>
                          <th className="p-3">Description / Bus</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-300 divide-y divide-slate-900/50">
                        {designDoc.pin_mappings.map((pm, idx) => (
                          <tr key={idx} className="hover:bg-slate-950/20">
                            <td className="p-3 font-mono text-violet-400 font-semibold">{pm.mcu_pin}</td>
                            <td className="p-3 font-mono text-amber-400">{pm.device_pin}</td>
                            <td className="p-3">{pm.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Firmware Architecture */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Firmware Architecture</h4>
                <div className="p-5 rounded-2xl border border-slate-900 bg-[#0c0c12] text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {designDoc.firmware_architecture || 'Waiting for firmware design...'}
                </div>
              </div>

              {/* Sample Code (Monaco Editor) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Initialization & Driver Code</h4>
                <div className="rounded-2xl border border-slate-900 overflow-hidden bg-[#020204]">
                  <div className="h-9 px-4 border-b border-slate-900/80 bg-[#040407] flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-500">main.cpp / main.py</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(designDoc.sample_code || '');
                      }}
                      className="text-[10px] text-slate-500 hover:text-white transition flex items-center gap-1 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copy Code
                    </button>
                  </div>
                  <div className="h-[400px]">
                    <Editor
                      height="100%"
                      defaultLanguage="cpp"
                      language={(designDoc.sample_code && designDoc.sample_code.includes('import ')) ? 'python' : 'cpp'}
                      value={designDoc.sample_code || '// Ready to write drivers...'}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 12,
                        fontFamily: 'Consolas, Courier New, monospace',
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        padding: { top: 12 },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

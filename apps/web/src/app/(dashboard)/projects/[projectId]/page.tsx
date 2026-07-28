'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiRequest, getAuthToken } from '@/lib/api';
import EditorComponent from './EditorComponent';

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
  mcu?: string;
  components: ComponentItem[];
  pin_mappings: PinMappingItem[];
  firmware_architecture: string;
  sample_code: string;
}

interface DebugFinding {
  id: string;
  issue: string;
  cause: string;
  recommendation: string;
  severity: 'high' | 'medium' | 'low';
}

export default function ProjectWorkspacePage() {
  const { projectId } = useParams();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [project, setProject] = useState<any>(null);

  // Synchronize tab parameter with active workspace view
  useEffect(() => {
    if (tabParam && ['requirements', 'design', 'firmware', 'debugger', 'reports'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);
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

  // Navigation tab matching the active agent
  const [activeTab, setActiveTab] = useState<'requirements' | 'design' | 'firmware' | 'debugger' | 'reports'>('requirements');
  
  // UI & SSE states
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Debugger states
  const [debugCode, setDebugCode] = useState<string>('// Paste your code here to debug...\n\nvoid setup() {\n  // pin configuration\n}\n\nvoid loop() {\n  // loop logic\n}');
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugFindings, setDebugFindings] = useState<DebugFinding[]>([]);

  // Firmware explorer states
  const [selectedFile, setSelectedFile] = useState<string>('main.cpp');
  const [customFileContent, setCustomFileContent] = useState<Record<string, string>>({
    'main.cpp': '',
    'config.h': '// Device configuration settings\n#define DEVICE_NAME "EmbedMind_Node_01"\n#define BAUD_RATE 115200\n#define REPORT_INTERVAL_MS 60000\n',
    'dht_sensor.h': '// DHT Sensor interface wrapper\n#ifndef DHT_SENSOR_H\n#define DHT_SENSOR_H\n\nvoid initSensor();\nfloat readTemp();\nfloat readHum();\n\n#endif\n',
    'wifi_mqtt.h': '// Connection management\n#ifndef WIFI_MQTT_H\n#define WIFI_MQTT_H\n\nvoid connectToWiFi();\nvoid publishTelemetry(const char* payload);\n\n#endif\n'
  });

  // Sci-Fi Live Telemetry logs states
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([
    'SYSTEM ENGINE INITIALIZED',
    'CORE PROCESSOR TARGET DETECTED: ESP32-WROOM-32D',
    'PINMUX GRAPH LISTENING...',
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const telemetryEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Scroll chat to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, agentStatus]);

  // Scroll telemetry logs
  useEffect(() => {
    telemetryEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [telemetryLogs]);

  // Periodically append mock telemetry compile logs
  useEffect(() => {
    const logs = [
      'INFO: PA9 initialized as INPUT_PULLUP',
      'DEBUG: Wi-Fi stack configured successfully',
      'INFO: Free memory heap: 182,480 bytes',
      'WARN: High impedance detected on pin ADC_CH1',
      'DEBUG: MQTT payload queued [DHT_TEMP]',
      'INFO: System watchdog timer refreshed',
      'INFO: Compilation phase completed (0 warnings)',
    ];
    const interval = setInterval(() => {
      const randomLog = logs[Math.floor(Math.random() * logs.length)];
      setTelemetryLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${randomLog}`].slice(-30));
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Determine active agent based on selected tab
  const getActiveAgentName = (tab: typeof activeTab) => {
    switch (tab) {
      case 'requirements': return 'requirement_agent';
      case 'design': return 'design_agent';
      case 'firmware': return 'firmware_agent';
      case 'debugger': return 'debugger_agent';
      case 'reports': return 'reports_agent';
    }
  };

  // Sync sample code with custom file main.cpp
  useEffect(() => {
    if (designDoc.sample_code) {
      setCustomFileContent((prev) => ({
        ...prev,
        'main.cpp': designDoc.sample_code
      }));
    }
  }, [designDoc.sample_code]);

  // Load project details and requirement doc initially
  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        const projectData = await apiRequest(`/api/v1/projects/${projectId}`);
        setProject(projectData);
        if (projectData.requirement_doc) {
          setReqDoc({
            summary: projectData.requirement_doc.summary || 'No summary yet.',
            goals: projectData.requirement_doc.goals || [],
            constraints: projectData.requirement_doc.constraints || [],
            status: projectData.requirement_doc.status || 'draft',
          });
          if (projectData.requirement_doc.status === 'finalized') {
            setActiveTab('design');
          }
        }
        if (projectData.design_doc) {
          setDesignDoc({
            components: projectData.design_doc.components || [],
            pin_mappings: projectData.design_doc.pin_mappings || [],
            firmware_architecture: projectData.design_doc.firmware_architecture || 'No design details yet.',
            sample_code: projectData.design_doc.sample_code || '',
          });
        }
      } catch (err: any) {
        setError(err.message || 'Error loading project.');
        router.push('/dashboard');
      }
    };

    if (projectId) {
      loadWorkspace();
    }
  }, [projectId, router]);

  // Load message logs for the active tab/agent
  useEffect(() => {
    const loadMessagesForAgent = async () => {
      const agentName = getActiveAgentName(activeTab);
      try {
        const messagesData = await apiRequest(`/api/v1/projects/${projectId}/messages?agent_name=${agentName}`);
        setMessages(messagesData);
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };

    if (projectId) {
      loadMessagesForAgent();
    }
  }, [activeTab, projectId]);


  // Load firmware files and hardware details when active tab changes or project finalized
  useEffect(() => {
    const loadHardwareAndFirmware = async () => {
      if (!projectId) return;
      try {
        // Load Hardware Design
        const hwData = await apiRequest(`/api/v1/projects/${projectId}/hardware`);
        if (hwData) {
          let parsedPinMappings: any[] = [];
          if (Array.isArray(hwData.pin_map)) {
            parsedPinMappings = hwData.pin_map;
          } else if (hwData.pin_map && typeof hwData.pin_map === 'object') {
            parsedPinMappings = Object.entries(hwData.pin_map).flatMap(([device, mappings]: any) => {
              if (mappings && typeof mappings === 'object') {
                return Object.entries(mappings).map(([device_pin, mcu_pin]: any) => ({
                  mcu_pin,
                  device_pin: `${device} ${device_pin}`,
                  description: `Connection for ${device}`
                }));
              }
              return [];
            });
          }

          setDesignDoc((prev) => ({
            ...prev,
            mcu: hwData.mcu || prev.mcu,
            components: (hwData.components && hwData.components.length > 0) ? hwData.components : prev.components,
            pin_mappings: (parsedPinMappings.length > 0) ? parsedPinMappings : prev.pin_mappings,
          }));
        }

        // Load Firmware Files
        const fwFiles = await apiRequest(`/api/v1/projects/${projectId}/firmware`);
        if (fwFiles && fwFiles.length > 0) {
          const fileContents: Record<string, string> = {};
          fwFiles.forEach((file: any) => {
            fileContents[file.filename] = file.content;
          });
          setCustomFileContent(fileContents);
          
          // Select main file if present
          const filenames = Object.keys(fileContents);
          if (filenames.includes('main.cpp')) {
            setSelectedFile('main.cpp');
          } else if (filenames.includes('main.c')) {
            setSelectedFile('main.c');
          } else if (filenames.length > 0) {
            setSelectedFile(filenames[0]);
          }
        }
      } catch (err) {
        console.error('Error loading hardware/firmware:', err);
      }
    };

    loadHardwareAndFirmware();
  }, [projectId, activeTab, reqDoc.status]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const userMessageContent = inputText.trim();
    setInputText('');
    setIsSending(true);
    setError('');

    const activeAgent = getActiveAgentName(activeTab);

    const userMsgLocal: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageContent,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsgLocal]);

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          content: userMessageContent,
          agent_name: activeAgent
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

  // Run the firmware debugger
  const handleRunDebugger = async () => {
    setIsDebugging(true);
    setDebugFindings([]);
    try {
      const token = getAuthToken();
      const response = await fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/debug`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ code: debugCode }),
      });
      if (!response.ok) {
        throw new Error('Failed to run code analysis.');
      }
      const data = await response.json();
      const mappedFindings = (data.findings || []).map((f: any, idx: number) => ({
        id: idx.toString(),
        issue: f.issue,
        cause: f.cause,
        recommendation: f.fix,
        severity: f.severity === 'critical' ? 'high' : f.severity
      }));
      setDebugFindings(mappedFindings);
      if (data.fixed_code) {
        setDebugCode(data.fixed_code);
      }
    } catch (err: any) {
      setError(err.message || 'Error running debugger.');
    } finally {
      setIsDebugging(false);
    }
  };

  // Export functions
  const handleDownloadZIP = () => {
    const element = document.createElement('a');
    const headerCode = `/* EmbedMind Project ZIP files */\n\n`;
    const fullZipContent = Object.entries(customFileContent)
      .map(([name, code]) => `=== FILE: ${name} ===\n${code}\n`)
      .join('\n');
    
    const file = new Blob([headerCode + fullZipContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${project?.name || 'project'}_firmware.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleExportREADME = async (format: 'md' | 'pdf') => {
    if (format === 'pdf') {
      try {
        const token = getAuthToken();
        const response = await fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/report/pdf`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error('Failed to generate PDF report.');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project?.name || 'project'}_report.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (err: any) {
        setError(err.message || 'Error exporting PDF.');
      }
    } else {
      const element = document.createElement('a');
      const readmeContent = `# ${project?.name || 'Project Specs'} - EmbedMind Generated Report\n\n` +
        `## Summary\n${reqDoc.summary}\n\n` +
        `## Goals\n${reqDoc.goals.map((g) => `- ${g}`).join('\n')}\n\n` +
        `## Constraints\n${reqDoc.constraints.map((c) => `- ${c}`).join('\n')}\n\n` +
        `## Components\n` + 
        designDoc.components.map((c) => `* **${c.name}** (${c.package}): ${c.purpose}`).join('\n') + `\n\n` +
        `## Pinout Connections\n` +
        designDoc.pin_mappings.map((pm) => `* ${pm.mcu_pin} -> ${pm.device_pin} (${pm.description})`).join('\n') + `\n`;

      const file = new Blob([readmeContent], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `README.md`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };


  const isFinalized = reqDoc.status === 'finalized';

  // Agent header details mapping
  const getAgentHeader = () => {
    switch (activeTab) {
      case 'requirements':
        return {
          title: 'REQ_ANALYSIS_AGENT',
          desc: 'Interactive Specification Dialog',
          placeholder: 'e.g. Can we use an ESP32-WROOM-32E and power it using a single LiPo battery?'
        };
      case 'design':
        return {
          title: 'EMBEDDED_DESIGN_AGENT',
          desc: 'Hardware & Pinout Architect',
          placeholder: 'e.g. Can you change the MCU to STM32 and recommend pin mapping?'
        };
      case 'firmware':
        return {
          title: 'FIRMWARE_DEVELOPER_AGENT',
          desc: 'Microcontroller C++ Code Specialist',
          placeholder: 'e.g. Write a helper function to format DHT telemetry as JSON...'
        };
      case 'debugger':
        return {
          title: 'DEBUGER_AGENT',
          desc: 'Firmware Code Quality & Bug Auditor',
          placeholder: 'e.g. Help me resolve stack overflow in my code snippet...'
        };
      case 'reports':
        return {
          title: 'DOCUMENTATION_AGENT',
          desc: 'Technical Project README Generator',
          placeholder: 'e.g. Add a section detailing project troubleshooting...'
        };
    }
  };

  const agentHeader = getAgentHeader();

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-[#050505] text-[#F8FAFC]">
      
      {/* =========================================================
          LEFT PANE (30%): AI Agent Stream & Metrics
          ========================================================= */}
      <div className="w-[30%] border-r border-[#2a0000] flex flex-col h-full bg-[#101010]/40">
        
        {/* Workspace Title bar */}
        <div className="h-14 px-4 border-b border-[#2a0000] flex items-center justify-between bg-[#151515] relative shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="font-orbitron text-xs text-[#e10600] font-black tracking-widest uppercase truncate">
              // {agentHeader.title}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#e10600] animate-pulse-red shrink-0"></span>
          </div>
        </div>

        {/* Real-time Agent Health Gauges panel */}
        <div className="p-3.5 border-b border-[#2a0000] bg-[#050505]/60 font-mono text-[9px] text-slate-400 space-y-2 shrink-0">
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">// AGENT PROCESS METRICS</span>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-1.5 rounded border border-[#2a0000] bg-[#101010]">
              <span className="text-[7px] text-slate-500 block">CPU LOAD</span>
              <span className="font-bold text-white">12.4%</span>
            </div>
            <div className="p-1.5 rounded border border-[#2a0000] bg-[#101010]">
              <span className="text-[7px] text-slate-500 block">MEMORY</span>
              <span className="font-bold text-white">64.5 MB</span>
            </div>
            <div className="p-1.5 rounded border border-[#2a0000] bg-[#101010]">
              <span className="text-[7px] text-slate-500 block">PIPELINE IND</span>
              <span className="font-bold text-[#e10600] uppercase">{activeTab}</span>
            </div>
            <div className="p-1.5 rounded border border-[#2a0000] bg-[#101010]">
              <span className="text-[7px] text-slate-500 block">STABILITY</span>
              <span className="font-bold text-[#00ff88]">99.8%</span>
            </div>
          </div>
        </div>

        {/* Chat Message Box */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages.length === 0 && !agentStatus && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500 max-w-xs mx-auto space-y-3 font-rajdhani">
              <div className="w-10 h-10 rounded bg-[#101010] border border-[#2a0000] flex items-center justify-center text-[#e10600] shadow-neon-red">
                ▲
              </div>
              <div>
                <h4 className="text-white font-bold text-xs uppercase tracking-widest">Awaiting specs input</h4>
                <p className="text-[11px] mt-1 text-slate-500 leading-normal uppercase">
                  Submit design queries or requirements context to guide the active agent node.
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
                className={`max-w-[90%] rounded-xl p-3.5 border text-xs leading-normal transition-all font-rajdhani ${
                  msg.role === 'user'
                    ? 'bg-[#2a0000]/20 border-[#e10600]/40 text-rose-100 shadow-neon-red-inset'
                    : 'bg-[#101010] border-[#2a0000] text-slate-200'
                }`}
              >
                {msg.role !== 'user' && (
                  <div className="text-[9px] font-black text-[#e10600] uppercase tracking-widest mb-1 font-mono">
                    {msg.agent_name || 'System Agent'}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {agentStatus && (
            <div className="flex justify-start">
              <div className="max-w-[90%] rounded-xl p-3 border bg-[#101010] border-[#2a0000] text-slate-400 text-xs flex items-center gap-2.5 font-mono shadow-neon-red-inset">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e10600] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e10600]"></span>
                </span>
                <span className="text-[10px] tracking-widest uppercase">{agentStatus}</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Error notification bar */}
        {error && (
          <div className="px-4 py-2 bg-[#c1121f]/10 border-t border-[#e10600]/40 text-rose-300 text-[10px] font-mono shrink-0">
            [ALARM] {error}
          </div>
        )}

        {/* Chat input form */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-[#2a0000] bg-[#151515] shrink-0 font-rajdhani">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={agentHeader.placeholder}
              disabled={isSending}
              className="flex-1 px-3 py-2 bg-[#050505] rounded border border-[#2a0000] text-white placeholder-slate-700 text-xs focus:outline-none focus:border-[#e10600] focus:ring-1 focus:ring-[#e10600]/20 transition shadow-neon-red-inset"
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="px-4 py-2 rounded bg-gradient-to-r from-[#c1121f] to-[#e10600] text-white text-[10px] font-black uppercase tracking-widest border border-[#e10600]/40 hover:from-[#e10600] hover:to-[#ff2a24] transition cursor-pointer font-orbitron shrink-0 disabled:opacity-40"
            >
              TRANSMIT
            </button>
          </div>
        </form>
      </div>

      {/* =========================================================
          CENTER PANE (45%): Engineering Board & Editor
          ========================================================= */}
      <div className="w-[45%] border-r border-[#2a0000] flex flex-col h-full bg-[#050505]">
        
        {/* Navigation Tabs Bar */}
        <div className="h-14 border-b border-[#2a0000] bg-[#101010] flex items-center justify-between px-4 overflow-x-auto shrink-0 relative">
          <div className="flex gap-1.5">
            {[
              { id: 'requirements', label: 'Requirements', locked: false },
              { id: 'design', label: 'Hardware Design', locked: !isFinalized },
              { id: 'firmware', label: 'Firmware Workspace', locked: !isFinalized },
              { id: 'debugger', label: 'Code Auditor', locked: !isFinalized },
              { id: 'reports', label: 'Reports Agent', locked: !isFinalized },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => !tab.locked && router.push(`/projects/${projectId}?tab=${tab.id}`)}
                  disabled={tab.locked}
                  className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest font-orbitron transition flex items-center gap-1.5 ${
                    tab.locked
                      ? 'text-slate-600 border border-transparent cursor-not-allowed'
                      : active
                        ? 'bg-[#2a0000]/40 text-[#e10600] border border-[#e10600]/40 shadow-neon-red-inset'
                        : 'text-slate-400 border border-transparent hover:text-slate-200 hover:bg-[#151515]/60'
                  }`}
                >
                  {tab.label}
                  {tab.locked && <span className="text-slate-600 text-[8px]">🔒</span>}
                </button>
              );
            })}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#e10600]/40 to-transparent"></div>
        </div>

        {/* Dynamic Center Board Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          
          {/* TAB 1: REQUIREMENTS */}
          {activeTab === 'requirements' && (
            <div className="space-y-6 font-rajdhani">
              {/* Summary Card */}
              <div className="p-4 rounded border border-[#2a0000] bg-[#101010]/80 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#e10600]/50 to-transparent"></div>
                <h3 className="text-xs font-bold font-mono text-[#e10600] uppercase tracking-widest">// SYSTEM SUMMARY IDENTIFICATION</h3>
                <p className="text-sm text-slate-200 leading-relaxed font-semibold uppercase">{reqDoc.summary}</p>
              </div>

              {/* Goals */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold font-mono text-slate-500 uppercase tracking-widest">// TARGET OBJECTIVES</h3>
                <div className="space-y-2">
                  {reqDoc.goals.length === 0 ? (
                    <div className="text-slate-600 text-xs italic font-mono">[NO_OBJECTIVES_DEFINED]</div>
                  ) : (
                    reqDoc.goals.map((g, idx) => (
                      <div key={idx} className="p-3 rounded border border-[#2a0000] bg-[#101010]/40 flex gap-3 items-center">
                        <span className="text-[#e10600] text-[9px] font-bold">▲</span>
                        <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">{g}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Constraints */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold font-mono text-slate-500 uppercase tracking-widest">// SYSTEM CONSTRAINTS</h3>
                <div className="space-y-2">
                  {reqDoc.constraints.length === 0 ? (
                    <div className="text-slate-600 text-xs italic font-mono">[NO_CONSTRAINTS_DETECTED]</div>
                  ) : (
                    reqDoc.constraints.map((c, idx) => (
                      <div key={idx} className="p-3 rounded border border-[#2a0000] bg-[#101010]/40 flex gap-3 items-center">
                        <span className="text-[#c1121f] text-[9px] font-bold">■</span>
                        <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">{c}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HARDWARE DESIGN */}
          {activeTab === 'design' && (
            <div className="space-y-6 font-rajdhani">
              
              {/* BOM Pricing list table */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold font-mono text-[#e10600] uppercase tracking-widest">// COMPONENT BILL OF MATERIALS</h3>
                <div className="border border-[#2a0000] rounded-xl overflow-hidden bg-[#101010]/60">
                  <table className="w-full text-left border-collapse font-mono text-[10px]">
                    <thead>
                      <tr className="border-b border-[#2a0000] bg-[#151515] text-slate-400 font-bold uppercase text-[9px]">
                        <th className="p-3">Reference Component</th>
                        <th className="p-3">Package Layout</th>
                        <th className="p-3">Functional Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a0000]/65 text-slate-200">
                      {designDoc.components.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-slate-500 italic">[NO_COMPONENTS_ALLOCATED]</td>
                        </tr>
                      ) : (
                        designDoc.components.map((comp, idx) => (
                          <tr key={idx} className="hover:bg-[#151010]/40">
                            <td className="p-3 font-semibold text-white">{comp.name}</td>
                            <td className="p-3">{comp.package}</td>
                            <td className="p-3 text-slate-400">{comp.purpose}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pin out mapping configuration matrix */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold font-mono text-[#e10600] uppercase tracking-widest">// PINOUT CONFIGURATION MATRIX</h3>
                <div className="border border-[#2a0000] rounded-xl overflow-hidden bg-[#101010]/60">
                  <table className="w-full text-left border-collapse font-mono text-[10px]">
                    <thead>
                      <tr className="border-b border-[#2a0000] bg-[#151515] text-slate-400 font-bold uppercase text-[9px]">
                        <th className="p-3">MCU Pin</th>
                        <th className="p-3">Target Device Pin</th>
                        <th className="p-3">Signal / Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a0000]/65 text-slate-200">
                      {designDoc.pin_mappings.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-slate-500 italic">[NO_PIN_MAPPING_DECLARED]</td>
                        </tr>
                      ) : (
                        designDoc.pin_mappings.map((pm, idx) => (
                          <tr key={idx} className="hover:bg-[#151010]/40">
                            <td className="p-3 font-bold text-[#e10600]">{pm.mcu_pin}</td>
                            <td className="p-3 font-semibold">{pm.device_pin}</td>
                            <td className="p-3 text-slate-400">{pm.description}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FIRMWARE WORKSPACE */}
          {activeTab === 'firmware' && (
            <div className="h-[520px] flex border border-[#2a0000] bg-[#101010]/65 rounded-xl overflow-hidden">
              {/* Side explorer file list */}
              <div className="w-[30%] border-r border-[#2a0000] bg-[#151515]/75 flex flex-col font-mono text-[10px] shrink-0">
                <div className="p-3.5 border-b border-[#2a0000] text-slate-400 font-bold uppercase tracking-wider">// FILE EXPLORER</div>
                <div className="flex-1 py-2 overflow-y-auto">
                  {Object.keys(customFileContent).map((filename) => {
                    const active = selectedFile === filename;
                    return (
                      <button
                        key={filename}
                        onClick={() => setSelectedFile(filename)}
                        className={`w-full text-left px-4 py-2.5 border-l-2 transition flex items-center gap-2 ${
                          active
                            ? 'bg-[#2a0000]/25 text-[#e10600] border-[#e10600] font-bold'
                            : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-[#101010]'
                        }`}
                      >
                        <span>📄</span>
                        {filename}
                      </button>
                    );
                  })}
                </div>
                {/* Download bundle ZIP trigger */}
                <div className="p-3 border-t border-[#2a0000] bg-[#101010]">
                  <button
                    onClick={handleDownloadZIP}
                    className="w-full py-2.5 rounded bg-gradient-to-r from-[#c1121f] to-[#e10600] text-white text-[9px] font-black uppercase tracking-widest hover:from-[#e10600] hover:to-[#ff2a24] shadow-neon-red transition cursor-pointer font-orbitron"
                  >
                    DOWNLOAD ZIP BUNDLE
                  </button>
                </div>
              </div>

              {/* Monaco Code Editor */}
              <div className="flex-1 h-full min-w-0 bg-[#050505] flex flex-col">
                <div className="h-10 px-4 border-b border-[#2a0000] bg-[#151515] flex items-center text-[10px] font-mono text-slate-500 uppercase tracking-widest shrink-0">// EDITING BUFFER: {selectedFile}</div>
                <div className="flex-1 min-h-0 relative">
                  <EditorComponent
                    code={customFileContent[selectedFile] || ''}
                    readOnly={false}
                    onChange={(val) => {
                      if (val !== undefined) {
                        setCustomFileContent((prev) => ({ ...prev, [selectedFile]: val }));
                      }
                    }}
                    language={selectedFile.endsWith('.h') || selectedFile.endsWith('.cpp') ? 'cpp' : 'markdown'}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DEBUGGER LOG */}
          {activeTab === 'debugger' && (
            <div className="space-y-6 font-sans">
              
              {/* Paste code area */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold font-mono text-[#e10600] uppercase tracking-widest block">// CODE AUDITOR ZONE</span>
                <div className="h-56 border border-[#2a0000] rounded-xl overflow-hidden bg-[#050505]">
                  <EditorComponent
                    code={debugCode}
                    readOnly={false}
                    onChange={(val) => {
                      if (val !== undefined) {
                        setDebugCode(val);
                      }
                    }}
                    language="cpp"
                  />
                </div>
              </div>

              {/* Action trigger */}
              <div className="flex justify-end">
                <button
                  onClick={handleRunDebugger}
                  disabled={isDebugging}
                  className="px-5 py-3 rounded font-black text-white bg-gradient-to-r from-[#c1121f] to-[#e10600] hover:from-[#e10600] hover:to-[#ff2a24] shadow-neon-red transition cursor-pointer text-xs border border-[#e10600]/40 uppercase tracking-widest font-orbitron flex items-center gap-2"
                >
                  {isDebugging ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                      RUNNING CODE ANALYSIS...
                    </>
                  ) : (
                    'RUN AUTOMATED AUDITOR'
                  )}
                </button>
              </div>

              {/* Findings card deck */}
              <div className="space-y-3 font-rajdhani">
                <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest block">// DIAGNOSTICS FINDINGS DECK</span>
                
                {debugFindings.length === 0 ? (
                  <div className="p-4 border border-[#2a0000] bg-[#101010]/30 rounded-xl text-center text-xs text-slate-500 font-mono italic">
                    [NO_DIAGNOSTICS_RUN]
                  </div>
                ) : (
                  <div className="space-y-3">
                    {debugFindings.map((finding) => (
                      <div key={finding.id} className="p-4 rounded border border-[#2a0000] bg-[#101010] space-y-2 relative overflow-hidden shadow-neon-red-inset">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">{finding.issue}</h4>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold border uppercase tracking-widest ${
                            finding.severity === 'high'
                              ? 'bg-[#2a0000] border-[#e10600] text-[#e10600]'
                              : finding.severity === 'medium'
                                ? 'bg-amber-950/20 border-amber-900/30 text-amber-500'
                                : 'bg-blue-950/20 border-blue-900/30 text-blue-400'
                          }`}>
                            {finding.severity} SEVERITY
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 leading-relaxed font-semibold uppercase">
                          <span className="text-[#e10600] font-bold mr-1">CAUSE:</span> {finding.cause}
                        </div>
                        <div className="text-[11px] text-[#00ff88] leading-relaxed font-semibold uppercase">
                          <span className="text-slate-500 font-bold mr-1">RECO:</span> {finding.recommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-6 font-rajdhani">
              {/* Preview Markdown README box */}
              <div className="p-4 rounded border border-[#2a0000] bg-[#101010]/60 space-y-4 shadow-neon-red-inset">
                <div className="flex justify-between items-center border-b border-[#2a0000]/60 pb-3">
                  <span className="text-xs font-bold font-mono text-[#e10600] uppercase tracking-widest">// SYSTEM DOCUMENTATION PREVIEW</span>
                  <span className="text-[9px] font-mono text-slate-500">README.MD</span>
                </div>
                <div className="space-y-4 text-xs font-rajdhani leading-relaxed">
                  <div>
                    <h1 className="text-md font-bold text-white font-orbitron uppercase">{project?.name || 'ESP32 Weather Node'}</h1>
                    <p className="text-slate-400 mt-1 uppercase font-semibold">{reqDoc.summary}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wide">Target Specifications</h3>
                    <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-400 uppercase font-semibold">
                      {reqDoc.goals.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wide">Component Matrix</h3>
                    <div className="space-y-1 text-slate-400 font-mono text-[10px] mt-1">
                      {designDoc.components.map((c, i) => (
                        <div key={i}>* {c.name} ({c.package}) - {c.purpose}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action triggers */}
              <div className="flex gap-4">
                <button
                  onClick={() => handleExportREADME('md')}
                  className="flex-1 py-3 rounded font-black text-white bg-[#101010] hover:bg-[#151515] border border-[#2a0000] text-xs font-orbitron uppercase tracking-widest transition cursor-pointer"
                >
                  EXPORT MARKDOWN (.MD)
                </button>
                <button
                  onClick={() => handleExportREADME('pdf')}
                  className="flex-1 py-3 rounded font-black text-white bg-gradient-to-r from-[#c1121f] to-[#e10600] hover:from-[#e10600] hover:to-[#ff2a24] text-xs font-orbitron uppercase tracking-widest transition cursor-pointer border border-[#e10600]/40 shadow-neon-red"
                >
                  EXPORT TECH PDF (.PDF)
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* =========================================================
          RIGHT PANE (25%): System Inspector Panel
          ========================================================= */}
      <div className="w-[25%] flex flex-col h-full bg-[#101010]/30 font-mono text-[9px] text-slate-400">
        
        {/* Title bar */}
        <div className="h-14 px-4 border-b border-[#2a0000] bg-[#151515] flex items-center justify-between shrink-0">
          <span className="font-orbitron font-bold text-slate-400 uppercase tracking-widest">MCU INSPECTOR</span>
          <span className="px-2 py-0.5 rounded text-[8px] bg-[#2a0000]/60 border border-[#e10600]/40 text-[#e10600] font-bold">ESP32</span>
        </div>

        {/* Microchip Visual Graphic */}
        <div className="p-4 border-b border-[#2a0000] bg-[#050505]/40 flex flex-col items-center justify-center shrink-0">
          <svg className="w-24 h-24 stroke-[#2a0000] fill-none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            {/* outer leads */}
            {[-40, -25, -10, 10, 25, 40].map((offset) => (
              <g key={offset}>
                <line x1={offset + 50} y1="8" x2={offset + 50} y2="15" strokeWidth="1.5" />
                <line x1={offset + 50} y1="85" x2={offset + 50} y2="92" strokeWidth="1.5" />
                <line x1="8" y1={offset + 50} x2="15" y2={offset + 50} strokeWidth="1.5" />
                <line x1="85" y1={offset + 50} x2="92" y2={offset + 50} strokeWidth="1.5" />
              </g>
            ))}
            {/* core packaging body */}
            <rect x="15" y="15" width="70" height="70" rx="4" fill="#101010" stroke="#2a0000" strokeWidth="2.5" />
            <rect x="22" y="22" width="56" height="56" rx="2" stroke="#e10600" strokeWidth="1" opacity="0.3" />
            
            {/* core identifier text */}
            <text x="50" y="52" fill="#e10600" textAnchor="middle" fontSize="6.5" fontFamily="var(--font-orbitron)" fontWeight="black">AI CORE</text>
            <text x="50" y="60" fill="gray" textAnchor="middle" fontSize="4.5">ESP32</text>
          </svg>
          <span className="text-[7.5px] text-slate-500 uppercase tracking-widest mt-2">ESP32-WROOM Pinout Outline</span>
        </div>

        {/* Dynamic GPIO pin mapping list */}
        <div className="p-3 border-b border-[#2a0000] bg-[#101010]/50 shrink-0">
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-2">// ACTIVE PINOUT CONNECTIONS</span>
          <div className="space-y-1.5 font-mono max-h-48 overflow-y-auto">
            {designDoc.pin_mappings.length === 0 ? (
              <div className="text-slate-600 italic">[NO_ACTIVE_CONNECTIONS]</div>
            ) : (
              designDoc.pin_mappings.map((pm, idx) => (
                <div key={idx} className="flex justify-between items-center p-1 border-b border-[#2a0000]/40">
                  <span className="text-[#e10600] font-bold">{pm.mcu_pin}</span>
                  <span className="text-slate-500">▶</span>
                  <span className="text-white uppercase truncate max-w-[80px]">{pm.device_pin}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live diagnostic telemetry logs stream */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#050505] p-3 font-mono">
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-2 shrink-0">// LIVE COMPILE LOG STREAM</span>
          <div className="flex-1 overflow-y-auto space-y-1.5 text-[8.5px] text-slate-500 leading-tight">
            {telemetryLogs.map((log, idx) => {
              const isError = log.includes('WARN') || log.includes('ALARM');
              return (
                <div key={idx} className={isError ? 'text-[#e10600] font-semibold' : 'text-slate-500'}>
                  {log}
                </div>
              );
            })}
            <div ref={telemetryEndRef} />
          </div>
        </div>

      </div>

    </div>
  );
}

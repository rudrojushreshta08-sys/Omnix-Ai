import React, { useState, useEffect } from 'react';
import './App.css';
import { 
  Terminal, 
  Calendar, 
  BookOpen, 
  Layers, 
  Play, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Trash2,
  HelpCircle,
  Code
} from 'lucide-react';

interface Task {
  id: string;
  original: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  duration: string;
  status: string;
  recommendation: string;
}

interface Flashcard {
  q: string;
  a: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: string;
  color: string;
}

interface AgentLog {
  timestamp: string;
  agentName: string;
  action: string;
  details: string;
}

interface McpLog {
  timestamp: string;
  toolName: string;
  args: any;
  status: 'SUCCESS' | 'BLOCKED' | 'FAILED';
  result?: any;
  error?: string;
  securityAudit?: {
    allowed: boolean;
    command: string;
    reason?: string;
    sanitizedCommand?: string;
  };
}

export default function App() {
  // Inputs
  const [prompt, setPrompt] = useState('');
  const [manualCommand, setManualCommand] = useState('');

  // Execution States
  const [loading, setLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<'None' | 'PlannerAgent' | 'OptimizationAgent' | 'StudyAgent' | 'SchedulerAgent'>('None');
  
  // Results data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [studySummary, setStudySummary] = useState('');
  const [studyTopic, setStudyTopic] = useState('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [cliResult, setCliResult] = useState<{
    command: string;
    stdout?: string;
    stderr?: string;
    error?: string;
    status: string;
  } | null>(null);

  // Logs stream
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [mcpLogs, setMcpLogs] = useState<McpLog[]>([]);

  // Flashcard swiper active card
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Initial fetch of logs (if any are cached)
  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (data.agentLogs) setAgentLogs(data.agentLogs);
      if (data.mcpLogs) setMcpLogs(data.mcpLogs);
    } catch (err) {
      console.error('Error fetching logs', err);
    }
  };

  const handleRunPipeline = async (inputPrompt: string) => {
    if (!inputPrompt.trim()) return;
    setLoading(true);
    setPrompt(inputPrompt);

    // Clear old state
    setTasks([]);
    setStudySummary('');
    setStudyTopic('');
    setFlashcards([]);
    setCalendarEvents([]);
    setCliResult(null);
    setCurrentCardIdx(0);
    setIsCardFlipped(false);

    // Step-by-step loading animation to represent agents thinking
    try {
      // 1. Planner starts
      setActiveAgent('PlannerAgent');
      await new Promise((r) => setTimeout(r, 1200));

      // 2. Optimizer starts
      setActiveAgent('OptimizationAgent');
      await new Promise((r) => setTimeout(r, 1000));

      // 3. Study creator starts
      setActiveAgent('StudyAgent');
      await new Promise((r) => setTimeout(r, 1000));

      // 4. Scheduler starts
      setActiveAgent('SchedulerAgent');
      await new Promise((r) => setTimeout(r, 800));

      // Send to server API
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: inputPrompt })
      });

      const data = await response.json();
      
      if (data.success && data.result) {
        const { result, agentLogs, mcpLogs } = data;
        setTasks(result.optimization.tasks || []);
        setStudySummary(result.study.summary || '');
        setStudyTopic(result.study.topic || '');
        setFlashcards(result.study.flashcards || []);
        setCalendarEvents(result.scheduler.events || []);
        setCliResult(result.cliExecution || null);
        setAgentLogs(agentLogs || []);
        setMcpLogs(mcpLogs || []);
      } else {
        alert(data.error || 'Pipeline execution failed.');
        fetchLogs();
      }
    } catch (err: any) {
      alert(`Error calling endpoint: ${err.message}`);
      fetchLogs();
    } finally {
      setLoading(false);
      setActiveAgent('None');
    }
  };

  const handleExecuteManualCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCommand.trim()) return;

    try {
      const res = await fetch('/api/execute-cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: manualCommand })
      });
      const data = await res.json();
      
      if (data.success) {
        // Log custom command success
        fetchLogs();
        setCliResult(data.result);
        alert(`Command completed with status: ${data.result.status}`);
      } else {
        // Violation / blocked command
        fetchLogs();
        setCliResult({
          command: manualCommand,
          error: data.error || 'Execution blocked by Sandbox Rules',
          status: 'failed'
        });
      }
    } catch (err: any) {
      fetchLogs();
      alert(`Network error: ${err.message}`);
    } finally {
      setManualCommand('');
    }
  };

  const handleClearLogs = async () => {
    try {
      await fetch('/api/clear', { method: 'POST' });
      setAgentLogs([]);
      setMcpLogs([]);
      setTasks([]);
      setStudySummary('');
      setFlashcards([]);
      setCalendarEvents([]);
      setCliResult(null);
      alert('Workspace logs and databases reset successfully.');
    } catch (err: any) {
      alert(`Reset error: ${err.message}`);
    }
  };

  const selectPredefinedPrompt = (pText: string) => {
    setPrompt(pText);
    handleRunPipeline(pText);
  };

  const toggleTaskStatus = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' } : t));
  };

  // Helper to extract time string from datetime
  const formatTime = (isoString: string) => {
    const parts = isoString.split('T');
    if (parts.length < 2) return '';
    return parts[1].substring(0, 5);
  };

  // Format date helper
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="app-container">
      {/* 1. App Header */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="logo-text">OMNIX AI</h1>
            <p style={{ fontSize: '10px', color: 'var(--text-secondary)', letterSpacing: '1px' }}>
              MULTI-AGENT INTELLIGENCE SYSTEM
            </p>
          </div>
        </div>
        <div className="status-badge">
          <div className="status-dot"></div>
          <span>MCP Server Connected: Localhost:3000</span>
          {loading && <RefreshCw size={14} className="animate-spin text-blue-400" />}
        </div>
      </header>

      {/* 2. Main Dashboard Layout Grid */}
      <main className="dashboard-grid">
        
        {/* Left Column: Chat Console */}
        <section className="grid-column">
          <div className="glass-panel glow-blue console-container" style={{ flex: 1, minHeight: '400px' }}>
            <div className="panel-header">
              <h2 className="panel-title">
                <Terminal size={18} />
                Agent Command Center
              </h2>
              {loading && (
                <span style={{ fontSize: '11px', color: 'var(--color-secondary)', fontWeight: 600 }}>
                  Agent Orchestrating...
                </span>
              )}
            </div>

            {/* Agent Bubble State Indicator */}
            <div className="agent-nodes">
              <div className="agent-node">
                <div className={`agent-avatar ${activeAgent === 'PlannerAgent' ? 'thinking' : agentLogs.some(l => l.agentName === 'PlannerAgent') ? 'active' : ''}`}>
                  PL
                </div>
                <span className="agent-label">Planner</span>
              </div>
              <div className="agent-node">
                <div className={`agent-avatar ${activeAgent === 'OptimizationAgent' ? 'thinking' : agentLogs.some(l => l.agentName === 'OptimizationAgent') ? 'working' : ''}`}>
                  OP
                </div>
                <span className="agent-label">Optimizer</span>
              </div>
              <div className="agent-node">
                <div className={`agent-avatar ${activeAgent === 'StudyAgent' ? 'thinking' : agentLogs.some(l => l.agentName === 'StudyAgent') ? 'working' : ''}`}>
                  EX
                </div>
                <span className="agent-label">Exam/Study</span>
              </div>
              <div className="agent-node">
                <div className={`agent-avatar ${activeAgent === 'SchedulerAgent' ? 'thinking' : agentLogs.some(l => l.agentName === 'SchedulerAgent') ? 'working' : ''}`}>
                  LS
                </div>
                <span className="agent-label">Scheduler</span>
              </div>
            </div>

            {/* Console history log */}
            <div className="console-history">
              {agentLogs.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px', padding: '16px' }}>
                  <HelpCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ fontSize: '13px' }}>System Idle. Trigger a quick instruction workflow below or type a request.</p>
                </div>
              ) : (
                agentLogs.filter(l => l.action !== 'MCP Call' && l.action !== 'MCP Success').map((log, idx) => (
                  <div key={idx} className={`chat-msg ${log.agentName === 'PlannerAgent' ? 'user' : 'agent'}`}>
                    <span className={`chat-msg-header ${log.agentName === 'PlannerAgent' ? 'user' : 'agent'}`}>
                      {log.agentName} • {log.action}
                    </span>
                    <span style={{ fontSize: '13px', whiteSpace: 'pre-line' }}>{log.details}</span>
                  </div>
                ))
              )}
            </div>

            {/* Quick Templates chips */}
            <div style={{ padding: '0 16px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>QUICK PRESETS:</p>
              <div className="prompt-chips">
                <button 
                  onClick={() => selectPredefinedPrompt("Create a 3-day study plan for Machine Learning basics including practice cards and calendar slots, then execute a safe command to verify system stats.")}
                  className="prompt-chip"
                  disabled={loading}
                >
                  🚀 ML Study Plan + System Stats
                </button>
                <button 
                  onClick={() => selectPredefinedPrompt("Plan a 1-day study session about React concepts, generate active recall questions, and run a safe git status command.")}
                  className="prompt-chip"
                  disabled={loading}
                >
                  ⚛️ React Study + Git Status
                </button>
              </div>
            </div>

            {/* Input field */}
            <div className="console-input-area">
              <form onSubmit={(e) => { e.preventDefault(); handleRunPipeline(prompt); }}>
                <div className="input-group">
                  <input
                    type="text"
                    className="text-input"
                    placeholder="Ask Planner Agent to coordinate..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={loading}
                  />
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    <Play size={14} />
                    Run
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* Middle Column: Tasks & Study Guides */}
        <section className="grid-column">
          
          {/* Planner Tasks */}
          <div className="glass-panel" style={{ flex: '1.2', minHeight: '280px', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header">
              <h2 className="panel-title">
                <Layers size={18} style={{ color: 'var(--color-secondary)' }} />
                Planner Board
              </h2>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {tasks.length} subtasks
              </span>
            </div>
            
            <div className="panel-body">
              {tasks.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>
                  No active plan tasks scheduled.
                </div>
              ) : (
                <div className="task-list">
                  {tasks.map((task) => (
                    <div key={task.id} className="task-card" style={{ opacity: task.status === 'Completed' ? 0.6 : 1 }}>
                      <button 
                        onClick={() => toggleTaskStatus(task.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: '2px' }}
                      >
                        {task.status === 'Completed' ? (
                          <CheckCircle2 size={18} className="text-emerald-400" style={{ color: 'var(--color-success)' }} />
                        ) : (
                          <Clock size={18} className="text-slate-400" />
                        )}
                      </button>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, textDecoration: task.status === 'Completed' ? 'line-through' : 'none' }}>
                            {task.title}
                          </span>
                          <span className={`priority-tag ${task.priority}`}>{task.priority}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                            {task.duration}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {task.recommendation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Exam Study Workspace */}
          <div className="glass-panel glow-violet" style={{ flex: '1', minHeight: '280px', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header">
              <h2 className="panel-title">
                <BookOpen size={18} style={{ color: 'var(--color-secondary)' }} />
                Active Study & Flashcards
              </h2>
              {studyTopic && (
                <span style={{ fontSize: '12px', color: 'var(--color-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Topic: {studyTopic}
                </span>
              )}
            </div>

            <div className="panel-body">
              {studySummary && (
                <div style={{ background: 'rgba(139, 92, 246, 0.05)', borderLeft: '3px solid var(--color-secondary)', padding: '12px', borderRadius: '4px', marginBottom: '16px', fontSize: '13px', lineHeight: 1.5 }}>
                  <p style={{ fontWeight: 700, color: 'var(--color-secondary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Concept Summary</p>
                  {studySummary}
                </div>
              )}

              {flashcards.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>
                  No active recall decks loaded.
                </div>
              ) : (
                <div className="flashcard-section">
                  <div className="flashcard-container" onClick={() => setIsCardFlipped(!isCardFlipped)}>
                    <div className={`flashcard-inner ${isCardFlipped ? 'flipped' : ''}`}>
                      <div className="flashcard-front">
                        <span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                          Card {currentCardIdx + 1} of {flashcards.length} • QUESTION
                        </span>
                        <p style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1.4 }}>
                          {flashcards[currentCardIdx].q}
                        </p>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'auto' }}>
                          Click card to flip and view answer
                        </span>
                      </div>
                      <div className="flashcard-back">
                        <span style={{ fontSize: '10px', color: 'var(--color-success)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
                          RECALL ANSWER
                        </span>
                        <p style={{ fontSize: '14px', lineHeight: 1.4 }}>
                          {flashcards[currentCardIdx].a}
                        </p>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'auto' }}>
                          Click card to flip back to question
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifySelf: 'center', gap: 12, marginTop: '8px' }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCardFlipped(false);
                        setCurrentCardIdx(idx => Math.max(0, idx - 1));
                      }}
                      disabled={currentCardIdx === 0}
                    >
                      Prev
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCardFlipped(false);
                        setCurrentCardIdx(idx => Math.min(flashcards.length - 1, idx + 1));
                      }}
                      disabled={currentCardIdx === flashcards.length - 1}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </section>

        {/* Right Column: Calendar & Command Sandbox audit */}
        <section className="grid-column">
          
          {/* Life Scheduler Calendar */}
          <div className="glass-panel" style={{ flex: '1.2', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header">
              <h2 className="panel-title">
                <Calendar size={18} style={{ color: 'var(--color-success)' }} />
                Life Calendar Timeline
              </h2>
            </div>
            
            <div className="panel-body">
              {calendarEvents.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>
                  No study events mapped in calendar database.
                </div>
              ) : (
                <div className="calendar-agenda">
                  {calendarEvents.map((evt) => (
                    <div key={evt.id} className="calendar-row">
                      <div className="calendar-time-col">
                        <span style={{ fontSize: '9px', textTransform: 'uppercase', opacity: 0.7 }}>
                          {formatDate(evt.start)}
                        </span>
                        <span style={{ color: evt.color, fontSize: '12px' }}>
                          {formatTime(evt.start)}
                        </span>
                      </div>
                      <div className="calendar-event-col" style={{ borderLeft: `3px solid ${evt.color}` }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{evt.title}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Block Type: {evt.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sandbox & Logs console */}
          <div className="glass-panel" style={{ flex: '1.5', minHeight: '350px', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header" style={{ paddingBottom: '8px' }}>
              <h2 className="panel-title">
                <Code size={18} />
                Sandbox CLI & MCP Tool Audits
              </h2>
              <button onClick={handleClearLogs} className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '11px' }}>
                <Trash2 size={12} />
                Clear System DB
              </button>
            </div>

            <div style={{ padding: '0 16px 8px', borderBottom: '1px solid var(--border-color)' }}>
              {/* Test Unsafe Commands panel */}
              <form onSubmit={handleExecuteManualCommand} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="text"
                  className="text-input"
                  placeholder="Test command (e.g. git status, rm -rf)"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  value={manualCommand}
                  onChange={(e) => setManualCommand(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                  Execute
                </button>
              </form>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button 
                  onClick={() => setManualCommand('git status')}
                  className="mono"
                  style={{ fontSize: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'var(--color-primary)', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px' }}
                >
                  git status (safe)
                </button>
                <button 
                  onClick={() => setManualCommand('rm -rf .')}
                  className="mono"
                  style={{ fontSize: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', color: 'var(--color-danger)', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px' }}
                >
                  rm -rf . (unsafe)
                </button>
              </div>
            </div>

            <div className="panel-body" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* CLI Execution output container */}
              {cliResult && (
                <div style={{ background: '#090a0f', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    {cliResult.status === 'success' ? (
                      <ShieldCheck size={14} style={{ color: 'var(--color-success)' }} />
                    ) : (
                      <ShieldAlert size={14} style={{ color: 'var(--color-danger)' }} />
                    )}
                    <span className="mono" style={{ fontWeight: 700, color: cliResult.status === 'success' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      Sandbox verdict: {cliResult.status === 'success' ? 'ALLOWED' : 'BLOCKED/FAILED'}
                    </span>
                  </div>
                  <div className="mono" style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    $ {cliResult.command}
                  </div>
                  {cliResult.stdout && (
                    <pre className="mono" style={{ color: '#ffffff', background: '#000', padding: '8px', borderRadius: '4px', overflowX: 'auto', maxHeight: '100px' }}>
                      {cliResult.stdout}
                    </pre>
                  )}
                  {cliResult.error && (
                    <pre className="mono" style={{ color: 'var(--color-danger)', background: '#000', padding: '8px', borderRadius: '4px', overflowX: 'auto', maxHeight: '100px', whiteSpace: 'pre-wrap' }}>
                      {cliResult.error}
                    </pre>
                  )}
                </div>
              )}

              {/* Console log list */}
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>MCP & SANDBOX AUDIT DECK:</div>
              <div className="terminal-logs">
                {mcpLogs.length === 0 ? (
                  <div className="terminal-line" style={{ opacity: 0.5 }}>
                    $ await_mcp_actions... No transaction logged yet.
                  </div>
                ) : (
                  mcpLogs.map((log, idx) => {
                    const timeStr = log.timestamp.split('T')[1].substring(0, 8);
                    return (
                      <div key={idx}>
                        <div className={`terminal-line ${log.status === 'SUCCESS' ? 'success' : log.status === 'BLOCKED' ? 'blocked' : 'error'}`}>
                          [{timeStr}] {log.status} • Tool: {log.toolName}
                        </div>
                        <div className="terminal-line" style={{ color: '#64748b', paddingLeft: '12px' }}>
                          Args: {JSON.stringify(log.args)}
                        </div>
                        {log.status === 'BLOCKED' && (
                          <div className="terminal-line" style={{ color: 'var(--color-danger)', paddingLeft: '12px', fontWeight: 700 }}>
                            Reason: {log.error}
                          </div>
                        )}
                        {log.status === 'SUCCESS' && log.toolName === 'execute_safe_command' && (
                          <div className="terminal-line" style={{ color: 'var(--color-success)', paddingLeft: '12px' }}>
                            Execution verified. Returning std_output channels.
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </div>

        </section>

      </main>
    </div>
  );
}

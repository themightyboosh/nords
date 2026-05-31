/**
 * PreviewChat.tsx — AI Chat Preview for MCP sessions.
 *
 * A chat window connected to the current project's MCP graph.
 * Features:
 *   - Send messages via Gemini proxy
 *   - Conversation history per session
 *   - Save / Reset / Load sessions
 *   - Dev Mode: tool call timeline, system prompt, horizon state, token metrics
 *   - Session metadata: current_nord, persona, traversal count
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Send, RotateCcw, Code2, X, ChevronDown, ChevronRight,
  Activity, Zap, MessageSquare, Bot, User, Cpu,
  Wrench, Eye, Map, FileText, AlertTriangle, FlaskConical, Loader2,
  GripVertical,
} from 'lucide-react';
import { api } from '../../api/client';
import './PreviewChat.css';

interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: ToolCall[] | null;
  context?: Record<string, unknown> | null;
  model?: string | null;
  tokens_in?: number | null;
  tokens_out?: number | null;
  latency_ms?: number | null;
  created_at: string;
}

interface SessionSummary {
  id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  current_nord_id: string | null;
  persona_id: string | null;
}

interface PreviewChatProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Called after AI updates data (properties, goals) so the canvas can refetch */
  onDataChanged?: () => void;
  /** When set, renders in read-only replay mode showing a test run transcript */
  replayTranscript?: Array<{ round: number; user_msg: string; agent_msg: string; tool_calls?: any[]; tokens_in?: number; tokens_out?: number; latency_ms?: number }> | null;
  replayLabel?: string | null;
  onClearReplay?: () => void;
}

type DevTab = 'tools' | 'prompt' | 'horizon';

export function PreviewChat({ projectId, isOpen, onClose, onDataChanged, replayTranscript, replayLabel, onClearReplay }: PreviewChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [devTab, setDevTab] = useState<DevTab>('tools');
  const [expandedToolCalls, setExpandedToolCalls] = useState<Set<string>>(new Set());
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [model, setModel] = useState(() => localStorage.getItem('nords-preview-model') || 'gemini-2.5-flash');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);

  const [lastSystemPrompt, setLastSystemPrompt] = useState<string | null>(null);
  const [lastHorizon, setLastHorizon] = useState<Record<string, unknown> | null>(null);
  const [lastToolCalls, setLastToolCalls] = useState<ToolCall[]>([]);
  const [lastTokens, setLastTokens] = useState<{ in: number; out: number; latency: number } | null>(null);

  // ── Replay mode ──
  const isReplayMode = !!replayTranscript;
  useEffect(() => {
    if (!replayTranscript) return;
    const replayMessages: Message[] = [];
    for (const r of replayTranscript) {
      if (r.user_msg) {
        replayMessages.push({
          id: `replay-user-${r.round}`,
          role: 'user',
          content: r.user_msg,
          created_at: new Date().toISOString(),
        });
      }
      if (r.agent_msg) {
        replayMessages.push({
          id: `replay-agent-${r.round}`,
          role: 'assistant',
          content: r.agent_msg,
          tool_calls: r.tool_calls || null,
          tokens_in: r.tokens_in,
          tokens_out: r.tokens_out,
          latency_ms: r.latency_ms,
          created_at: new Date().toISOString(),
        });
      }
    }
    setMessages(replayMessages);
    // Populate dev panel from last agent message
    const lastAgent = replayTranscript[replayTranscript.length - 1];
    if (lastAgent) {
      if (lastAgent.tool_calls) setLastToolCalls(lastAgent.tool_calls);
      setLastTokens({
        in: lastAgent.tokens_in || 0,
        out: lastAgent.tokens_out || 0,
        latency: lastAgent.latency_ms || 0,
      });
    }
  }, [replayTranscript]);

  // ── Test Runner state ──
  const [testScenarios, setTestScenarios] = useState<Array<{ id: string; name: string; user_profile: string }>>([]);
  const [showTestMenu, setShowTestMenu] = useState(false);
  const [testRunning, setTestRunning] = useState(false);
  const [testProgress, setTestProgress] = useState<{ round: number; maxRounds: number } | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [sessionNps, setSessionNps] = useState<number | null>(null);
  const testEventSourceRef = useRef<EventSource | null>(null);

  // ── Drag / Resize State ──
  const STORAGE_KEY = 'nords-preview-chat-rect';
  const getStoredRect = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as { x: number; y: number; w: number; h: number };
    } catch { /* ignore */ }
    return null;
  };

  const defaultRect = { x: window.innerWidth - 480, y: 60, w: 440, h: 600 };
  const [rect, setRect] = useState(() => getStoredRect() || defaultRect);
  const isDragging = useRef(false);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const chatRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Suppress the "shrink to size" flash by hiding for one frame
  useEffect(() => {
    if (isOpen) {
      setMounted(false);
      requestAnimationFrame(() => setMounted(true));
    }
  }, [isOpen]);

  // Persist rect changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rect));
  }, [rect]);

  // ResizeObserver to track user-resize via CSS resize
  // Delay observation to avoid the "shrink to size" animation on mount:
  // The browser fires several resize events when the element first mounts,
  // which thrashes between the default CSS size and the stored rect dimensions.
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    let armed = false;
    const armTimer = setTimeout(() => { armed = true; }, 150);
    const ro = new ResizeObserver((entries) => {
      if (!armed) return; // Ignore all events during initial layout
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setRect(prev => ({ ...prev, w: width, h: height }));
        }
      }
    });
    requestAnimationFrame(() => ro.observe(el));
    return () => { clearTimeout(armTimer); ro.disconnect(); };
  }, [isOpen]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // Only start drag from the header area (not buttons)
    if ((e.target as HTMLElement).closest('button, select, input')) return;
    e.preventDefault();
    isDragging.current = true;
    dragOffset.current = { dx: e.clientX - rect.x, dy: e.clientY - rect.y };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const newX = Math.max(0, Math.min(ev.clientX - dragOffset.current.dx, window.innerWidth - 200));
      const newY = Math.max(0, Math.min(ev.clientY - dragOffset.current.dy, window.innerHeight - 60));
      setRect(prev => ({ ...prev, x: newX, y: newY }));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [rect.x, rect.y]);

  const MODELS = [
    { id: 'gemini-2.5-flash',      label: '2.5 Flash',      desc: 'Fast & balanced' },
    { id: 'gemini-2.5-flash-lite', label: '2.5 Flash Lite', desc: 'Ultra-fast' },
    { id: 'gemini-2.5-pro',        label: '2.5 Pro',        desc: 'Most capable' },
  ];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load previous sessions list + project welcome message
  useEffect(() => {
    api.get<SessionSummary[]>(`/api/projects/${projectId}/mcp-sessions`)
      .then(setSessions)
      .catch(() => setSessions([]));
    // Fetch project for welcome message
    api.get<{ mcp_welcome_message?: string | null }>(`/api/projects/${projectId}`)
      .then(p => setWelcomeMessage(p.mcp_welcome_message || null))
      .catch(() => {});
    // Load test scenarios
    api.get<Array<{ id: string; name: string; user_profile: string }>>(`/api/projects/${projectId}/test-scenarios`)
      .then(setTestScenarios)
      .catch(() => setTestScenarios([]));
  }, [projectId]);

  // Load messages for current session
  const loadSession = useCallback(async (sid: string) => {
    try {
      const data = await api.get<{ messages: Message[] }>(`/api/sessions/${sid}/messages`);
      setMessages(data.messages || []);
      setSessionId(sid);
      setShowSessions(false);

      // Populate dev panel from last assistant message
      const lastAssistant = [...(data.messages || [])].reverse().find(m => m.role === 'assistant');
      if (lastAssistant) {
        if (lastAssistant.tool_calls) setLastToolCalls(lastAssistant.tool_calls);
        if (lastAssistant.context?.systemPrompt) setLastSystemPrompt(lastAssistant.context.systemPrompt as string);
        setLastTokens({
          in: lastAssistant.tokens_in || 0,
          out: lastAssistant.tokens_out || 0,
          latency: lastAssistant.latency_ms || 0,
        });
      }
    } catch {
      console.error('Failed to load session');
    }
  }, []);

  // Toggle tool call expansion
  const toggleToolCall = useCallback((id: string) => {
    setExpandedToolCalls(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Send message
  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    const userMessage = input.trim();
    setInput('');
    setSending(true);

    // Optimistic UI: show user message immediately
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }]);

    try {
      const data = await api.post<{
        reply: string;
        sessionId: string;
        message: Message;
        toolCalls: ToolCall[];
        completion: { shouldTransition: boolean; endNordId: string | null; incompleteCount: number };
        systemPrompt?: string;
        horizon?: Record<string, unknown>;
      }>(`/api/projects/${projectId}/chat`, {
        message: userMessage,
        sessionId,
        model,
      });

      setSessionId(data.sessionId);

      // Update dev panel state
      if (data.toolCalls?.length) setLastToolCalls(data.toolCalls);
      if (data.systemPrompt) setLastSystemPrompt(data.systemPrompt);
      if (data.horizon) setLastHorizon(data.horizon);
      if (data.message) {
        setLastTokens({
          in: data.message.tokens_in || 0,
          out: data.message.tokens_out || 0,
          latency: data.message.latency_ms || 0,
        });
      }

      // Replace temp message with real user + assistant messages
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        { id: `user-${Date.now()}`, role: 'user', content: userMessage, created_at: new Date().toISOString() },
        data.message,
      ]);

      // Extract goal_events from tool call results (nords_update_session_nord)
      const goalMessages: Message[] = [];
      if (data.toolCalls?.length) {
        for (const tc of data.toolCalls) {
          const result = tc.result as Record<string, unknown> | undefined;
          const goalEvents = result?.goal_events as Array<{ type: string; goal_name: string; progress?: { filled: number; total: number }; status?: string }> | undefined;
          if (goalEvents?.length) {
            for (const evt of goalEvents) {
              const pct = evt.progress ? Math.round((evt.progress.filled / evt.progress.total) * 100) : null;
              let label = '';
              if (evt.type === 'goal_completed') {
                label = `🎯 Goal complete: ${evt.goal_name}`;
              } else if (evt.type === 'goal_activated') {
                label = `🔓 Goal unlocked: ${evt.goal_name}`;
              } else if (evt.type === 'goal_progress') {
                label = `📊 ${evt.goal_name}: ${pct}%`;
              } else if (evt.type === 'session_terminating') {
                label = `✅ Session complete — ${evt.goal_name} achieved`;
              } else {
                label = `🎯 ${evt.goal_name}: ${evt.type}`;
              }
              goalMessages.push({
                id: `goal-${Date.now()}-${evt.goal_name}`,
                role: 'system',
                content: label,
                created_at: new Date().toISOString(),
              });
            }
          }
        }
      }
      if (goalMessages.length > 0) {
        setMessages(prev => [...prev, ...goalMessages]);
      }

      // If session completed, show transition notification
      if (data.completion?.shouldTransition) {
        setMessages(prev => [...prev, {
          id: `system-${Date.now()}`,
          role: 'system',
          content: `✅ All required properties filled. Session transitioned to End Nord.`,
          created_at: new Date().toISOString(),
        }]);
      }

      // Notify parent that data changed so canvas/goals can refetch
      if (data.toolCalls?.some(tc => ['nords_update_session_nord', 'nords_update_session_variables', 'nords_update_nord', 'nords_create_nord', 'nords_create_connection', 'nords_update_connection', 'nords_delete_nord', 'nords_delete_connection'].includes(tc.name))) {
        onDataChanged?.();
      }
    } catch (err) {
      // Replace temp with error
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        { id: `user-${Date.now()}`, role: 'user', content: userMessage, created_at: new Date().toISOString() },
        { id: `error-${Date.now()}`, role: 'system', content: '⚠ Failed to send message. Please try again.', created_at: new Date().toISOString() },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending, projectId, sessionId, model, onDataChanged]);

  // Reset session
  const handleReset = useCallback(async () => {
    if (sessionId) {
      try {
        await api.put(`/api/mcp-sessions/${sessionId}`, { status: 'abandoned' });
      } catch { /* ok */ }
    }
    setSessionId(null);
    setMessages([]);
    setLastSystemPrompt(null);
    setLastHorizon(null);
    setLastToolCalls([]);
    setLastTokens(null);
    // Refresh sessions list
    api.get<SessionSummary[]>(`/api/projects/${projectId}/mcp-sessions`)
      .then(setSessions)
      .catch(() => {});
  }, [sessionId, projectId]);

  // ── Live Test Run ──
  const startLiveTest = useCallback(async (scenarioId: string) => {
    // Reset chat state
    setMessages([]);
    setTestRunning(true);
    setTestResult(null);
    setTestProgress(null);
    setDevMode(true); // Auto-open dev mode for tests

    try {
      const result = await api.post<{ runId: string; streamUrl: string }>(`/api/test-scenarios/${scenarioId}/run`, {});
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const es = new EventSource(`${apiBase}${result.streamUrl}`);
      testEventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'user_message') {
            setTestProgress({ round: data.round, maxRounds: data.maxRounds });
            setMessages(prev => [...prev, {
              id: `test-user-${data.round}`,
              role: 'user' as const,
              content: `🧪 ${data.content}`,
              created_at: new Date().toISOString(),
            }]);
          }

          if (data.type === 'agent_response') {
            setMessages(prev => [...prev, {
              id: `test-agent-${data.round}`,
              role: 'assistant' as const,
              content: data.content,
              tool_calls: data.toolCalls,
              tokens_in: data.tokensIn,
              tokens_out: data.tokensOut,
              latency_ms: data.latencyMs,
              created_at: new Date().toISOString(),
            }]);
            // Update dev panel
            if (data.toolCalls) setLastToolCalls(data.toolCalls);
            if (data.horizon) setLastHorizon(data.horizon);
            if (data.tokensIn != null) setLastTokens({ in: data.tokensIn, out: data.tokensOut, latency: data.latencyMs });
          }

          if (data.type === 'run_complete') {
            setTestRunning(false);
            setTestResult(data);
            if (data.nps != null) setSessionNps(data.nps);
            es.close();
          }

          if (data.type === 'error') {
            setTestRunning(false);
            setMessages(prev => [...prev, {
              id: `test-error-${Date.now()}`,
              role: 'system' as const,
              content: `⚠ Test failed: ${data.error}`,
              created_at: new Date().toISOString(),
            }]);
            es.close();
          }
        } catch { /* ignore parse errors */ }
      };

      es.onerror = () => {
        setTestRunning(false);
        es.close();
      };
    } catch (err) {
      setTestRunning(false);
      setMessages(prev => [...prev, {
        id: `test-error-${Date.now()}`,
        role: 'system' as const,
        content: '⚠ Failed to start test run.',
        created_at: new Date().toISOString(),
      }]);
    }
  }, []);

  // Keyboard shortcut
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // ── Render Helpers ──

  function renderToolCallInline(tc: ToolCall, index: number, msgId: string) {
    const key = `${msgId}-tc-${index}`;
    const isExpanded = expandedToolCalls.has(key);
    const isRead = tc.name.includes('get_') || tc.name.includes('query_');
    const isMutate = tc.name.includes('update_') || tc.name.includes('create_') || tc.name.includes('delete_');
    const isNav = tc.name.includes('traverse') || tc.name.includes('switch');

    return (
      <div key={key} className="tool-call-inline">
        <button
          className={`tool-call-inline__header ${isRead ? 'is-read' : isMutate ? 'is-mutate' : isNav ? 'is-nav' : ''}`}
          onClick={() => toggleToolCall(key)}
        >
          {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          <Wrench size={10} />
          <span className="tool-call-inline__name">{tc.name.replace('nords_', '')}</span>
          {Object.keys(tc.arguments).length > 0 && (
            <span className="tool-call-inline__args-count">{Object.keys(tc.arguments).length} args</span>
          )}
        </button>
        {isExpanded && (
          <div className="tool-call-inline__body">
            <div className="tool-call-inline__section">
              <span className="tool-call-inline__label">Arguments</span>
              <pre>{JSON.stringify(tc.arguments, null, 2)}</pre>
            </div>
            {tc.result !== undefined && (
              <div className="tool-call-inline__section">
                <span className="tool-call-inline__label">Result</span>
                <pre>{JSON.stringify(tc.result, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderDevPanel() {
    return (
      <div className="preview-chat__dev-panel">
        <div className="preview-chat__dev-tabs">
          <button
            className={`preview-chat__dev-tab ${devTab === 'tools' ? 'is-active' : ''}`}
            onClick={() => setDevTab('tools')}
          >
            <Wrench size={11} />
            <span>Tools{lastToolCalls.length > 0 ? ` (${lastToolCalls.length})` : ''}</span>
          </button>
          <button
            className={`preview-chat__dev-tab ${devTab === 'prompt' ? 'is-active' : ''}`}
            onClick={() => setDevTab('prompt')}
          >
            <FileText size={11} />
            <span>System Prompt</span>
          </button>
          <button
            className={`preview-chat__dev-tab ${devTab === 'horizon' ? 'is-active' : ''}`}
            onClick={() => setDevTab('horizon')}
          >
            <Map size={11} />
            <span>Horizon</span>
          </button>
        </div>

        {/* Token summary bar */}
        {lastTokens && (
          <div className="preview-chat__dev-metrics">
            <span><Cpu size={10} /> {lastTokens.in.toLocaleString()}→{lastTokens.out.toLocaleString()} tokens</span>
            <span><Zap size={10} /> {lastTokens.latency}ms</span>
            {sessionNps != null && (
              <span className={`preview-chat__nps-badge ${sessionNps >= 9 ? 'nps--promoter' : sessionNps >= 7 ? 'nps--passive' : 'nps--detractor'}`}>
                NPS: {sessionNps}/10 · {sessionNps >= 9 ? 'Promoter' : sessionNps >= 7 ? 'Passive' : 'Detractor'}
              </span>
            )}
          </div>
        )}

        <div className="preview-chat__dev-content">
          {devTab === 'tools' && renderToolsTab()}
          {devTab === 'prompt' && renderPromptTab()}
          {devTab === 'horizon' && renderHorizonTab()}
        </div>
      </div>
    );
  }

  function renderToolsTab() {
    if (lastToolCalls.length === 0) {
      return (
        <div className="preview-chat__dev-empty">
          <Wrench size={20} strokeWidth={1} />
          <p>No tool calls yet. Send a message to see the AI's tool chain.</p>
        </div>
      );
    }

    return (
      <div className="preview-chat__tool-timeline">
        {lastToolCalls.map((tc, i) => {
          const isRead = tc.name.includes('get_') || tc.name.includes('query_');
          const isMutate = tc.name.includes('update_') || tc.name.includes('create_') || tc.name.includes('delete_');
          const isNav = tc.name.includes('traverse') || tc.name.includes('switch');
          const key = `timeline-${i}`;
          const isExpanded = expandedToolCalls.has(key);

          return (
            <div key={key} className="tool-timeline__item">
              <div className="tool-timeline__connector" />
              <div
                className={`tool-timeline__dot ${isRead ? 'is-read' : isMutate ? 'is-mutate' : isNav ? 'is-nav' : ''}`}
              />
              <div className="tool-timeline__content">
                <button className="tool-timeline__header" onClick={() => toggleToolCall(key)}>
                  {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  <span className="tool-timeline__step">{i + 1}</span>
                  <span className="tool-timeline__name">{tc.name.replace('nords_', '')}</span>
                </button>
                {isExpanded && (
                  <div className="tool-timeline__detail">
                    <div className="tool-timeline__section">
                      <span className="tool-timeline__label">→ Arguments</span>
                      <pre>{JSON.stringify(tc.arguments, null, 2)}</pre>
                    </div>
                    {tc.result !== undefined && (
                      <div className="tool-timeline__section">
                        <span className="tool-timeline__label">← Result</span>
                        <pre>{JSON.stringify(tc.result, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderPromptTab() {
    if (!lastSystemPrompt) {
      return (
        <div className="preview-chat__dev-empty">
          <FileText size={20} strokeWidth={1} />
          <p>System prompt will appear after the first AI response.</p>
        </div>
      );
    }

    return (
      <div className="preview-chat__prompt-view">
        <pre>{lastSystemPrompt}</pre>
      </div>
    );
  }

  function renderHorizonTab() {
    if (!lastHorizon) {
      return (
        <div className="preview-chat__dev-empty">
          <Map size={20} strokeWidth={1} />
          <p>Horizon data will appear after the first AI response.</p>
        </div>
      );
    }

    const h = lastHorizon as any;
    const gaps = h.gaps || {};
    const hasGaps = (gaps.unvisited_required?.length > 0) || (gaps.orphan_nords?.length > 0);

    return (
      <div className="preview-chat__horizon-view">
        {/* Current Nord */}
        {h.current_nord && (
          <div className="horizon-section">
            <div className="horizon-section__title">
              <Eye size={11} />
              <span>Current Nord</span>
            </div>
            <div className="horizon-card">
              <strong>{h.current_nord.title}</strong>
              <span className="horizon-card__type">{h.current_nord.type_name}</span>
              {h.current_nord.session_progress && (
                <div className="horizon-card__progress">
                  <div
                    className="horizon-card__progress-bar"
                    style={{
                      width: `${h.current_nord.session_progress.required > 0
                        ? (h.current_nord.session_progress.filled / h.current_nord.session_progress.required) * 100
                        : 100}%`
                    }}
                  />
                  <span>{h.current_nord.session_progress.filled}/{h.current_nord.session_progress.required}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Persona */}
        {h.persona && (
          <div className="horizon-section">
            <div className="horizon-section__title">
              <User size={11} />
              <span>Persona: {h.persona.name}</span>
            </div>
            <div className="horizon-card">
              {h.persona.primary_motivation && (
                <span className="horizon-card__reason">🎯 {h.persona.primary_motivation}</span>
              )}
              {h.persona.voice_and_tone && (
                <span className="horizon-card__reason" style={{ marginTop: 4 }}>🗣 {h.persona.voice_and_tone}</span>
              )}
              {h.persona.mental_models?.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <span className="horizon-card__type" style={{ fontWeight: 600 }}>Mental Models</span>
                  {h.persona.mental_models.map((mm: any, j: number) => (
                    <div key={j} style={{ fontSize: 10, color: '#9ca3af', marginTop: 3, paddingLeft: 8, borderLeft: '2px solid rgba(99,102,241,0.3)' }}>
                      <strong style={{ color: '#d1d5db' }}>{mm.name}</strong>: {mm.body}
                    </div>
                  ))}
                </div>
              )}
              {h.persona.guardrails?.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <span className="horizon-card__type" style={{ fontWeight: 600 }}>Guardrails</span>
                  {h.persona.guardrails.map((g: any, j: number) => (
                    <div key={j} style={{ fontSize: 10, color: g.mode === 'deny' ? '#f87171' : '#fbbf24', marginTop: 2 }}>
                      [{g.mode.toUpperCase()}] {g.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completion */}
        <div className="horizon-section">
          <div className="horizon-section__title">
            <Activity size={11} />
            <span>Overall: {h.completion?.percentage ?? 0}%</span>
          </div>
          <div className="horizon-card__progress">
            <div className="horizon-card__progress-bar" style={{ width: `${h.completion?.percentage ?? 0}%` }} />
            <span>{h.completion?.filled ?? 0}/{h.completion?.required ?? 0} fields</span>
          </div>
        </div>

        {/* Remaining Collections */}
        {h.remaining_variables?.length > 0 && (
          <div className="horizon-section">
            <div className="horizon-section__title">
              <Activity size={11} />
              <span>Remaining Collections ({h.remaining_variables.length})</span>
            </div>
            {h.remaining_variables.map((v: any, i: number) => (
              <div key={i} className="horizon-neighbor">
                <span className="horizon-neighbor__title">{v.name}</span>
                <span className="horizon-neighbor__type">{v.type}</span>
                {v.required && <span className="horizon-gap__badge" style={{ fontSize: 8, padding: '1px 4px' }}>REQUIRED</span>}
              </div>
            ))}
          </div>
        )}

        {/* Suggested Persona */}
        {h.suggested_persona && (
          <div className="horizon-section">
            <div className="horizon-section__title">
              <User size={11} />
              <span>Suggested Persona</span>
            </div>
            <div className="horizon-card">
              <strong>{h.suggested_persona.name}</strong>
              <span className="horizon-card__reason">{h.suggested_persona.reason}</span>
            </div>
          </div>
        )}

        {/* Goals */}
        {h.goals?.length > 0 && (
          <div className="horizon-section">
            <div className="horizon-section__title">
              <Zap size={11} />
              <span>Goals ({h.goals.length})</span>
            </div>
            {h.goals.map((g: any, i: number) => (
              <div key={i} className="horizon-neighbor">
                <span className="horizon-neighbor__title">{g.name}</span>
                <span className={`horizon-gap__badge ${g.status === 'completed' ? 'horizon-gap__badge--orphan' : ''}`}
                      style={{ fontSize: 8, padding: '1px 4px' }}>
                  {g.status?.toUpperCase() || 'PENDING'}
                </span>
                {g.persona_weight != null && (
                  <span className="horizon-neighbor__bias">{(g.persona_weight * 100).toFixed(0)}%</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Neighbors */}
        {h.neighbors?.length > 0 && (
          <div className="horizon-section">
            <div className="horizon-section__title">
              <Map size={11} />
              <span>Neighbors ({h.neighbors.length})</span>
            </div>
            {h.neighbors.slice(0, 8).map((n: any, i: number) => (
              <div key={i} className="horizon-neighbor">
                <span className="horizon-neighbor__title">{n.nord.title}</span>
                <span className="horizon-neighbor__type">{n.nord.type_name}</span>
                <span className="horizon-neighbor__verb">{n.relationship.verb || n.relationship.type_name}</span>
                <span className="horizon-neighbor__bias">{(n.persona_bias * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Gaps */}
        {hasGaps && (
          <div className="horizon-section horizon-section--warn">
            <div className="horizon-section__title">
              <AlertTriangle size={11} />
              <span>Gaps</span>
            </div>
            {gaps.unvisited_required?.map((g: any, i: number) => (
              <div key={`uv-${i}`} className="horizon-gap">
                <span className="horizon-gap__badge">UNVISITED</span>
                <span>{g.title} ({g.type_name})</span>
              </div>
            ))}
            {gaps.orphan_nords?.map((g: any, i: number) => (
              <div key={`or-${i}`} className="horizon-gap">
                <span className="horizon-gap__badge horizon-gap__badge--orphan">ORPHAN</span>
                <span>{g.title} ({g.type_name})</span>
              </div>
            ))}
          </div>
        )}

        {/* Suggested Next */}
        {h.suggested_next && (
          <div className="horizon-section">
            <div className="horizon-section__title">
              <Zap size={11} />
              <span>Suggested Next</span>
            </div>
            <div className="horizon-card">
              <strong>{h.suggested_next.title}</strong>
              <span className="horizon-card__reason">{h.suggested_next.reason}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div
      ref={chatRef}
      className="preview-chat"
      data-testid="preview-chat"
      style={{
        position: 'fixed',
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        minWidth: 360,
        minHeight: 400,
        maxWidth: '90vw',
        maxHeight: '90vh',
        zIndex: 500,
        resize: 'both',
        overflow: 'hidden',
        visibility: mounted ? 'visible' : 'hidden',
      }}
    >
      {/* Header — doubles as drag handle */}
      <div
        className="preview-chat__header preview-chat__drag-handle"
        onMouseDown={handleDragStart}
      >
        <div className="preview-chat__header-left">
          <GripVertical size={14} className="preview-chat__grip-icon" />
          <Bot size={16} />
          <span className="preview-chat__title">{isReplayMode ? '🔁 Replay' : 'Agent Preview'}</span>
          {isReplayMode && replayLabel && (
            <code className="preview-chat__session-id" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>{replayLabel}</code>
          )}
          {!isReplayMode && sessionId && (
            <code className="preview-chat__session-id">{sessionId.slice(0, 8)}…</code>
          )}
        </div>
        <div className="preview-chat__header-actions">
          <button
            className={`preview-chat__action-btn ${devMode ? 'is-active' : ''}`}
            onClick={() => setDevMode(!devMode)}
            title="Toggle Dev Mode"
          >
            <Code2 size={14} />
          </button>
          <select
            className="preview-chat__model-select"
            value={model}
            onChange={e => {
              setModel(e.target.value);
              localStorage.setItem('nords-preview-model', e.target.value);
            }}
            title="Select model"
          >
            {MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <button
            className="preview-chat__action-btn"
            onClick={() => setShowSessions(!showSessions)}
            title="Session History"
          >
            <Activity size={14} />
            <ChevronDown size={10} />
          </button>
          <button className="preview-chat__action-btn" onClick={handleReset} title="Reset Session">
            <RotateCcw size={14} />
          </button>
          {testScenarios.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                className="preview-chat__action-btn"
                onClick={() => setShowTestMenu(!showTestMenu)}
                title="Run Test"
                disabled={testRunning}
                style={testRunning ? { opacity: 0.5 } : {}}
              >
                {testRunning ? <Loader2 size={14} className="test-runner__running" /> : <FlaskConical size={14} />}
              </button>
              {showTestMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowTestMenu(false)} />
                  <div className="preview-chat__test-menu">
                    <div className="preview-chat__test-menu-title">Run Test Scenario</div>
                    {testScenarios.map(s => (
                      <button
                        key={s.id}
                        className="preview-chat__test-menu-item"
                        onClick={() => {
                          setShowTestMenu(false);
                          startLiveTest(s.id);
                        }}
                      >
                        <span>{s.name}</span>
                        <span className="preview-chat__test-profile">{s.user_profile}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <button className="preview-chat__action-btn" onClick={onClose} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Sessions Panel — full chat body replacement */}
      {showSessions && (
        <div className="preview-chat__sessions-panel">
          <div className="preview-chat__sessions-header">
            <span>Sessions ({sessions.length})</span>
            <button className="preview-chat__action-btn" onClick={() => setShowSessions(false)} title="Close sessions">
              <X size={14} />
            </button>
          </div>
          {sessions.length === 0 ? (
            <div className="preview-chat__dev-empty">
              <Activity size={20} strokeWidth={1} />
              <p>No sessions yet. Start a conversation to create one.</p>
            </div>
          ) : (
            <div className="preview-chat__sessions-list">
              {sessions.map(s => (
                <div
                  key={s.id}
                  className={`preview-chat__session-card ${s.id === sessionId ? 'is-active' : ''}`}
                >
                  <div className="preview-chat__session-card-top" onClick={() => loadSession(s.id)}>
                    <span className="preview-chat__session-status" data-status={s.status} />
                    <code>{s.id.slice(0, 8)}…</code>
                    <span className="preview-chat__session-badge">{s.status}</span>
                    <span className="preview-chat__session-date">
                      {new Date(s.started_at).toLocaleDateString()} {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="preview-chat__session-card-actions">
                    <button
                      className="preview-chat__session-action-btn"
                      onClick={() => loadSession(s.id)}
                      title="Load session"
                    >
                      <MessageSquare size={11} /> Load
                    </button>
                    <button
                      className="preview-chat__session-action-btn"
                      onClick={async () => {
                        try {
                          const data = await api.get<{ messages: Message[] }>(`/api/sessions/${s.id}/messages`);
                          const transcript = (data.messages || [])
                            .map(m => `[${m.role}] ${m.content}`)
                            .join('\n\n');
                          const blob = new Blob([transcript], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `session-${s.id.slice(0, 8)}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch { /* ignore */ }
                      }}
                      title="Export transcript"
                    >
                      <FileText size={11} /> Export
                    </button>
                    <button
                      className="preview-chat__session-action-btn preview-chat__session-action-btn--danger"
                      onClick={async () => {
                        try {
                          await api.put(`/api/mcp-sessions/${s.id}`, { status: 'abandoned' });
                          setSessions(prev => prev.map(x => x.id === s.id ? { ...x, status: 'abandoned' } : x));
                          if (sessionId === s.id) {
                            setSessionId(null);
                            setMessages([]);
                          }
                        } catch { /* ignore */ }
                      }}
                      title="Abandon session"
                      disabled={s.status === 'abandoned' || s.status === 'completed'}
                    >
                      <X size={11} /> Abandon
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status Strip — always visible when a session is active */}
      {sessionId && lastHorizon && (
        <div className="preview-chat__status-strip">
          {(lastHorizon as any).current_nord && (
            <span className="preview-chat__status-item">
              <Eye size={10} />
              <strong>{(lastHorizon as any).current_nord.title}</strong>
              <span className="preview-chat__status-type">{(lastHorizon as any).current_nord.type_name}</span>
              {(lastHorizon as any).current_nord.session_progress && (
                <span className="preview-chat__status-progress">
                  {(lastHorizon as any).current_nord.session_progress.filled}/{(lastHorizon as any).current_nord.session_progress.required}
                </span>
              )}
            </span>
          )}
          {(lastHorizon as any).persona && (
            <span className="preview-chat__status-item">
              <User size={10} />
              <strong>{(lastHorizon as any).persona.name}</strong>
            </span>
          )}
        </div>
      )}

      {/* Main Content: Messages + Dev Panel */}
      <div className="preview-chat__body">
        {/* Messages Area */}
        <div className="preview-chat__messages">
          {messages.length === 0 && (
            <div className="preview-chat__empty">
              <Bot size={32} strokeWidth={1} />
              {welcomeMessage ? (
                <>
                  <p className="preview-chat__welcome">{welcomeMessage}</p>
                  <p className="preview-chat__hint">Type a message to begin your session.</p>
                </>
              ) : (
                <>
                  <p>Start a conversation with your project's agent.</p>
                  <p className="preview-chat__hint">Messages are logged and visible in Dev Mode.</p>
                </>
              )}
            </div>
          )}
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`preview-chat__message preview-chat__message--${msg.role}`}
            >
              <div className="preview-chat__message-avatar">
                {msg.role === 'user' ? <User size={14} /> : msg.role === 'assistant' ? <Bot size={14} /> : <Zap size={14} />}
              </div>
              <div className="preview-chat__message-content">
                <span className="preview-chat__message-role">{msg.role}</span>
                <p>{msg.content}</p>

                {/* Dev mode: inline tool calls under assistant messages */}
                {devMode && msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0 && (
                  <div className="preview-chat__message-tools">
                    <span className="preview-chat__message-tools-label">
                      <Wrench size={10} /> {msg.tool_calls.length} tool call{msg.tool_calls.length > 1 ? 's' : ''}
                    </span>
                    {msg.tool_calls.map((tc, i) => renderToolCallInline(tc, i, msg.id))}
                  </div>
                )}

                {/* Dev mode: metadata footer */}
                {devMode && msg.latency_ms != null && (
                  <span className="preview-chat__message-meta">
                    {msg.model} · {msg.latency_ms}ms
                    {msg.tokens_in != null && ` · ${msg.tokens_in.toLocaleString()}→${msg.tokens_out?.toLocaleString()} tokens`}
                  </span>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="preview-chat__message preview-chat__message--assistant">
              <div className="preview-chat__message-avatar"><Bot size={14} /></div>
              <div className="preview-chat__message-content">
                <span className="preview-chat__message-role">assistant</span>
                <p className="preview-chat__typing">
                  <span /><span /><span />
                </p>
              </div>
            </div>
          )}
          {/* Test Progress Bar */}
          {testRunning && testProgress && (
            <div className="preview-chat__test-progress">
              <div className="preview-chat__test-progress-label">
                🧪 Round {testProgress.round}/{testProgress.maxRounds}
              </div>
              <div className="preview-chat__test-progress-bar">
                <div
                  className="preview-chat__test-progress-fill"
                  style={{ width: `${(testProgress.round / testProgress.maxRounds) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Test Result Card */}
          {testResult && (
            <div className={`preview-chat__test-result ${testResult.passed ? 'preview-chat__test-result--pass' : 'preview-chat__test-result--fail'}`}>
              <div className="preview-chat__test-result-header">
                {testResult.passed ? '✅ PASS' : '❌ FAIL'}
              </div>
              <div className="preview-chat__test-result-stats">
                {testResult.nps != null && <span>NPS: {testResult.nps}/10</span>}
                {testResult.stopReason && <span>Stop: {testResult.stopReason}</span>}
              </div>
              {testResult.sentiment && (
                <p className="preview-chat__test-result-sentiment">"{testResult.sentiment}"</p>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Dev Mode Panel */}
        {devMode && renderDevPanel()}
      </div>

      {/* Input */}
      {isReplayMode ? (
        <div className="preview-chat__input-area" style={{ justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, opacity: 0.6 }}>Viewing test run replay ({messages.length} messages)</span>
          <button
            className="preview-chat__send-btn"
            onClick={() => {
              onClearReplay?.();
              setMessages([]);
            }}
            style={{ background: 'rgba(139, 92, 246, 0.2)', borderColor: 'rgba(139, 92, 246, 0.3)' }}
          >
            <X size={14} /> Exit
          </button>
        </div>
      ) : (
        <div className="preview-chat__input-area">
          <textarea
            className="preview-chat__input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message…"
            rows={1}
            disabled={sending}
          />
          <button
            className="preview-chat__send-btn"
            onClick={handleSend}
            disabled={!input.trim() || sending}
          >
            <Send size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

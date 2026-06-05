/**
 * PreviewChat.tsx — AI Chat Preview for MCP sessions.
 *
 * A chat window connected to the current project's MCP graph.
 * Features:
 *   - Send messages via Gemini proxy
 *   - Conversation history per session
 *   - Save / Reset / Load sessions
 *   - Dev Mode: real-time session log stream
 *   - "Dump Horizon" button injects horizon state into log
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Send, RotateCcw, Code2, X, ChevronDown, ChevronRight,
  Zap, Bot, User,
  Wrench, Eye, EyeOff, Map, FlaskConical, Loader2,
  GripVertical, Play,
} from 'lucide-react';
import { api } from '../../api/client';
import { ChatMessage } from '../ChatMessage/ChatMessage';
import type { ToolCall } from '../ChatMessage/ChatMessage';
import './PreviewChat.css';

// ToolCall type imported from ChatMessage

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



interface PreviewChatProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Called after AI updates data (properties, goals) so the canvas can refetch */
  onDataChanged?: () => void;
  /** When set, renders in read-only replay mode showing a test run transcript */
  replayTranscript?: Array<{ round: number; user_msg: string; agent_msg: string; tool_calls?: any[]; tokens_in?: number; tokens_out?: number; latency_ms?: number; delay_ms?: number }> | null;
  replayLabel?: string | null;
  onClearReplay?: () => void;
}

interface DevLogEntry {
  id: string;
  timestamp: string;
  type: 'tool_call' | 'tool_result' | 'system' | 'horizon' | 'tokens' | 'goal';
  label: string;
  detail?: string;
}

export function PreviewChat({ projectId, isOpen, onClose, onDataChanged, replayTranscript, replayLabel, onClearReplay }: PreviewChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [devLog, setDevLog] = useState<DevLogEntry[]>([]);
  const [expandedLogEntries, setExpandedLogEntries] = useState<Set<string>>(new Set());

  const [model, setModel] = useState(() => localStorage.getItem('nords-preview-model') || 'gemini-2.5-flash');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const devLogEndRef = useRef<HTMLDivElement>(null);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);

  const [lastHorizon, setLastHorizon] = useState<Record<string, unknown> | null>(null);
  const [lastToolCalls, setLastToolCalls] = useState<ToolCall[]>([]);
  const [sessionNps, setSessionNps] = useState<number | null>(null);
  const [lastTokens, setLastTokens] = useState<{ in: number; out: number; latency: number } | null>(null);

  // ── Replay mode ──
  const isReplayMode = !!replayTranscript;
  const [replaySpeed, setReplaySpeed] = useState(2); // 0=instant, 1=1×, 2=2×, 5=5×
  const [replayIndex, setReplayIndex] = useState(0); // how many rounds have been revealed
  const [replayTyping, setReplayTyping] = useState(false); // show typing indicator between rounds
  const [replayInputText, setReplayInputText] = useState(''); // typewriter text shown in input
  const [replayInputDone, setReplayInputDone] = useState(false); // flash send button when typing completes
  const [replayDemoMode, setReplayDemoMode] = useState(false); // hides replay chrome for clean demo
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replayTypeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_DELAY_MS = 5000; // cap per-round delay

  // Cleanup replay timers on unmount
  useEffect(() => {
    return () => {
      if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
      if (replayTypeTimerRef.current) clearTimeout(replayTypeTimerRef.current);
    };
  }, []);

  // Paced replay engine — drips messages using delay_ms
  useEffect(() => {
    if (!replayTranscript || replayTranscript.length === 0) return;

    // Reset state when transcript changes
    setMessages([]);
    setDevLog([]);
    setDevMode(true);
    setReplayIndex(0);
    setReplayTyping(false);
    if (replayTimerRef.current) clearTimeout(replayTimerRef.current);

    // Instant mode (speed=0): load everything at once
    if (replaySpeed === 0) {
      loadAllReplayMessages(replayTranscript);
      return;
    }

    // Paced mode: start the chain
    driveReplayRound(0, replayTranscript, replaySpeed);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayTranscript]);

  // Re-pace when speed changes mid-replay
  useEffect(() => {
    if (!replayTranscript || !isReplayMode) return;
    if (replayTimerRef.current) clearTimeout(replayTimerRef.current);

    if (replaySpeed === 0) {
      // Switch to instant: load remaining
      loadAllReplayMessages(replayTranscript);
    } else if (replayIndex < replayTranscript.length) {
      // Continue from current position
      driveReplayRound(replayIndex, replayTranscript, replaySpeed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replaySpeed]);

  function loadAllReplayMessages(transcript: NonNullable<typeof replayTranscript>) {
    const msgs: Message[] = [];
    const logEntries: DevLogEntry[] = [];
    for (const r of transcript) {
      if (r.agent_msg && r.round === 0) {
        msgs.push({ id: `replay-agent-${r.round}`, role: 'assistant', content: r.agent_msg, tool_calls: r.tool_calls || null, tokens_in: r.tokens_in, tokens_out: r.tokens_out, latency_ms: r.latency_ms, created_at: new Date().toISOString() });
        r.tool_calls?.forEach(tc => logEntries.push({ id: `replay-tc-${r.round}-${tc.name}`, timestamp: new Date().toISOString(), type: 'tool_call', label: `🔧 ${tc.name.replace('nords_', '')}`, detail: JSON.stringify({ arguments: tc.arguments, result: tc.result }, null, 2) }));
        continue;
      }
      if (r.user_msg) msgs.push({ id: `replay-user-${r.round}`, role: 'user', content: r.user_msg, created_at: new Date().toISOString() });
      if (r.agent_msg) {
        msgs.push({ id: `replay-agent-${r.round}`, role: 'assistant', content: r.agent_msg, tool_calls: r.tool_calls || null, tokens_in: r.tokens_in, tokens_out: r.tokens_out, latency_ms: r.latency_ms, created_at: new Date().toISOString() });
        r.tool_calls?.forEach(tc => logEntries.push({ id: `replay-tc-${r.round}-${tc.name}`, timestamp: new Date().toISOString(), type: 'tool_call', label: `🔧 ${tc.name.replace('nords_', '')}`, detail: JSON.stringify({ arguments: tc.arguments, result: tc.result }, null, 2) }));
        if (r.tokens_in) logEntries.push({ id: `replay-tokens-${r.round}`, timestamp: new Date().toISOString(), type: 'tokens', label: `⚡ ${(r.tokens_in || 0).toLocaleString()}→${(r.tokens_out || 0).toLocaleString()} tokens · ${r.latency_ms || 0}ms` });
      }
    }
    setMessages(msgs);
    setDevLog(logEntries);
    setReplayIndex(transcript.length);
    setReplayTyping(false);
    const lastAgent = transcript[transcript.length - 1];
    if (lastAgent?.tool_calls) setLastToolCalls(lastAgent.tool_calls);
  }

  /**
   * Simulate human-like typing with natural rhythm variations.
   * - Base speed ~50ms/char at 1×, scaled by speed multiplier
   * - Faster bursts for common letter sequences
   * - Pauses after spaces, commas, periods, question marks
   * - Random jitter ±40% on every keystroke
   */
  function simulateTyping(text: string, speed: number, onDone: () => void) {
    if (replayTypeTimerRef.current) clearTimeout(replayTypeTimerRef.current);
    setReplayInputText('');
    setReplayInputDone(false);
    let charIdx = 0;

    function getDelay(char: string, prevChar: string): number {
      const base = 50 / speed; // base ms per char
      let delay = base;

      // Pauses at word boundaries and punctuation
      if (char === ' ') delay = base * 1.8;
      else if (char === '.' || char === '!' || char === '?') delay = base * 3.5;
      else if (char === ',') delay = base * 2.2;
      else if (char === '\n') delay = base * 4;
      // Speed bursts in the middle of words
      else if (prevChar && prevChar !== ' ' && /[a-z]/i.test(char)) delay = base * 0.7;

      // Random jitter: ±40%
      const jitter = 0.6 + Math.random() * 0.8; // 0.6 to 1.4
      delay = delay * jitter;

      // Occasional micro-pause (1 in 12 chars) — simulates thinking
      if (Math.random() < 0.08) delay += base * 2.5;

      return Math.max(15, Math.round(delay));
    }

    function typeNext() {
      charIdx++;
      if (charIdx <= text.length) {
        setReplayInputText(text.slice(0, charIdx));
        const char = text[charIdx - 1];
        const prevChar = charIdx > 1 ? text[charIdx - 2] : '';
        const nextDelay = getDelay(char, prevChar);
        replayTypeTimerRef.current = setTimeout(typeNext, nextDelay);
      } else {
        // Typing complete — flash the send button briefly, then "submit"
        replayTypeTimerRef.current = null;
        setReplayInputDone(true);
        setTimeout(() => {
          setReplayInputText('');
          setReplayInputDone(false);
          onDone();
        }, Math.max(200, 400 / speed));
      }
    }

    // Small initial pause before typing starts
    replayTypeTimerRef.current = setTimeout(typeNext, Math.max(100, 300 / speed));
  }

  function driveReplayRound(roundIdx: number, transcript: NonNullable<typeof replayTranscript>, speed: number) {
    if (roundIdx >= transcript.length) {
      setReplayTyping(false);
      return;
    }
    const r = transcript[roundIdx];

    // Step 1: simulate typing the user message into the input field
    const afterUserMessage = () => {
      // Add the user message to the chat
      if (r.user_msg && r.round !== 0) {
        setMessages(prev => [...prev, {
          id: `replay-user-${r.round}`, role: 'user', content: r.user_msg, created_at: new Date().toISOString(),
        }]);
      }

      // Step 2: show typing indicator, then agent message after agent latency
      const agentLatency = Math.min(r.latency_ms || 800, 3000);
      const typingDelay = Math.max(agentLatency / speed, 300);

      setReplayTyping(true);
      replayTimerRef.current = setTimeout(() => {
        setReplayTyping(false);
        if (r.agent_msg) {
          setMessages(prev => [...prev, {
            id: `replay-agent-${r.round}`, role: 'assistant', content: r.agent_msg,
            tool_calls: r.tool_calls || null, tokens_in: r.tokens_in, tokens_out: r.tokens_out, latency_ms: r.latency_ms,
            created_at: new Date().toISOString(),
          }]);
          // Add dev log entries for tool calls
          if (r.tool_calls) {
            setDevLog(prev => [
              ...prev,
              ...r.tool_calls!.map(tc => ({
                id: `replay-tc-${r.round}-${tc.name}`,
                timestamp: new Date().toISOString(),
                type: 'tool_call' as const,
                label: `🔧 ${tc.name.replace('nords_', '')}`,
                detail: JSON.stringify({ arguments: tc.arguments, result: tc.result }, null, 2),
              })),
            ]);
          }
          if (r.tokens_in) {
            setDevLog(prev => [...prev, {
              id: `replay-tokens-${r.round}`, timestamp: new Date().toISOString(),
              type: 'tokens' as const, label: `⚡ ${(r.tokens_in || 0).toLocaleString()}→${(r.tokens_out || 0).toLocaleString()} tokens · ${r.latency_ms || 0}ms`,
            }]);
          }
          if (r.tool_calls) setLastToolCalls(r.tool_calls);
        }
        setReplayIndex(roundIdx + 1);

        // Schedule next round
        const nextDelay = roundIdx + 1 < transcript.length
          ? Math.max(Math.min(transcript[roundIdx + 1].delay_ms || 1000, MAX_DELAY_MS) / speed, 200)
          : 0;
        if (roundIdx + 1 < transcript.length) {
          replayTimerRef.current = setTimeout(() => {
            driveReplayRound(roundIdx + 1, transcript, speed);
          }, nextDelay);
        }
      }, r.round === 0 ? 500 : typingDelay); // first round gets a short delay
    };

    // For user messages (not round 0 welcome), simulate typing
    if (r.user_msg && r.round !== 0) {
      simulateTyping(r.user_msg, speed, afterUserMessage);
    } else {
      afterUserMessage();
    }
  }

  // ── Test Runner state ──
  const [testScenarios, setTestScenarios] = useState<Array<{ id: string; name: string; user_profile: string }>>([]);
  const [showTestMenu, setShowTestMenu] = useState(false);
  const [testRunning, setTestRunning] = useState(false);
  const [testProgress, setTestProgress] = useState<{ round: number; maxRounds: number } | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  // sessionNps already declared above
  const _sessionNps = sessionNps; // reference to avoid lint warnings
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

  // Auto-scroll dev log
  useEffect(() => {
    if (devMode) devLogEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [devLog, devMode]);

  // Load project welcome message + test scenarios
  useEffect(() => {
    // Fetch project for welcome message
    api.get<{ mcp_welcome_message?: string | null }>(`/api/projects/${projectId}`)
      .then(p => {
        const wm = p.mcp_welcome_message || null;
        setWelcomeMessage(wm);
        // Seed the welcome as the first assistant bubble so the user can respond naturally
        if (wm) {
          setMessages(prev => {
            if (prev.length > 0) return prev; // don't overwrite existing messages
            return [{
              id: 'welcome-msg',
              role: 'assistant' as const,
              content: wm,
              created_at: new Date().toISOString(),
            }];
          });
        }
      })
      .catch(() => {});
    // Load test scenarios
    api.get<Array<{ id: string; name: string; user_profile: string }>>(`/api/projects/${projectId}/test-scenarios`)
      .then(setTestScenarios)
      .catch(() => setTestScenarios([]));
  }, [projectId]);



  // Toggle log entry expansion
  const toggleLogEntry = useCallback((id: string) => {
    setExpandedLogEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Append entries to the dev log
  const appendDevLog = useCallback((entries: DevLogEntry[]) => {
    setDevLog(prev => [...prev, ...entries]);
  }, []);

  // Dump horizon into dev log
  const dumpHorizon = useCallback(async () => {
    if (lastHorizon) {
      appendDevLog([{
        id: `horizon-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'horizon',
        label: '📡 Horizon State',
        detail: JSON.stringify(lastHorizon, null, 2),
      }]);
    } else {
      // Fetch live horizon from the API
      try {
        const h = await api.get<Record<string, unknown>>(`/api/projects/${projectId}/horizon`);
        setLastHorizon(h);
        appendDevLog([{
          id: `horizon-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'horizon',
          label: '📡 Horizon State (fetched)',
          detail: JSON.stringify(h, null, 2),
        }]);
      } catch {
        appendDevLog([{
          id: `horizon-err-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'system',
          label: '⚠ Could not fetch horizon — no active session',
        }]);
      }
    }
  }, [lastHorizon, projectId, appendDevLog]);

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

      // Update dev log with tool calls & metadata
      if (data.toolCalls?.length) {
        setLastToolCalls(data.toolCalls);
        const toolLogEntries: DevLogEntry[] = data.toolCalls.map((tc, i) => ({
          id: `tc-${Date.now()}-${i}`,
          timestamp: new Date().toISOString(),
          type: 'tool_call' as const,
          label: `🔧 ${tc.name.replace('nords_', '')}`,
          detail: JSON.stringify({ arguments: tc.arguments, result: tc.result }, null, 2),
        }));
        appendDevLog(toolLogEntries);
      }
      if (data.horizon) setLastHorizon(data.horizon);
      if (data.message) {
        appendDevLog([{
          id: `tokens-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'tokens',
          label: `⚡ ${(data.message.tokens_in || 0).toLocaleString()}→${(data.message.tokens_out || 0).toLocaleString()} tokens · ${data.message.latency_ms || 0}ms${data.message.model ? ` · ${data.message.model}` : ''}`,
        }]);
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
  }, [input, sending, projectId, sessionId, model, onDataChanged, appendDevLog]);

  // Reset session
  const handleReset = useCallback(async () => {
    if (sessionId) {
      try {
        await api.put(`/api/mcp-sessions/${sessionId}`, { status: 'abandoned' });
      } catch { /* ok */ }
    }
    setSessionId(null);
    setMessages([]);
    setLastHorizon(null);
    setLastToolCalls([]);
    setDevLog([]);
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
    const isExpanded = expandedLogEntries.has(key);
    const isRead = tc.name.includes('get_') || tc.name.includes('query_');
    const isMutate = tc.name.includes('update_') || tc.name.includes('create_') || tc.name.includes('delete_');
    const isNav = tc.name.includes('traverse') || tc.name.includes('switch');

    return (
      <div key={key} className="tool-call-inline">
        <button
          className={`tool-call-inline__header ${isRead ? 'is-read' : isMutate ? 'is-mutate' : isNav ? 'is-nav' : ''}`}
          onClick={() => toggleLogEntry(key)}
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

  function renderDevLog() {
    const iconForType = (type: DevLogEntry['type']) => {
      switch (type) {
        case 'tool_call': return <Wrench size={10} />;
        case 'tool_result': return <ChevronRight size={10} />;
        case 'horizon': return <Map size={10} />;
        case 'tokens': return <Zap size={10} />;
        case 'goal': return <Zap size={10} />;
        default: return <Eye size={10} />;
      }
    };

    const colorForType = (type: DevLogEntry['type']) => {
      switch (type) {
        case 'tool_call': return '#f59e0b';
        case 'horizon': return '#818cf8';
        case 'tokens': return '#6b7280';
        case 'goal': return '#10b981';
        default: return '#9ca3af';
      }
    };

    return (
      <div className="preview-chat__dev-panel">
        <div className="preview-chat__dev-log-header">
          <span className="preview-chat__dev-log-title">
            <Code2 size={11} />
            Session Log
            {devLog.length > 0 && <span className="preview-chat__dev-log-count">{devLog.length}</span>}
          </span>
          <button
            className="preview-chat__dev-horizon-btn"
            onClick={dumpHorizon}
            title="Dump current horizon state into log"
          >
            <Map size={11} />
            Horizon
          </button>
        </div>
        <div className="preview-chat__dev-log-stream">
          {devLog.length === 0 && (
            <div className="preview-chat__dev-empty">
              <Code2 size={20} strokeWidth={1} />
              <p>Session log will appear here as the AI processes messages.</p>
            </div>
          )}
          {devLog.map(entry => {
            const isExpanded = expandedLogEntries.has(entry.id);
            const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return (
              <div key={entry.id} className={`dev-log-entry dev-log-entry--${entry.type}`}>
                <button
                  className="dev-log-entry__row"
                  onClick={() => entry.detail && toggleLogEntry(entry.id)}
                  style={{ cursor: entry.detail ? 'pointer' : 'default' }}
                >
                  <span className="dev-log-entry__time">{time}</span>
                  <span className="dev-log-entry__icon" style={{ color: colorForType(entry.type) }}>
                    {iconForType(entry.type)}
                  </span>
                  <span className="dev-log-entry__label">{entry.label}</span>
                  {entry.detail && (
                    <span className="dev-log-entry__chevron">
                      {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                    </span>
                  )}
                </button>
                {isExpanded && entry.detail && (
                  <pre className="dev-log-entry__detail">{entry.detail}</pre>
                )}
              </div>
            );
          })}
          <div ref={devLogEndRef} />
        </div>
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
          {!(isReplayMode && replayDemoMode) && (
            <>
              <Eye size={16} className="preview-chat__header-icon" />
              <span className="preview-chat__title">{isReplayMode ? '🔁 Replay' : 'Agent Preview'}</span>
              {isReplayMode && replayLabel && (
                <code className="preview-chat__session-id" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>{replayLabel}</code>
              )}
              {!isReplayMode && sessionId && (
                <code className="preview-chat__session-id">{sessionId.slice(0, 8)}…</code>
              )}
            </>
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
          {!(isReplayMode && replayDemoMode) && (
            <>
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
            </>
          )}

          <button className="preview-chat__action-btn" onClick={handleReset} title="Reset Session">
            <RotateCcw size={14} />
          </button>
          {!(isReplayMode && replayDemoMode) && testScenarios.length > 0 && (
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
                    <div className="preview-chat__test-menu-title">Test Scenarios<span className="preview-chat__test-menu-count">{testScenarios.length} defined</span></div>
                    {testScenarios.map(s => (
                      <button
                        key={s.id}
                        className="preview-chat__test-menu-item"
                        onClick={() => {
                          setShowTestMenu(false);
                          startLiveTest(s.id);
                        }}
                      >
                        <span className="preview-chat__test-menu-name">{s.name}</span>
                        <Play size={12} className="preview-chat__test-menu-play" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {isReplayMode && (
            <button
              className={`preview-chat__action-btn${replayDemoMode ? ' is-active' : ''}`}
              onClick={() => setReplayDemoMode(!replayDemoMode)}
              title={replayDemoMode ? 'Show replay controls' : 'Demo mode — hide controls'}
            >
              {replayDemoMode ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
          <button className="preview-chat__action-btn" onClick={onClose} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>





      {/* Main Content: Messages + Dev Panel */}
      <div className="preview-chat__body">
        {/* Messages Area */}
        <div className="preview-chat__messages">
          {messages.length === 0 && (
            <div className="preview-chat__empty">
              <Bot size={32} strokeWidth={1} />
              <p>Start a conversation with your project's agent.</p>
              <p className="preview-chat__hint">Messages are logged and visible in Dev Mode.</p>
            </div>
          )}
          {messages.map(msg => (
            <ChatMessage
              key={msg.id}
              role={msg.role as 'user' | 'assistant' | 'system'}
              content={msg.content}
              toolCalls={msg.tool_calls}
              showToolCalls={devMode}
              model={msg.model}
              latencyMs={msg.latency_ms}
              tokensIn={msg.tokens_in}
              tokensOut={msg.tokens_out}
              showMeta={devMode}
            />
          ))}
          {(sending || replayTyping) && (
            <div className="chat-msg chat-msg--assistant">
              <div className="chat-msg__avatar"><Bot size={14} /></div>
              <div className="chat-msg__content">
                <span className="chat-msg__role">Assistant</span>
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

        {/* Dev Mode — Session Log Stream */}
        {devMode && renderDevLog()}
      </div>

      {/* Input */}
      {isReplayMode ? (
        <div className={`preview-chat__replay-footer${replayDemoMode ? ' preview-chat__replay-footer--demo' : ''}`}>
          {/* Replay controls bar — hidden in demo mode */}
          {!replayDemoMode && (
          <div className="preview-chat__replay-controls">
            <span className="preview-chat__replay-progress">
              🔁 {replayIndex}/{replayTranscript?.length || 0} rounds
            </span>
            <div className="preview-chat__replay-speed">
              {([1, 2, 5, 0] as const).map(s => (
                <button
                  key={s}
                  className={`preview-chat__speed-pill${replaySpeed === s ? ' active' : ''}`}
                  onClick={() => setReplaySpeed(s)}
                >
                  {s === 0 ? '⏩' : `${s}×`}
                </button>
              ))}
            </div>
            <button
              className="preview-chat__replay-btn preview-chat__replay-btn--exit"
              onClick={() => {
                if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
                if (replayTypeTimerRef.current) clearTimeout(replayTypeTimerRef.current);
                onClearReplay?.();
                setMessages([]);
                setDevLog([]);
                setDevMode(false);
                setReplayIndex(0);
                setReplayTyping(false);
                setReplayInputText('');
                setReplayInputDone(false);
              }}
            >
              <X size={14} /> Exit
            </button>
          </div>
          )}
          {/* Simulated input field — shows typewriter text */}
          <div className="preview-chat__input-area">
            <textarea
              className="preview-chat__input"
              value={replayInputText}
              readOnly
              placeholder=""
              rows={1}
              style={{ caretColor: replayInputText ? 'var(--text-primary, #e2e8f0)' : 'transparent' }}
            />
            <button
              className={`preview-chat__send-btn${replayInputDone ? ' is-flash' : ''}`}
              disabled={!replayInputDone}
            >
              <Send size={14} />
            </button>
          </div>
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

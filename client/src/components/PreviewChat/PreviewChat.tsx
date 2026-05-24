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
  Wrench, Eye, Map, FileText, AlertTriangle,
} from 'lucide-react';
import { api } from '../../api/client';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
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
}

type DevTab = 'tools' | 'prompt' | 'horizon';

export function PreviewChat({ projectId, isOpen, onClose }: PreviewChatProps) {
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

  // Dev panel state — persists across messages
  const [lastSystemPrompt, setLastSystemPrompt] = useState<string | null>(null);
  const [lastHorizon, setLastHorizon] = useState<Record<string, unknown> | null>(null);
  const [lastToolCalls, setLastToolCalls] = useState<ToolCall[]>([]);
  const [lastTokens, setLastTokens] = useState<{ in: number; out: number; latency: number } | null>(null);

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
        welcomeMessage?: string | null;
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

      // Build new messages: welcome (if new session) + user + assistant
      const newMessages: Message[] = [];
      if (data.welcomeMessage) {
        newMessages.push({
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: data.welcomeMessage,
          created_at: new Date().toISOString(),
        });
      }
      newMessages.push(
        { id: `user-${Date.now()}`, role: 'user', content: userMessage, created_at: new Date().toISOString() },
        data.message,
      );

      // Replace temp message + add welcome (if any) + user + assistant
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        ...newMessages,
      ]);

      // If session completed, show transition notification
      if (data.completion?.shouldTransition) {
        setMessages(prev => [...prev, {
          id: `system-${Date.now()}`,
          role: 'system',
          content: `✅ All required properties filled. Session transitioned to End Nord.`,
          created_at: new Date().toISOString(),
        }]);
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
  }, [input, sending, projectId, sessionId, model]);

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

  return (
    <FloatingPanel variant="panel" isOpen={isOpen} onClose={onClose} width="440px">
    <div className="preview-chat" data-testid="preview-chat">
      {/* Header */}
      <div className="preview-chat__header">
        <div className="preview-chat__header-left">
          <Bot size={16} />
          <span className="preview-chat__title">Agent Preview</span>
          {sessionId && (
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
          <button className="preview-chat__action-btn" onClick={onClose} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Sessions Dropdown */}
      {showSessions && sessions.length > 0 && (
        <div className="preview-chat__sessions-dropdown">
          {sessions.map(s => (
            <button
              key={s.id}
              className={`preview-chat__session-item ${s.id === sessionId ? 'is-active' : ''}`}
              onClick={() => loadSession(s.id)}
            >
              <span className="preview-chat__session-status" data-status={s.status} />
              <code>{s.id.slice(0, 8)}…</code>
              <span className="preview-chat__session-date">
                {new Date(s.started_at).toLocaleDateString()}
              </span>
              <span className="preview-chat__session-badge">{s.status}</span>
            </button>
          ))}
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
          <div ref={messagesEndRef} />
        </div>

        {/* Dev Mode Panel */}
        {devMode && renderDevPanel()}
      </div>

      {/* Input */}
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
    </div>
    </FloatingPanel>
  );
}

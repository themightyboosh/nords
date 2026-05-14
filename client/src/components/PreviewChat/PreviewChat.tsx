/**
 * PreviewChat.tsx — AI Chat Preview for MCP sessions.
 *
 * A chat window connected to the current project's MCP graph.
 * Features:
 *   - Send messages via Gemini proxy
 *   - Conversation history per session
 *   - Save / Reset / Load sessions
 *   - Dev Mode: expandable panel showing assembled context, tool calls, latency
 *   - Session metadata: current_nord, persona, traversal count
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Send, RotateCcw, Code2, X, ChevronDown,
  Activity, Zap, MessageSquare, Bot, User, Cpu,
} from 'lucide-react';
import { api } from '../../api/client';
import './PreviewChat.css';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: Array<{ name: string; arguments: Record<string, unknown>; result?: unknown }> | null;
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
  onClose: () => void;
}

export function PreviewChat({ projectId, onClose }: PreviewChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [selectedContext, setSelectedContext] = useState<Record<string, unknown> | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [model, setModel] = useState(() => localStorage.getItem('nords-preview-model') || 'gemini-2.0-flash');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const MODELS = [
    { id: 'gemini-2.0-flash', label: '2.0 Flash', desc: 'Fast & efficient' },
    { id: 'gemini-2.5-flash', label: '2.5 Flash', desc: 'Balanced' },
    { id: 'gemini-2.5-pro',   label: '2.5 Pro',   desc: 'Most capable' },
  ];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load previous sessions list
  useEffect(() => {
    api.get<SessionSummary[]>(`/api/projects/${projectId}/mcp-sessions`)
      .then(setSessions)
      .catch(() => setSessions([]));
  }, [projectId]);

  // Load messages for current session
  const loadSession = useCallback(async (sid: string) => {
    try {
      const data = await api.get<{ messages: Message[] }>(`/api/sessions/${sid}/messages`);
      setMessages(data.messages || []);
      setSessionId(sid);
      setShowSessions(false);
    } catch {
      console.error('Failed to load session');
    }
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
        completion: { shouldTransition: boolean; endNordId: string | null; incompleteCount: number };
      }>(`/api/projects/${projectId}/chat`, {
        message: userMessage,
        sessionId,
        model,
      });

      setSessionId(data.sessionId);

      // Replace temp message + add assistant reply
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        { id: `user-${Date.now()}`, role: 'user', content: userMessage, created_at: new Date().toISOString() },
        data.message,
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
    setSelectedContext(null);
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

  return (
    <div className="preview-chat" data-testid="preview-chat">
      {/* Header */}
      <div className="preview-chat__header">
        <div className="preview-chat__header-left">
          <Bot size={16} />
          <span className="preview-chat__title">Preview Chat</span>
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
              <MessageSquare size={32} strokeWidth={1} />
              <p>Start a conversation with your project's MCP agent.</p>
              <p className="preview-chat__hint">Messages are logged and visible in Dev Mode.</p>
            </div>
          )}
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`preview-chat__message preview-chat__message--${msg.role}`}
              onClick={() => {
                if (devMode && msg.context) setSelectedContext(msg.context);
              }}
            >
              <div className="preview-chat__message-avatar">
                {msg.role === 'user' ? <User size={14} /> : msg.role === 'assistant' ? <Bot size={14} /> : <Zap size={14} />}
              </div>
              <div className="preview-chat__message-content">
                <span className="preview-chat__message-role">{msg.role}</span>
                <p>{msg.content}</p>
                {devMode && msg.latency_ms != null && (
                  <span className="preview-chat__message-meta">
                    {msg.model} · {msg.latency_ms}ms
                    {msg.tokens_in != null && ` · ${msg.tokens_in}→${msg.tokens_out} tokens`}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Dev Mode Panel */}
        {devMode && (
          <div className="preview-chat__dev-panel">
            <div className="preview-chat__dev-header">
              <Code2 size={12} />
              <span>Context Inspector</span>
            </div>
            <div className="preview-chat__dev-content">
              {selectedContext ? (
                <pre>{JSON.stringify(selectedContext, null, 2)}</pre>
              ) : (
                <p className="preview-chat__dev-hint">
                  Click an assistant message to inspect its assembled context, system prompt, and tool calls.
                </p>
              )}
            </div>
          </div>
        )}
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
  );
}

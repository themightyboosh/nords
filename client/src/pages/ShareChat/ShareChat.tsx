/**
 * ShareChat — Public, mobile-first chat page for external users.
 *
 * URL: /share/:token
 * No auth required. Token gates access to the project's AI agent.
 * Sessions persist via cookie for 7 days.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Bot, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import './ShareChat.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

interface ShareInfo {
  project_name: string;
  project_icon: string | null;
  accent_color: string | null;
  welcome_message: string | null;
  model: string;
  label: string;
}

export function ShareChat() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load project info on mount
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/share/info?token=${token}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'This link is no longer valid');
          setLoading(false);
          return;
        }
        const data: ShareInfo = await res.json();
        setInfo(data);
        setLoading(false);
      } catch {
        setError('Unable to connect. Please try again.');
        setLoading(false);
      }
    })();
  }, [token]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!input.trim() || sending || !token) return;
    const userMessage = input.trim();
    setInput('');
    setSending(true);

    // Optimistic UI
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }]);

    try {
      const res = await fetch(`${API_BASE}/api/share/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Share-Token': token,
        },
        credentials: 'include', // Send cookies for session persistence
        body: JSON.stringify({
          message: userMessage,
          sessionId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Chat failed');
      }

      const data = await res.json();
      setSessionId(data.sessionId);

      // Replace temp with real messages
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        { id: `user-${Date.now()}`, role: 'user', content: userMessage, created_at: new Date().toISOString() },
        data.message,
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        { id: `error-${Date.now()}`, role: 'system', content: `⚠️ ${err.message}`, created_at: new Date().toISOString() },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, token, sessionId]);

  // Enter to send, Shift+Enter for newline
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // ── Loading State ──
  if (loading) {
    return (
      <div className="share-chat share-chat--loading">
        <Loader2 size={32} className="share-chat__spinner" />
        <span>Connecting…</span>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="share-chat share-chat--error">
        <div className="share-chat__error-card">
          <Bot size={48} />
          <h2>Link Unavailable</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const accentColor = info?.accent_color || '#8b5cf6';

  return (
    <div className="share-chat" style={{ '--accent': accentColor } as React.CSSProperties}>
      {/* Header */}
      <div className="share-chat__header">
        <div className="share-chat__header-left">
          {info?.project_icon ? (
            <span className="share-chat__project-icon">{info.project_icon}</span>
          ) : (
            <Bot size={20} />
          )}
          <span className="share-chat__project-name">{info?.project_name}</span>
        </div>
        <div className="share-chat__header-badge">
          <span className="share-chat__powered-by">Powered by Nords</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="share-chat__messages">
        {messages.length === 0 && info?.welcome_message && (
          <div className="share-chat__welcome">
            <div className="share-chat__welcome-icon">
              {info.project_icon || <Bot size={24} />}
            </div>
            <p>{info.welcome_message}</p>
            <span className="share-chat__welcome-hint">Type a message to begin</span>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`share-chat__message share-chat__message--${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="share-chat__avatar">
                {info?.project_icon || <Bot size={16} />}
              </div>
            )}
            <div className="share-chat__bubble">
              {msg.role === 'assistant' ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="share-chat__message share-chat__message--assistant">
            <div className="share-chat__avatar">
              {info?.project_icon || <Bot size={16} />}
            </div>
            <div className="share-chat__bubble share-chat__bubble--typing">
              <span className="share-chat__typing-dot" />
              <span className="share-chat__typing-dot" />
              <span className="share-chat__typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="share-chat__input-area">
        <div className="share-chat__input-wrapper">
          <textarea
            ref={inputRef}
            className="share-chat__input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            disabled={sending}
            autoFocus
          />
          <button
            className="share-chat__send-btn"
            onClick={handleSend}
            disabled={!input.trim() || sending}
          >
            {sending ? <Loader2 size={18} className="share-chat__spinner" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}

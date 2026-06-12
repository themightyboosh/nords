/**
 * ChatMessage.tsx — Shared message renderer for chat bubbles.
 *
 * Used by both PreviewChat (live chat + replay) and SessionExplorer
 * (session history). Handles:
 *   - Role-based styling (user / assistant / system)
 *   - Full markdown rendering via react-markdown
 *   - Optional tool call display (dev mode)
 *   - Optional metadata footer (model, latency, tokens)
 *   - Compact mode for session history
 */

import React, { useState } from 'react';
import Markdown from 'react-markdown';
import {
  Bot, User, Zap, Wrench, ChevronDown, ChevronRight,
} from 'lucide-react';
import { resolveIcon } from '../../utils/iconRegistry';
import './ChatMessage.css';

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp?: string;
  toolCalls?: ToolCall[] | null;
  showToolCalls?: boolean;
  model?: string | null;
  latencyMs?: number | null;
  tokensIn?: number | null;
  tokensOut?: number | null;
  showMeta?: boolean;
  compact?: boolean;
  /** Custom agent display name (defaults to 'Assistant') */
  agentName?: string;
  /** Custom agent icon name from Lucide registry (defaults to 'Bot') */
  agentIcon?: string;
}

/** Render markdown content — used for assistant messages */
function MarkdownContent({ text }: { text: string }) {
  if (!text) return null;
  return (
    <Markdown
      components={{
        // Keep paragraphs tight inside chat bubbles
        p: ({ children }) => <p style={{ margin: '0.4em 0' }}>{children}</p>,
        // Constrain lists
        ul: ({ children }) => <ul style={{ margin: '0.3em 0', paddingLeft: '1.4em' }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ margin: '0.3em 0', paddingLeft: '1.4em' }}>{children}</ol>,
        li: ({ children }) => <li style={{ marginBottom: '0.15em' }}>{children}</li>,
        // Inline code
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-');
          if (isBlock) {
            return <code className={className}>{children}</code>;
          }
          return (
            <code style={{
              background: 'rgba(255,255,255,0.08)',
              padding: '1px 5px',
              borderRadius: 4,
              fontSize: '0.9em',
              fontFamily: 'var(--nords-font-mono, monospace)',
            }}>{children}</code>
          );
        },
        // Headings — scale down for chat context
        h1: ({ children }) => <strong style={{ display: 'block', fontSize: '1.1em', margin: '0.5em 0 0.2em' }}>{children}</strong>,
        h2: ({ children }) => <strong style={{ display: 'block', fontSize: '1.05em', margin: '0.4em 0 0.2em' }}>{children}</strong>,
        h3: ({ children }) => <strong style={{ display: 'block', margin: '0.3em 0 0.1em' }}>{children}</strong>,
      }}
    >
      {text}
    </Markdown>
  );
}

function ToolCallInline({
  tc,
  index,
  msgKey,
}: {
  tc: ToolCall;
  index: number;
  msgKey: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isRead = tc.name.includes('get_') || tc.name.includes('query_');
  const isMutate = tc.name.includes('update_') || tc.name.includes('create_') || tc.name.includes('delete_');
  const isNav = tc.name.includes('traverse') || tc.name.includes('navigate') || tc.name.includes('switch');

  return (
    <div className="chat-msg__tool-call">
      <button
        className={`chat-msg__tool-header ${isRead ? 'is-read' : isMutate ? 'is-mutate' : isNav ? 'is-nav' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <Wrench size={10} />
        <span className="chat-msg__tool-name">{tc.name.replace('nords_', '')}</span>
        {Object.keys(tc.arguments).length > 0 && (
          <span className="chat-msg__tool-args-count">{Object.keys(tc.arguments).length} args</span>
        )}
      </button>
      {expanded && (
        <div className="chat-msg__tool-body">
          <div className="chat-msg__tool-section">
            <span className="chat-msg__tool-label">Arguments</span>
            <pre>{JSON.stringify(tc.arguments, null, 2)}</pre>
          </div>
          {tc.result !== undefined && (
            <div className="chat-msg__tool-section">
              <span className="chat-msg__tool-label">Result</span>
              <pre>{JSON.stringify(tc.result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatMessage({
  role,
  content,
  timestamp,
  toolCalls,
  showToolCalls = false,
  model,
  latencyMs,
  tokensIn,
  tokensOut,
  showMeta = false,
  compact = false,
  agentName,
  agentIcon,
}: ChatMessageProps) {
  // Resolve the assistant avatar icon
  const assistantAvatarIcon = (() => {
    if (agentIcon) {
      const Icon = resolveIcon(agentIcon);
      return <Icon size={compact ? 12 : 14} />;
    }
    return <Bot size={compact ? 12 : 14} />;
  })();

  const avatarIcon = role === 'user' ? <User size={compact ? 12 : 14} />
    : role === 'assistant' ? assistantAvatarIcon
    : <Zap size={compact ? 12 : 14} />;

  const roleLabel = role === 'user' ? 'User'
    : role === 'assistant' ? (agentName || 'Assistant')
    : 'System';

  return (
    <div className={`chat-msg chat-msg--${role}${compact ? ' chat-msg--compact' : ''}`}>
      <div className="chat-msg__avatar">
        {avatarIcon}
      </div>
      <div className="chat-msg__content">
        <div className="chat-msg__header">
          <span className="chat-msg__role">{roleLabel}</span>
          {timestamp && <span className="chat-msg__time">{timestamp}</span>}
        </div>
        <div className="chat-msg__text">
          {role === 'user'
            ? <p style={{ margin: 0 }}>{content}</p>
            : <MarkdownContent text={content} />
          }
        </div>

        {/* Tool calls (dev mode) */}
        {showToolCalls && role === 'assistant' && toolCalls && toolCalls.length > 0 && (
          <div className="chat-msg__tools">
            <span className="chat-msg__tools-label">
              <Wrench size={10} /> {toolCalls.length} tool call{toolCalls.length > 1 ? 's' : ''}
            </span>
            {toolCalls.map((tc, i) => (
              <ToolCallInline key={`tc-${i}`} tc={tc} index={i} msgKey={`msg-${i}`} />
            ))}
          </div>
        )}

        {/* Metadata footer (dev mode) */}
        {showMeta && latencyMs != null && (
          <span className="chat-msg__meta">
            {model} · {latencyMs}ms
            {tokensIn != null && ` · ${tokensIn.toLocaleString()}→${tokensOut?.toLocaleString()} tokens`}
          </span>
        )}
      </div>
    </div>
  );
}

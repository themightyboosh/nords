/**
 * ChatMessage.tsx — Shared message renderer for chat bubbles.
 *
 * Used by both PreviewChat (live chat + replay) and SessionExplorer
 * (session history). Handles:
 *   - Role-based styling (user / assistant / system)
 *   - Markdown-lite formatting: strips raw `***`, `**`, `*` markers
 *     and renders as styled <strong>/<em> spans
 *   - Optional tool call display (dev mode)
 *   - Optional metadata footer (model, latency, tokens)
 *   - Compact mode for session history
 */

import React, { useState } from 'react';
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

/**
 * Convert raw text with markdown bold/italic markers into React nodes.
 *
 * Handles (in order of priority):
 *   ***text*** → <strong><em>text</em></strong>
 *   **text**   → <strong>text</strong>
 *   *text*     → <em>text</em>
 *
 * Everything else is rendered as plain text.
 */
function formatContent(text: string): React.ReactNode[] {
  if (!text) return [text];

  const nodes: React.ReactNode[] = [];
  // Match ***bold-italic***, **bold**, or *italic* — non-greedy
  const pattern = /(\*{1,3})((?:(?!\1).)+?)\1/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Push plain text before this match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const stars = match[1];
    const inner = match[2];
    const key = `fmt-${match.index}`;

    if (stars === '***') {
      nodes.push(<strong key={key}><em>{inner}</em></strong>);
    } else if (stars === '**') {
      nodes.push(<strong key={key}>{inner}</strong>);
    } else {
      nodes.push(<em key={key}>{inner}</em>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
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
        <p className="chat-msg__text">{formatContent(content)}</p>

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

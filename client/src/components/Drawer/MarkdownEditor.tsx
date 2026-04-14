/**
 * MarkdownEditor — Standalone edit/preview toggle for the Description field.
 *
 * Features:
 *   - Toggle between edit (textarea) and preview (rendered HTML)
 *   - Debounced auto-save on typing (500ms)
 *   - Simple markdown rendering (no external deps)
 *   - Fullscreen-like textarea with resize handle
 */

import React, { useState } from 'react';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write a description…',
}) => {
  const [editing, setEditing] = useState(false);
  const debouncedChange = useDebouncedCallback(onChange, 500);

  return (
    <div className="nords-md-editor">
      <div className="nords-md-editor__header">
        <h3 className="nords-drawer-section-title">Description</h3>
        <button
          className="nords-pf__toggle"
          onClick={() => setEditing(!editing)}
        >
          {editing ? '👁 Preview' : '✏️ Edit'}
        </button>
      </div>

      {editing ? (
        <textarea
          className="nords-md-editor__textarea"
          defaultValue={value || ''}
          placeholder={placeholder}
          rows={8}
          autoFocus
          onChange={(e) => debouncedChange(e.target.value)}
        />
      ) : (
        <div
          className="nords-md-editor__preview"
          dangerouslySetInnerHTML={{
            __html: value ? renderMarkdown(value) : `<p class="nords-md-editor__empty">${placeholder}</p>`,
          }}
          onClick={() => setEditing(true)}
        />
      )}
    </div>
  );
};

// ── Markdown to HTML (no deps) ──

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (triple backtick)
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

  // Bold, italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr>');

  // Lists
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = `<p>${html}</p>`;
  html = html.replace(/\n/g, '<br>');

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');

  return html;
}

export default MarkdownEditor;

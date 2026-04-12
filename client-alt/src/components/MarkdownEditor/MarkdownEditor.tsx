/**
 * MarkdownEditor.tsx — Centralized Markdown Editor/Viewer
 *
 * A reusable markdown editor with live preview. Used throughout
 * the app wherever markdown content is supported:
 *   - Nord descriptions
 *   - Connection notes
 *   - Snapshot descriptions
 *   - Comment bodies
 *
 * Two modes:
 *   1. **View mode** (default): Renders markdown as styled HTML.
 *   2. **Edit mode**: Shows a textarea with toolbar + live preview.
 *
 * Built-in toolbar: Bold, Italic, Heading, Link, Code, List, Quote.
 * Does NOT require external markdown libraries — uses a simple
 * regex-based renderer for the mock. Production will use `marked` or `remark`.
 *
 * @see docs/frontend/04_ui_and_interactions.md §1.8 Markdown Support
 */

import React, { useState } from 'react';
import {
  Bold, Italic, Heading1, Link2, Code, List, Quote, Eye, Pencil,
} from 'lucide-react';
import './MarkdownEditor.css';

interface MarkdownEditorProps {
  /** Initial markdown content */
  value: string;
  /** Called when content changes (edit mode) */
  onChange?: (value: string) => void;
  /** If true, starts in view mode. If false, starts in edit mode. */
  readOnly?: boolean;
  /** Max height before scrolling (px). Default 300. Ignored when fillContainer is true. */
  maxHeight?: number;
  /** If true, the editor expands to fill available parent height via flex:1 */
  fillContainer?: boolean;
  /** Placeholder text for the editor textare */
  placeholder?: string;
}

/**
 * Simple mock markdown to HTML renderer.
 * In production, this would be replaced with `marked` or `remark`.
 */
function renderMarkdown(md: string): string {
  return md
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold & italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Unordered lists
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  maxHeight = 300,
  fillContainer = false,
  placeholder = 'Write markdown...',
}) => {
  const [mode, setMode] = useState<'edit' | 'view'>(readOnly ? 'view' : 'edit');
  const [content, setContent] = useState(value);

  /** Insert markdown syntax at cursor position */
  const insertSyntax = (prefix: string, suffix: string = '') => {
    const textarea = document.querySelector('.nords-md-editor__textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end) || 'text';
    const newContent = content.substring(0, start) + prefix + selected + suffix + content.substring(end);
    setContent(newContent);
    onChange?.(newContent);
  };

  const handleChange = (newValue: string) => {
    setContent(newValue);
    onChange?.(newValue);
  };

  // When fillContainer is true, use flex:1 to fill parent; otherwise use maxHeight
  const containerStyle: React.CSSProperties = fillContainer
    ? { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }
    : { maxHeight };

  return (
    <div className="nords-md-editor" style={containerStyle}>
      {/* Toolbar */}
      <div className="nords-md-editor__toolbar">
        <div className="nords-md-editor__tools">
          {mode === 'edit' && (
            <>
              <button className="nords-md-editor__tool" onClick={() => insertSyntax('**', '**')} title="Bold">
                <Bold size={13} strokeWidth={2} />
              </button>
              <button className="nords-md-editor__tool" onClick={() => insertSyntax('*', '*')} title="Italic">
                <Italic size={13} strokeWidth={2} />
              </button>
              <button className="nords-md-editor__tool" onClick={() => insertSyntax('## ')} title="Heading">
                <Heading1 size={13} strokeWidth={2} />
              </button>
              <button className="nords-md-editor__tool" onClick={() => insertSyntax('[', '](url)')} title="Link">
                <Link2 size={13} strokeWidth={2} />
              </button>
              <button className="nords-md-editor__tool" onClick={() => insertSyntax('`', '`')} title="Code">
                <Code size={13} strokeWidth={2} />
              </button>
              <button className="nords-md-editor__tool" onClick={() => insertSyntax('- ')} title="List">
                <List size={13} strokeWidth={2} />
              </button>
              <button className="nords-md-editor__tool" onClick={() => insertSyntax('> ')} title="Quote">
                <Quote size={13} strokeWidth={2} />
              </button>
            </>
          )}
        </div>

        {!readOnly && (
          <button
            className={`nords-md-editor__mode-toggle ${mode === 'view' ? 'is-preview' : ''}`}
            onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
            title={mode === 'edit' ? 'Preview' : 'Edit'}
          >
            {mode === 'edit' ? <Eye size={13} strokeWidth={2} /> : <Pencil size={13} strokeWidth={2} />}
            <span>{mode === 'edit' ? 'Preview' : 'Edit'}</span>
          </button>
        )}
      </div>

      {/* Content area */}
      {mode === 'edit' ? (
        <textarea
          className="nords-md-editor__textarea"
          value={content}
          onChange={e => handleChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
        />
      ) : (
        <div
          className="nords-md-editor__preview"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      )}
    </div>
  );
};

export default MarkdownEditor;

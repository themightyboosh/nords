/**
 * PropertyField — Switchboard component that renders the correct input
 * for each property type defined in the type schema.
 *
 * Supports all 8 property types:
 *   string    → text input
 *   number    → numeric input
 *   select    → dropdown from options[]
 *   date      → date picker
 *   markdown  → edit/preview toggle (inline)
 *   url       → link input with open button
 *   spectrum_1d → mini spectrum bar (read-only display)
 *   tags      → pill input with comma separation
 */

import React, { useState, useRef, useCallback } from 'react';
import './PropertyField.css';

export interface PropertyFieldProps {
  name: string;
  type: 'string' | 'number' | 'select' | 'date' | 'markdown' | 'url' | 'spectrum_1d' | 'tags';
  value: unknown;
  options?: string[];
  color?: string;
  onChange: (value: unknown) => void;
}

export const PropertyField: React.FC<PropertyFieldProps> = ({
  name,
  type,
  value,
  options = [],
  color,
  onChange,
}) => {
  switch (type) {
    case 'string':
      return <StringField name={name} value={value as string} onChange={onChange} />;
    case 'number':
      return <NumberField name={name} value={value as number} onChange={onChange} />;
    case 'select':
      return <SelectField name={name} value={value as string} options={options} color={color} onChange={onChange} />;
    case 'date':
      return <DateField name={name} value={value as string} onChange={onChange} />;
    case 'markdown':
      return <MarkdownField name={name} value={value as string} onChange={onChange} />;
    case 'url':
      return <UrlField name={name} value={value as string} onChange={onChange} />;
    case 'spectrum_1d':
      return <SpectrumField name={name} value={value as number} color={color} />;
    case 'tags':
      return <TagsField name={name} value={value as string[]} onChange={onChange} />;
    default:
      return <StringField name={name} value={String(value ?? '')} onChange={onChange} />;
  }
};

// ── Individual Field Components ──

function StringField({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  return (
    <div className="nords-pf">
      <label className="nords-pf__label">{name}</label>
      <input
        className="nords-pf__input"
        type="text"
        defaultValue={value || ''}
        placeholder={`Enter ${name}…`}
        onChange={(e) => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => onChange(e.target.value), 400);
        }}
      />
    </div>
  );
}

function NumberField({ name, value, onChange }: { name: string; value: number; onChange: (v: number) => void }) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  return (
    <div className="nords-pf">
      <label className="nords-pf__label">{name}</label>
      <input
        className="nords-pf__input nords-pf__input--number"
        type="number"
        defaultValue={value ?? ''}
        placeholder="0"
        onChange={(e) => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => onChange(parseFloat(e.target.value) || 0), 400);
        }}
      />
    </div>
  );
}

function SelectField({ name, value, options, color, onChange }: {
  name: string; value: string; options: string[]; color?: string; onChange: (v: string) => void;
}) {
  return (
    <div className="nords-pf">
      <label className="nords-pf__label">{name}</label>
      <select
        className="nords-pf__select"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={color ? { borderColor: color } : undefined}
      >
        <option value="">— Select —</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function DateField({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="nords-pf">
      <label className="nords-pf__label">{name}</label>
      <input
        className="nords-pf__input nords-pf__input--date"
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function MarkdownField({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  return (
    <div className="nords-pf nords-pf--markdown">
      <div className="nords-pf__header">
        <label className="nords-pf__label">{name}</label>
        <button
          className="nords-pf__toggle"
          onClick={() => setEditing(!editing)}
        >
          {editing ? '👁 Preview' : '✏️ Edit'}
        </button>
      </div>
      {editing ? (
        <textarea
          className="nords-pf__textarea"
          defaultValue={value || ''}
          placeholder={`Write ${name} in markdown…`}
          rows={6}
          onChange={(e) => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => onChange(e.target.value), 500);
          }}
        />
      ) : (
        <div
          className="nords-pf__preview"
          dangerouslySetInnerHTML={{ __html: simpleMarkdown(value || `*No ${name} yet*`) }}
        />
      )}
    </div>
  );
}

function UrlField({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  return (
    <div className="nords-pf nords-pf--url">
      <label className="nords-pf__label">{name}</label>
      <div className="nords-pf__url-row">
        <input
          className="nords-pf__input"
          type="url"
          defaultValue={value || ''}
          placeholder="https://…"
          onChange={(e) => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => onChange(e.target.value), 400);
          }}
        />
        {value && (
          <a
            className="nords-pf__url-open"
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            title="Open link"
          >
            ↗
          </a>
        )}
      </div>
    </div>
  );
}

function SpectrumField({ name, value, color }: { name: string; value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value || 0)) * 100;
  return (
    <div className="nords-pf">
      <label className="nords-pf__label">{name}</label>
      <div className="nords-pf__spectrum">
        <div
          className="nords-pf__spectrum-fill"
          style={{
            width: `${pct}%`,
            backgroundColor: color || 'var(--nords-color-accent)',
          }}
        />
        <span className="nords-pf__spectrum-value">{(value || 0).toFixed(2)}</span>
      </div>
    </div>
  );
}

function TagsField({ name, value, onChange }: { name: string; value: string[]; onChange: (v: string[]) => void }) {
  const tags = Array.isArray(value) ? value : [];
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = useCallback((tag: string) => {
    const t = tag.trim();
    if (t && !tags.includes(t)) {
      onChange([...tags, t]);
    }
  }, [tags, onChange]);

  const removeTag = useCallback((idx: number) => {
    onChange(tags.filter((_, i) => i !== idx));
  }, [tags, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = inputRef.current;
      if (input && input.value.trim()) {
        addTag(input.value);
        input.value = '';
      }
    }
    if (e.key === 'Backspace' && !inputRef.current?.value && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  }, [addTag, removeTag, tags]);

  return (
    <div className="nords-pf nords-pf--tags">
      <label className="nords-pf__label">{name}</label>
      <div className="nords-pf__tags-container">
        {tags.map((tag, i) => (
          <span key={`${tag}-${i}`} className="nords-pf__tag">
            {tag}
            <button className="nords-pf__tag-remove" onClick={() => removeTag(i)}>×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="nords-pf__tag-input"
          placeholder={tags.length === 0 ? `Add ${name}…` : ''}
          onKeyDown={handleKeyDown}
          onBlur={(e) => {
            if (e.target.value.trim()) {
              addTag(e.target.value);
              e.target.value = '';
            }
          }}
        />
      </div>
    </div>
  );
}

// ── Simple Markdown Renderer (no external deps) ──

function simpleMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

  // Bold, italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Code
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Lists
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, '</p><p>');
  html = `<p>${html}</p>`;

  // Single newlines → <br>
  html = html.replace(/\n/g, '<br>');

  return html;
}

export default PropertyField;

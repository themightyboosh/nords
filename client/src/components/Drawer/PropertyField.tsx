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
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import './PropertyField.css';

export interface PropertyFieldProps {
  name: string;
  type: 'string' | 'number' | 'select' | 'date' | 'markdown' | 'url' | 'spectrum_1d' | 'tags';
  value: unknown;
  options?: string[];
  color?: string;
  required?: boolean;
  onChange: (value: unknown) => void;
}

export const PropertyField: React.FC<PropertyFieldProps> = ({
  name,
  type,
  value,
  options = [],
  color,
  required,
  onChange,
}) => {
  const label = required ? `${name} *` : name;
  // Determine if a required field is missing a value
  const isEmpty = (v: unknown): boolean => {
    if (v == null) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    if (Array.isArray(v) && v.length === 0) return true;
    if (typeof v === 'number' && isNaN(v)) return true;
    return false;
  };
  const missing = !!required && isEmpty(value);

  switch (type) {
    case 'string':
      return <StringField name={label} value={value as string} onChange={onChange} missing={missing} />;
    case 'number':
      return <NumberField name={label} value={value as number} onChange={onChange} missing={missing} />;
    case 'select':
      return <SelectField name={label} value={value as string} options={options} color={color} onChange={onChange} missing={missing} />;
    case 'date':
      return <DateField name={label} value={value as string} onChange={onChange} missing={missing} />;
    case 'markdown':
      return <MarkdownField name={label} value={value as string} onChange={onChange} missing={missing} />;
    case 'url':
      return <UrlField name={label} value={value as string} onChange={onChange} missing={missing} />;
    case 'spectrum_1d':
      return <SpectrumField name={label} value={value as number} color={color} />;
    case 'tags':
      return <TagsField name={label} value={value as string[]} onChange={onChange} missing={missing} />;
    default:
      return <StringField name={label} value={String(value ?? '')} onChange={onChange} missing={missing} />;
  }
};

// ── Individual Field Components ──

function StringField({ name, value, onChange, missing }: { name: string; value: string; onChange: (v: string) => void; missing?: boolean }) {
  const debouncedChange = useDebouncedCallback(onChange, 400);
  return (
    <div className={`nords-pf${missing ? ' nords-pf--missing' : ''}`}>
      <label className="nords-pf__label">{name}</label>
      <input
        className="nords-pf__input"
        type="text"
        defaultValue={value || ''}
        placeholder={`Enter ${name}…`}
        onChange={(e) => debouncedChange(e.target.value)}
      />
    </div>
  );
}

function NumberField({ name, value, onChange, missing }: { name: string; value: number; onChange: (v: number) => void; missing?: boolean }) {
  const debouncedChange = useDebouncedCallback((v: string) => onChange(parseFloat(v) || 0), 400);
  return (
    <div className={`nords-pf${missing ? ' nords-pf--missing' : ''}`}>
      <label className="nords-pf__label">{name}</label>
      <input
        className="nords-pf__input nords-pf__input--number"
        type="number"
        defaultValue={value ?? ''}
        placeholder="0"
        onChange={(e) => debouncedChange(e.target.value)}
      />
    </div>
  );
}

function SelectField({ name, value, options, color, onChange, missing }: {
  name: string; value: string; options: string[]; color?: string; onChange: (v: string) => void; missing?: boolean;
}) {
  return (
    <div className={`nords-pf${missing ? ' nords-pf--missing' : ''}`}>
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

function DateField({ name, value, onChange, missing }: { name: string; value: string; onChange: (v: string) => void; missing?: boolean }) {
  return (
    <div className={`nords-pf${missing ? ' nords-pf--missing' : ''}`}>
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

function MarkdownField({ name, value, onChange, missing }: { name: string; value: string; onChange: (v: string) => void; missing?: boolean }) {
  const [editing, setEditing] = useState(!value);
  const debouncedChange = useDebouncedCallback(onChange, 500);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    debouncedChange(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 400)}px`;
  }, [debouncedChange]);

  return (
    <div className={`nords-pf nords-pf--markdown${missing ? ' nords-pf--missing' : ''}`}>
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
          ref={textareaRef}
          className="nords-pf__textarea"
          defaultValue={value || ''}
          placeholder={`Write markdown…`}
          rows={8}
          onChange={handleInput}
        />
      ) : (
        <div
          className="nords-pf__preview"
          dangerouslySetInnerHTML={{ __html: simpleMarkdown(value || `*No content yet — click Edit*`) }}
        />
      )}
    </div>
  );
}

function UrlField({ name, value, onChange, missing }: { name: string; value: string; onChange: (v: string) => void; missing?: boolean }) {
  const debouncedChange = useDebouncedCallback(onChange, 400);
  return (
    <div className={`nords-pf nords-pf--url${missing ? ' nords-pf--missing' : ''}`}>
      <label className="nords-pf__label">{name}</label>
      <div className="nords-pf__url-row">
        <input
          className="nords-pf__input"
          type="url"
          defaultValue={value || ''}
          placeholder="https://…"
          onChange={(e) => debouncedChange(e.target.value)}
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

function TagsField({ name, value, onChange, missing }: { name: string; value: string[]; onChange: (v: string[]) => void; missing?: boolean }) {
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
    <div className={`nords-pf nords-pf--tags${missing ? ' nords-pf--missing' : ''}`}>
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

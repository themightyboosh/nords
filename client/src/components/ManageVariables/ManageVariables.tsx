/**
 * ManageVariables — CRUD panel for project-level variables.
 *
 * Mirrors ManageGoals/ManagePersonas pattern:
 *   Sidebar: name + type badge list
 *   Editor:  name, type, required, tags, description, hint, options
 *
 * Variables are the global data points collected during MCP sessions.
 * They replace the old per-nord MCP property approach.
 *
 * ┌────────────────────────────────────────────────────────────┐
 * │ Variables                                            [X]   │
 * │ Global data points collected by the AI during sessions.    │
 * ├────────────┬───────────────────────────────────────────────┤
 * │ ● email    │  Name  [email]                           [🗑] │
 * │   phone    │  Type  [select: string]                       │
 * │            │  ☑ Required                                   │
 * │ + New      │  Tags  [contact] [+]                          │
 * │            │  Description  [textarea]                      │
 * │            │  Hint  [input]                                │
 * └────────────┴───────────────────────────────────────────────┘
 */

import React, { useState, useCallback } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useVariables, type ProjectVariable, type VariableType } from '../../hooks/useVariables';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import './ManageVariables.css';

// ── Constants ──

const VARIABLE_TYPES: { value: VariableType; label: string }[] = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select (single)' },
  { value: 'multi_select', label: 'Multi-Select' },
  { value: 'date_range', label: 'Date Range' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'phone', label: 'Phone' },
];

const NEEDS_OPTIONS: VariableType[] = ['select', 'multi_select'];

// ── Types ──

interface ManageVariablesProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

// ── Main Component ──

export function ManageVariables({ projectId, open, onClose }: ManageVariablesProps) {
  const {
    variables, createVariable, updateVariable, deleteVariable,
  } = useVariables(projectId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = variables.find(v => v.id === selectedId) || null;

  // Auto-select first
  React.useEffect(() => {
    if (!selectedId && variables.length > 0) setSelectedId(variables[0].id);
  }, [variables, selectedId]);

  const handleCreate = async () => {
    const v = await createVariable({ name: 'New Collection', type: 'string' });
    if (v) setSelectedId(v.id);
  };

  const handleDelete = async (id: string) => {
    await deleteVariable(id);
    if (selectedId === id) setSelectedId(variables.find(v => v.id !== id)?.id || null);
  };

  if (!open) return null;

  return (
    <FloatingPanel variant="modal" isOpen={open} onClose={onClose} width="min(820px, 90vw)">
      <div className="manage-variables">
        {/* Header */}
        <div className="manage-variables__header">
          <div>
            <h2 className="manage-variables__title">Collections</h2>
            <p className="manage-variables__subtitle">Global data points collected by the AI during sessions.</p>
          </div>
          <button className="manage-variables__close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="manage-variables__body">
          {/* ── Sidebar ── */}
          <div className="manage-variables__sidebar">
            <div className="manage-variables__list">
              {variables.map(v => (
                <button
                  key={v.id}
                  className={`manage-variables__list-item ${v.id === selectedId ? 'is-active' : ''}`}
                  onClick={() => setSelectedId(v.id)}
                >
                  {v.required && <span className="manage-variables__list-required" />}
                  <span className="manage-variables__list-name">{v.name || 'Untitled'}</span>
                  <span className="manage-variables__list-type-badge">{v.type}</span>
                </button>
              ))}
            </div>
            <button className="manage-variables__add-btn" onClick={handleCreate}>
              <Plus size={14} /> New Collection
            </button>
          </div>

          {/* ── Editor ── */}
          <div className="manage-variables__editor">
            {!selected ? (
              <div className="manage-variables__empty">
                {variables.length === 0
                  ? 'No collections yet — create one to start collecting data.'
                  : 'Select a collection to edit its details.'}
              </div>
            ) : (
              <VariableEditor
                key={selected.id}
                variable={selected}
                onUpdate={updateVariable}
                onDelete={() => handleDelete(selected.id)}
              />
            )}
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
}

// ── Variable Editor ──

interface VariableEditorProps {
  variable: ProjectVariable;
  onUpdate: (id: string, fields: Record<string, unknown>) => Promise<unknown>;
  onDelete: () => void;
}

function VariableEditor({ variable, onUpdate, onDelete }: VariableEditorProps) {
  const [name, setName] = useState(variable.name);
  const [description, setDescription] = useState(variable.description || '');
  const [hint, setHint] = useState(variable.hint || '');
  const [tagInput, setTagInput] = useState('');

  const handleBlur = useCallback((field: string, value: unknown) => {
    onUpdate(variable.id, { [field]: value });
  }, [variable.id, onUpdate]);

  const showOptions = NEEDS_OPTIONS.includes(variable.type);

  return (
    <>
      {/* ── Header: Name + Delete ── */}
      <div className="manage-variables__editor-header">
        <div style={{ flex: 1 }}>
          <input
            className="manage-variables__editor-name"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => handleBlur('name', name)}
            placeholder="Collection name"
          />
        </div>
        <button className="manage-variables__delete-btn" onClick={onDelete} title="Delete collection">
          <Trash2 size={16} />
        </button>
      </div>

      {/* ── Type + Required ── */}
      <div className="manage-variables__inline-row">
        <div className="manage-variables__inline-field manage-variables__inline-field--flex">
          <label className="manage-variables__section-title">Type</label>
          <select
            className="manage-variables__select"
            value={variable.type}
            onChange={e => onUpdate(variable.id, { type: e.target.value })}
          >
            {VARIABLE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="manage-variables__inline-field">
          <label className="manage-variables__section-title">Required</label>
          <label className="manage-variables__checkbox-label">
            <input
              type="checkbox"
              checked={variable.required}
              onChange={e => onUpdate(variable.id, { required: e.target.checked })}
            />
            Must be collected
          </label>
        </div>
      </div>

      {/* ── Options (for select / multi_select) ── */}
      {showOptions && (
        <div className="manage-variables__section">
          <label className="manage-variables__section-title">Options</label>
          <OptionsEditor
            options={(variable.options as string[]) || []}
            onChange={(opts) => onUpdate(variable.id, { options: opts })}
          />
        </div>
      )}

      {/* ── Tags ── */}
      <div className="manage-variables__section">
        <label className="manage-variables__section-title">Tags</label>
        <div className="manage-variables__tags">
          {(variable.tags || []).map((tag, idx) => (
            <span key={idx} className="manage-variables__tag">
              {tag}
              <button
                className="manage-variables__tag-remove"
                onClick={() => {
                  const next = variable.tags.filter((_, i) => i !== idx);
                  onUpdate(variable.id, { tags: next });
                }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            className="manage-variables__tag-input"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && tagInput.trim()) {
                const next = [...(variable.tags || []), tagInput.trim()];
                onUpdate(variable.id, { tags: next });
                setTagInput('');
              }
            }}
            placeholder="+ tag"
          />
        </div>
      </div>

      {/* ── Description ── */}
      <div className="manage-variables__section">
        <label className="manage-variables__section-title">Description</label>
        <textarea
          className="manage-variables__textarea"
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={() => handleBlur('description', description)}
          placeholder="What data does this collection capture?"
          rows={3}
        />
      </div>

      {/* ── Hint ── */}
      <div className="manage-variables__section">
        <label className="manage-variables__section-title">Hint</label>
        <input
          className="manage-variables__input"
          value={hint}
          onChange={e => setHint(e.target.value)}
          onBlur={() => handleBlur('hint', hint)}
          placeholder="AI guidance for how to ask about this variable"
        />
      </div>
    </>
  );
}

// ── Options Editor (for select / multi_select) ──

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (opts: string[]) => void;
}) {
  const handleOptionChange = (idx: number, value: string) => {
    const next = [...options];
    next[idx] = value;
    onChange(next);
  };

  const handleRemoveOption = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx));
  };

  const handleAddOption = () => {
    onChange([...options, '']);
  };

  return (
    <div className="manage-variables__options-list">
      {options.map((opt, idx) => (
        <div key={idx} className="manage-variables__option-row">
          <input
            className="manage-variables__option-input"
            value={opt}
            onChange={e => handleOptionChange(idx, e.target.value)}
            placeholder={`Option ${idx + 1}`}
          />
          <button
            className="manage-variables__option-remove"
            onClick={() => handleRemoveOption(idx)}
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <button className="manage-variables__add-option-btn" onClick={handleAddOption}>
        <Plus size={12} /> Add Option
      </button>
    </div>
  );
}

export default ManageVariables;

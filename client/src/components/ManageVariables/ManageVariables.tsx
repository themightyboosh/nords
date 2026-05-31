/**
 * ManageVariables — CRUD panel for project-level variables (Collections).
 *
 * Harmonized with ManageTypes: uses an inline table layout with expandable
 * rows instead of a sidebar+editor split. Each row shows:
 *   Name | Type | Required toggle | Expand/Delete
 * Expanding a row reveals: Description, Hint, Tags, Options.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Collections                                            [X]  │
 * │ Global data points collected by the AI during sessions.     │
 * ├─────────────────────────────────────────────────────────────┤
 * │  Name          Type         Req   Actions                   │
 * │  ▸ email       Short Text   ☑     ↑ ↓ 🗑                   │
 * │  ▾ phone       Phone        ☐     ↑ ↓ 🗑                   │
 * │    └ Description: [textarea]                                │
 * │    └ Hint: [input]                                          │
 * │    └ Tags: [tag] [tag] [+]                                  │
 * │  [+ New Collection]                                         │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback, useRef } from 'react';
import { X, Plus, Trash2, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useVariables, type ProjectVariable } from '../../hooks/useVariables';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import {
  UI_PROPERTY_TYPES, PROPERTY_TYPE_META,
  needsOptions as checkNeedsOptions,
  normalizePropertyType, type PropertyType,
} from '@nords/shared/propertyTypes';
import './ManageVariables.css';

// ── Constants ──

const VARIABLE_TYPES = UI_PROPERTY_TYPES.map(t => ({ value: t, label: PROPERTY_TYPE_META[t].label }));

// ── Types ──

interface ManageVariablesProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

// ── Main Component ──

export function ManageVariables({ projectId, open, onClose }: ManageVariablesProps) {
  const {
    variables, createVariable, updateVariable, deleteVariable, reorderVariables,
  } = useVariables(projectId);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const nameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCreate = async () => {
    const v = await createVariable({ name: 'New Collection', type: 'short_text' });
    if (v) setExpandedId(v.id);
  };

  const handleDelete = async (id: string) => {
    await deleteVariable(id);
    if (expandedId === id) setExpandedId(null);
  };

  const handleReorder = useCallback((fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= variables.length) return;
    const ids = variables.map(v => v.id);
    const [moved] = ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, moved);
    reorderVariables(ids);
  }, [variables, reorderVariables]);

  // Debounced name update (matches ManageTypes pattern)
  const handleNameChange = (id: string, value: string) => {
    setDraftNames(prev => ({ ...prev, [id]: value }));
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
    nameTimerRef.current = setTimeout(() => {
      updateVariable(id, { name: value });
    }, 400);
  };

  const getName = (v: ProjectVariable) =>
    draftNames[v.id] !== undefined ? draftNames[v.id] : v.name;

  if (!open) return null;

  return (
    <FloatingPanel variant="modal" isOpen={open} onClose={onClose} width="min(720px, 90vw)">
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

        {/* Table */}
        <div className="manage-variables__table-wrap">
          {variables.length === 0 ? (
            <div className="manage-variables__empty">
              No collections yet — create one to start collecting data.
            </div>
          ) : (
            <table className="manage-variables__table">
              <thead>
                <tr>
                  <th className="manage-variables__th" style={{ width: 24 }}></th>
                  <th className="manage-variables__th">Name</th>
                  <th className="manage-variables__th" style={{ width: 140 }}>Type</th>
                  <th className="manage-variables__th" style={{ width: 50 }}>Req</th>
                  <th className="manage-variables__th manage-variables__th--actions" style={{ width: 90 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {variables.map((v, idx) => {
                  const isExpanded = expandedId === v.id;
                  return (
                    <React.Fragment key={v.id}>
                      {/* Main row */}
                      <tr
                        className={`manage-variables__row ${isExpanded ? 'is-expanded' : ''}`}
                        onClick={() => setExpandedId(isExpanded ? null : v.id)}
                      >
                        <td className="manage-variables__td manage-variables__td--chevron">
                          {isExpanded
                            ? <ChevronDown size={14} />
                            : <ChevronRight size={14} />}
                        </td>
                        <td className="manage-variables__td manage-variables__td--name">
                          <input
                            className="manage-variables__inline-name"
                            value={getName(v)}
                            onChange={e => handleNameChange(v.id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            placeholder="Collection name"
                          />
                        </td>
                        <td className="manage-variables__td" onClick={e => e.stopPropagation()}>
                          <select
                            className="manage-variables__inline-select"
                            value={normalizePropertyType(v.type)}
                            onChange={e => updateVariable(v.id, { type: e.target.value })}
                          >
                            {VARIABLE_TYPES.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="manage-variables__td manage-variables__td--center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="manage-variables__inline-checkbox"
                            checked={v.required}
                            onChange={e => updateVariable(v.id, { required: e.target.checked })}
                          />
                        </td>
                        <td className="manage-variables__td manage-variables__td--actions" onClick={e => e.stopPropagation()}>
                          <button
                            className="manage-variables__icon-btn"
                            disabled={idx === 0}
                            onClick={() => handleReorder(idx, idx - 1)}
                            title="Move up"
                          >
                            <ChevronUp size={13} />
                          </button>
                          <button
                            className="manage-variables__icon-btn"
                            disabled={idx === variables.length - 1}
                            onClick={() => handleReorder(idx, idx + 1)}
                            title="Move down"
                          >
                            <ChevronDown size={13} />
                          </button>
                          <button
                            className="manage-variables__icon-btn manage-variables__icon-btn--danger"
                            onClick={() => handleDelete(v.id)}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr className="manage-variables__detail-row">
                          <td colSpan={5}>
                            <VariableDetail
                              variable={v}
                              onUpdate={updateVariable}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}

          <button className="manage-variables__add-btn" onClick={handleCreate}>
            <Plus size={14} /> New Collection
          </button>
        </div>
      </div>
    </FloatingPanel>
  );
}

// ── Expanded Detail Panel ──

function VariableDetail({
  variable,
  onUpdate,
}: {
  variable: ProjectVariable;
  onUpdate: (id: string, fields: Record<string, unknown>) => Promise<unknown>;
}) {
  const [description, setDescription] = useState(variable.description || '');
  const [hint, setHint] = useState(variable.hint || '');
  const [tagInput, setTagInput] = useState('');

  const handleBlur = useCallback((field: string, value: unknown) => {
    onUpdate(variable.id, { [field]: value });
  }, [variable.id, onUpdate]);

  const showOptions = checkNeedsOptions(normalizePropertyType(variable.type));

  return (
    <div className="manage-variables__detail">
      {/* Options (for select / multi_select) */}
      {showOptions && (
        <div className="manage-variables__detail-field">
          <label className="manage-variables__detail-label">Options</label>
          <OptionsEditor
            options={(variable.options as string[]) || []}
            onChange={(opts) => onUpdate(variable.id, { options: opts })}
          />
        </div>
      )}

      {/* Description */}
      <div className="manage-variables__detail-field">
        <label className="manage-variables__detail-label">Description</label>
        <textarea
          className="manage-variables__textarea"
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={() => handleBlur('description', description)}
          placeholder="What data does this collection capture?"
          rows={2}
        />
      </div>

      {/* Hint */}
      <div className="manage-variables__detail-field">
        <label className="manage-variables__detail-label">Hint</label>
        <input
          className="manage-variables__input"
          value={hint}
          onChange={e => setHint(e.target.value)}
          onBlur={() => handleBlur('hint', hint)}
          placeholder="AI guidance for how to ask about this variable"
        />
      </div>

      {/* Tags */}
      <div className="manage-variables__detail-field">
        <label className="manage-variables__detail-label">Tags</label>
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
    </div>
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

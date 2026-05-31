/**
 * ManageGoals — Simple CRUD panel for goals.
 *
 * Matches ManagePersonas simplicity:
 *   Sidebar: icon + name list
 *   Editor:  icon picker, name, color, description, achieved prompt
 *
 * NO flow config here (no prerequisites, no terminates, no exclusion groups,
 * no property bindings). All of that lives in the Goal DetailDrawer
 * when the user clicks a goal circle on the Goal Canvas.
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │ Goals                                               [X]  │
 * │ Define interview objectives.                             │
 * ├────────────┬─────────────────────────────────────────────┤
 * │ [⊙] Goal 1 │  [Icon] Goal Name  [🗑]                     │
 * │ [♡] Goal 2 │  [HueSlider]                                │
 * │            │  Description  [textarea]                    │
 * │ + New      │  Achieved Prompt  [textarea]                │
 * └────────────┴─────────────────────────────────────────────┘
 */

import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useGoals, type Goal } from '../../hooks/useGoals';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { HueSlider } from '../shared/HueSlider';
import { IconPicker } from '../shared/IconPicker';
import { resolveIcon } from '../../utils/iconRegistry';
import { useUIStrings } from '../../hooks/useUIStrings';
import './ManageGoals.css';

// ── Types ──

interface ManageGoalsProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

// ── Main Component ──

export function ManageGoals({ projectId, open, onClose }: ManageGoalsProps) {
  const {
    goals, createGoal, updateGoal, deleteGoal,
  } = useGoals(projectId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { strings: UI_STRINGS } = useUIStrings();
  const explicitGoals = goals.filter(g => !g.is_implicit);
  const selected = explicitGoals.find(g => g.id === selectedId) || null;

  // Auto-select first
  React.useEffect(() => {
    if (!selectedId && explicitGoals.length > 0) setSelectedId(explicitGoals[0].id);
  }, [explicitGoals, selectedId]);

  const handleCreate = async () => {
    const g = await createGoal({ name: 'New Goal', icon: 'Target' });
    if (g) setSelectedId(g.id);
  };

  const handleDelete = async (id: string) => {
    await deleteGoal(id);
    if (selectedId === id) setSelectedId(explicitGoals.find(g => g.id !== id)?.id || null);
  };

  if (!open) return null;

  return (
    <FloatingPanel variant="modal" isOpen={open} onClose={onClose} width="min(780px, 90vw)">
      <div className="manage-goals">
        {/* Header */}
        <div className="manage-goals__header">
          <div>
            <h2 className="manage-goals__title">Goals</h2>
            <p className="manage-goals__subtitle">{UI_STRINGS.goals.subtitle}</p>
          </div>
          <button className="manage-goals__close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="manage-goals__body">
          {/* ── Sidebar ── */}
          <div className="manage-goals__sidebar">
            <div className="manage-goals__list">
              {explicitGoals.map(g => {
                const GoalIcon = resolveIcon(g.icon);
                return (
                  <button
                    key={g.id}
                    className={`manage-goals__list-item ${g.id === selectedId ? 'is-active' : ''}`}
                    onClick={() => setSelectedId(g.id)}
                    style={g.id === selectedId ? { borderLeftColor: g.accent_color || 'var(--nords-color-accent)' } : undefined}
                  >
                    <span className="manage-goals__list-icon-wrap" style={{ color: g.accent_color || 'var(--nords-color-text-tertiary)' }}>
                      <GoalIcon size={16} strokeWidth={1.8} />
                    </span>
                    <span className="manage-goals__list-name">{g.name || 'Untitled'}</span>
                  </button>
                );
              })}
            </div>
            <button className="manage-goals__add-btn" onClick={handleCreate}>
              <Plus size={14} /> New Goal
            </button>
          </div>

          {/* ── Editor ── */}
          <div className="manage-goals__editor">
            {!selected ? (
              <div className="manage-goals__empty">
                {explicitGoals.length === 0
                  ? UI_STRINGS.goals.emptyList
                  : UI_STRINGS.goals.emptyEditor}
              </div>
            ) : (
              <GoalEditor
                key={selected.id}
                goal={selected}
                onUpdate={updateGoal}
                onDelete={() => handleDelete(selected.id)}
              />
            )}
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
}

// ── Goal Editor (simple — like PersonaEditor) ──

interface GoalEditorProps {
  goal: Goal;
  onUpdate: (id: string, fields: Record<string, unknown>) => Promise<unknown>;
  onDelete: () => void;
}

function GoalEditor({ goal, onUpdate, onDelete }: GoalEditorProps) {
  const [name, setName] = useState(goal.name);
  const [description, setDescription] = useState(goal.description || '');
  const [achievedPrompt, setAchievedPrompt] = useState(goal.achieved_prompt || '');
  const [showIconPicker, setShowIconPicker] = useState(false);

  const handleBlur = (field: string, value: unknown) => {
    onUpdate(goal.id, { [field]: value });
  };

  const GoalIcon = resolveIcon(goal.icon);

  return (
    <>
      {/* ── Header: Icon + Name + Delete ── */}
      <div className="manage-goals__editor-header">
        <button
          className="manage-goals__icon-btn"
          onClick={() => setShowIconPicker(!showIconPicker)}
          title="Change icon"
          style={{ borderColor: goal.accent_color || undefined }}
        >
          <GoalIcon size={22} strokeWidth={1.8} style={{ color: goal.accent_color || 'var(--nords-color-text-secondary)' }} />
        </button>
        <div style={{ flex: 1 }}>
          <input
            className="manage-goals__editor-name"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => handleBlur('name', name)}
            placeholder="Goal name"
          />
          <HueSlider
            color={goal.accent_color || '#6366f1'}
            onChange={(hex) => onUpdate(goal.id, { accent_color: hex })}
            saturation={55}
            lightness={40}
          />
        </div>
        <button className="manage-goals__delete-btn" onClick={onDelete} title="Delete goal">
          <Trash2 size={16} />
        </button>
      </div>

      {/* ── Icon Picker ── */}
      {showIconPicker && (
        <div className="manage-goals__icon-picker-wrap">
          <IconPicker
            currentIcon={goal.icon || 'Target'}
            onSelect={(iconName) => {
              onUpdate(goal.id, { icon: iconName });
              setShowIconPicker(false);
            }}
            accentColor={goal.accent_color || '#6366f1'}
          />
        </div>
      )}

      {/* ── Description ── */}
      <div className="manage-goals__section">
        <label className="manage-goals__section-title">Description <span className="required-dot">*</span></label>
        <textarea
          className="manage-goals__textarea"
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={() => handleBlur('description', description)}
          placeholder="What does this goal accomplish?"
          rows={3}
        />
      </div>

      {/* ── Achieved Prompt ── */}
      <div className="manage-goals__section">
        <label className="manage-goals__section-title">Achieved Prompt</label>
        <textarea
          className="manage-goals__textarea"
          value={achievedPrompt}
          onChange={e => setAchievedPrompt(e.target.value)}
          onBlur={() => handleBlur('achieved_prompt', achievedPrompt || null)}
          placeholder="AI instruction when this goal is achieved (e.g., 'Summarize the match and express excitement')"
          rows={3}
        />
      </div>
    </>
  );
}

export default ManageGoals;

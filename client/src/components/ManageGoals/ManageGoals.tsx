/**
 * ManageGoals — Admin panel for goal orchestration CRUD.
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │ Goals                                               [X]  │
 * │ Define session goals, prerequisites, and property binds.  │
 * ├────────────┬─────────────────────────────────────────────┤
 * │ 🎯 Goal 1  │  [🎯] Goal Name  [🗑]                       │
 * │ 📋 Goal 2  │  Description  [textarea]                    │
 * │    END      │  Terminates ◻  Exclusion Group [input]     │
 * │ + New       │  Requires  [select]                        │
 * │             │  Achieved Prompt  [textarea]               │
 * │             │  Properties  [+ Add]                       │
 * └────────────┴─────────────────────────────────────────────┘
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { X, Plus, Trash2, Target } from 'lucide-react';
import { useGoals, type Goal } from '../../hooks/useGoals';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { HueSlider } from '../shared/HueSlider';
import './ManageGoals.css';

// ── Types ──

interface NordInfo {
  id: string;
  title: string;
  type_name: string;
  properties_schema: Array<{ name: string; type: string; required?: boolean }>;
}

interface ManageGoalsProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  nords: NordInfo[];
}

// ── Emoji picker seeds ──
const GOAL_EMOJIS = ['🎯', '📋', '📞', '📅', '💳', '🏷️', '⭐', '📊', '🔔', '💡', '🎉', '🚀', '✅', '❤️', '🔑', '📝', '🤝', '💬', '🛒', '📱'];

// ── Debounce helper ──
function useDebouncedSave(saveFn: (id: string, fields: Record<string, unknown>) => Promise<unknown>, delay = 400) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  return useCallback((id: string, fields: Record<string, unknown>) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveFn(id, fields), delay);
  }, [saveFn, delay]);
}

// ── Main Component ──

export function ManageGoals({ projectId, open, onClose, nords }: ManageGoalsProps) {
  const {
    goals, createGoal, updateGoal, deleteGoal,
    addProperty, removeProperty,
  } = useGoals(projectId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = goals.find(g => g.id === selectedId) || null;
  const debouncedSave = useDebouncedSave(updateGoal);

  // Auto-select first
  React.useEffect(() => {
    if (!selectedId && goals.length > 0) setSelectedId(goals[0].id);
  }, [goals, selectedId]);

  const handleCreate = async () => {
    const g = await createGoal({ name: 'New Goal' });
    if (g) setSelectedId(g.id);
  };

  const handleDelete = async (id: string) => {
    await deleteGoal(id);
    if (selectedId === id) setSelectedId(goals.find(g => g.id !== id)?.id || null);
  };

  if (!open) return null;

  return (
    <FloatingPanel variant="modal" isOpen={open} onClose={onClose} width="min(940px, 92vw)">
      <div className="manage-goals">
        {/* Header */}
        <div className="manage-goals__header">
          <div>
            <h2 className="manage-goals__title">Goals</h2>
            <p className="manage-goals__subtitle">Define session goals, prerequisites, and property bindings.</p>
          </div>
          <button className="manage-goals__close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="manage-goals__body">
          {/* ── Sidebar ── */}
          <div className="manage-goals__sidebar">
            <div className="manage-goals__list">
              {goals.filter(g => !g.is_implicit).map(g => (
                <button
                  key={g.id}
                  className={`manage-goals__list-item ${g.id === selectedId ? 'is-active' : ''}`}
                  onClick={() => setSelectedId(g.id)}
                >
                  <span className="manage-goals__list-icon">{g.icon || '🎯'}</span>
                  <span className="manage-goals__list-name">{g.name || 'Untitled'}</span>
                  <span className="manage-goals__list-badges">
                    {g.terminates && <span className="manage-goals__badge manage-goals__badge--end">END</span>}
                    {g.requires_goal_id && <span className="manage-goals__badge manage-goals__badge--gate">GATE</span>}
                  </span>
                </button>
              ))}
            </div>
            <button className="manage-goals__add-btn" onClick={handleCreate}>
              <Plus size={14} /> New Goal
            </button>
          </div>

          {/* ── Editor ── */}
          <div className="manage-goals__editor">
            {!selected || selected.is_implicit ? (
              <div className="manage-goals__empty">
                {goals.filter(g => !g.is_implicit).length === 0
                  ? 'Create your first goal to get started.'
                  : 'Select a goal to edit.'}
              </div>
            ) : (
              <GoalEditor
                key={selected.id}
                goal={selected}
                allGoals={goals.filter(g => !g.is_implicit)}
                nords={nords}
                onUpdate={updateGoal}
                onDebouncedUpdate={debouncedSave}
                onDelete={() => handleDelete(selected.id)}
                onAddProperty={addProperty}
                onRemoveProperty={removeProperty}
              />
            )}
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
}

// ── Goal Editor ──

interface GoalEditorProps {
  goal: Goal;
  allGoals: Goal[];
  nords: NordInfo[];
  onUpdate: (id: string, fields: Record<string, unknown>) => Promise<unknown>;
  onDebouncedUpdate: (id: string, fields: Record<string, unknown>) => void;
  onDelete: () => void;
  onAddProperty: (goalId: string, nordId: string, propertyName: string) => Promise<unknown>;
  onRemoveProperty: (goalId: string, propId: string) => Promise<unknown>;
}

function GoalEditor({
  goal, allGoals, nords,
  onUpdate, onDebouncedUpdate, onDelete,
  onAddProperty, onRemoveProperty,
}: GoalEditorProps) {
  const [name, setName] = useState(goal.name);
  const [description, setDescription] = useState(goal.description || '');
  const [achievedPrompt, setAchievedPrompt] = useState(goal.achieved_prompt || '');
  const [exclusionGroup, setExclusionGroup] = useState(goal.exclusion_group || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Property add state
  const [addNordId, setAddNordId] = useState('');
  const [addPropName, setAddPropName] = useState('');

  const handleBlur = (field: string, value: unknown) => {
    onUpdate(goal.id, { [field]: value });
  };

  // Nords with MCP properties (available for binding)
  const nordsWithProps = useMemo(() =>
    nords.filter(n => n.properties_schema?.length > 0),
    [nords]
  );

  // Properties available for selected nord
  const availableProps = useMemo(() => {
    const nord = nords.find(n => n.id === addNordId);
    if (!nord) return [];
    const existingBindings = new Set(
      goal.properties.filter(p => p.nord_id === addNordId).map(p => p.property_name)
    );
    return (nord.properties_schema || []).filter(s => !existingBindings.has(s.name));
  }, [addNordId, nords, goal.properties]);

  // Nord title lookup
  const nordTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of nords) map.set(n.id, n.title);
    return map;
  }, [nords]);

  // Other goals for prerequisite select (exclude self)
  const otherGoals = allGoals.filter(g => g.id !== goal.id);

  const handleAddProp = async () => {
    if (!addNordId || !addPropName) return;
    await onAddProperty(goal.id, addNordId, addPropName);
    setAddPropName('');
  };

  return (
    <>
      {/* ── Header: Icon + Name + Delete ── */}
      <div className="manage-goals__editor-header">
        <button
          className="manage-goals__icon-btn"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Change icon"
        >
          {goal.icon || '🎯'}
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

      {/* ── Emoji Picker ── */}
      {showEmojiPicker && (
        <div className="manage-goals__emoji-grid">
          {GOAL_EMOJIS.map(emoji => (
            <button
              key={emoji}
              className={`manage-goals__emoji-option ${goal.icon === emoji ? 'is-active' : ''}`}
              onClick={() => { onUpdate(goal.id, { icon: emoji }); setShowEmojiPicker(false); }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* ── Description ── */}
      <div className="manage-goals__section">
        <label className="manage-goals__section-title">Description</label>
        <textarea
          className="manage-goals__textarea"
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={() => handleBlur('description', description)}
          placeholder="What does this goal accomplish?"
          rows={2}
        />
      </div>

      {/* ── Toggles ── */}
      <div className="manage-goals__section">
        <label className="manage-goals__section-title">Behavior</label>

        <div className="manage-goals__toggle-row">
          <div>
            <div className="manage-goals__toggle-label">Terminates Session</div>
            <div className="manage-goals__toggle-hint">Completing this goal ends the conversation</div>
          </div>
          <button
            className={`manage-goals__switch ${goal.terminates ? 'is-on' : ''}`}
            onClick={() => onUpdate(goal.id, { terminates: !goal.terminates })}
          >
            <div className="manage-goals__switch-knob" />
          </button>
        </div>

        <div className="manage-goals__toggle-row">
          <div>
            <div className="manage-goals__toggle-label">Default Goal</div>
            <div className="manage-goals__toggle-hint">Activated when sessions start</div>
          </div>
          <button
            className={`manage-goals__switch ${goal.is_default ? 'is-on' : ''}`}
            onClick={() => onUpdate(goal.id, { is_default: !goal.is_default })}
          >
            <div className="manage-goals__switch-knob" />
          </button>
        </div>
      </div>

      {/* ── Prerequisite ── */}
      <div className="manage-goals__section">
        <label className="manage-goals__section-title">Prerequisite (Gate)</label>
        <select
          className="manage-goals__select"
          value={goal.requires_goal_id || ''}
          onChange={e => onUpdate(goal.id, { requires_goal_id: e.target.value || null })}
        >
          <option value="">None — activates immediately</option>
          {otherGoals.map(g => (
            <option key={g.id} value={g.id}>{g.icon} {g.name}</option>
          ))}
        </select>
      </div>

      {/* ── Exclusion Group ── */}
      <div className="manage-goals__section">
        <label className="manage-goals__section-title">Exclusion Group</label>
        <input
          className="manage-goals__input"
          value={exclusionGroup}
          onChange={e => setExclusionGroup(e.target.value)}
          onBlur={() => handleBlur('exclusion_group', exclusionGroup || null)}
          placeholder="e.g., contact_method (only one in group can complete)"
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
          placeholder="AI instruction when goal completes (e.g., 'Thank the user and summarize their appointment')"
          rows={2}
        />
      </div>

      {/* ── Property Bindings ── */}
      <div className="manage-goals__section">
        <label className="manage-goals__section-title">
          <Target size={12} /> Property Bindings ({goal.properties.length})
        </label>

        {goal.properties.length > 0 && (
          <div className="manage-goals__prop-list">
            {goal.properties.map(p => (
              <div key={p.id} className="manage-goals__prop-item">
                <span className="manage-goals__prop-nord">{nordTitleMap.get(p.nord_id) || p.nord_id.slice(0, 8)}</span>
                <span className="manage-goals__prop-dot">→</span>
                <span className="manage-goals__prop-name">{p.property_name}</span>
                <button
                  className="manage-goals__prop-delete"
                  onClick={() => onRemoveProperty(goal.id, p.id)}
                  title="Remove binding"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add property */}
        <div className="manage-goals__add-prop-row">
          <select
            className="manage-goals__select"
            value={addNordId}
            onChange={e => { setAddNordId(e.target.value); setAddPropName(''); }}
          >
            <option value="">Select nord…</option>
            {nordsWithProps.map(n => (
              <option key={n.id} value={n.id}>{n.title} ({n.type_name})</option>
            ))}
          </select>
          <select
            className="manage-goals__select"
            value={addPropName}
            onChange={e => setAddPropName(e.target.value)}
            disabled={!addNordId}
          >
            <option value="">Select property…</option>
            {availableProps.map(p => (
              <option key={p.name} value={p.name}>
                {p.name} ({p.type}){p.required ? ' *' : ''}
              </option>
            ))}
          </select>
          <button
            className="manage-goals__add-prop-btn"
            onClick={handleAddProp}
            disabled={!addNordId || !addPropName}
          >
            <Plus size={12} /> Bind
          </button>
        </div>
      </div>
    </>
  );
}

export default ManageGoals;

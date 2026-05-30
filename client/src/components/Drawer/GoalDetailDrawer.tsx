/**
 * GoalDetailDrawer — Side panel for goal config when clicking a goal on the Goal Canvas.
 *
 * Follows the same pattern as clicking a Nord → DetailDrawer:
 * Opens in a FloatingPanel (right side) with:
 *   - Goal name + icon (read-only summary at top)
 *   - End Type: None / Reset / Continue selector
 *   - Variable Bindings: select project variables to bind to this goal
 *   - Relevant Nords: link nords to this goal
 *   - Achieved Prompt: message to display when goal is completed
 *
 * Flow connections (edges) are managed directly on the canvas via drag-to-connect.
 */

import { useState } from 'react';
import { X, StopCircle, Link, Plus, Trash2, Variable, Target, ToggleLeft, ToggleRight, MessageCircle } from 'lucide-react';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { resolveIcon } from '../../utils/iconRegistry';
import type { Goal, GoalVariableBinding } from '../../hooks/useGoals';
import type { ProjectVariable } from '../../hooks/useVariables';
import './GoalDetailDrawer.css';

// ── Types ──

interface NordRef {
  id: string;
  title: string;
  type_name: string;
}

interface GoalDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  nords: NordRef[];
  variables: ProjectVariable[];
  onUpdate: (id: string, fields: Record<string, unknown>) => Promise<unknown>;
  onAddVariableBinding: (goalId: string, variableId: string, required: boolean) => Promise<unknown>;
  onUpdateVariableBinding: (goalId: string, bindingId: string, required: boolean) => Promise<unknown>;
  onRemoveVariableBinding: (goalId: string, bindingId: string) => Promise<unknown>;
  onAddRelevantNord: (goalId: string, nordId: string) => Promise<unknown>;
  onRemoveRelevantNord: (goalId: string, nordId: string) => Promise<unknown>;
}

export function GoalDetailDrawer({
  isOpen,
  onClose,
  goal,
  nords,
  variables,
  onUpdate,
  onAddVariableBinding,
  onUpdateVariableBinding,
  onRemoveVariableBinding,
  onAddRelevantNord,
  onRemoveRelevantNord,
}: GoalDetailDrawerProps) {
  if (!goal) return null;

  const GoalIcon = resolveIcon(goal.icon);

  // Find variables not yet bound to this goal
  const boundVariableIds = new Set(goal.variable_bindings.map(b => b.variable_id));
  const unboundVariables = variables.filter(v => !boundVariableIds.has(v.id));

  // Find nords not yet linked to this goal
  const linkedNordIds = new Set(goal.relevant_nords.map(rn => rn.nord_id));
  const unlinkedNords = nords.filter(n => !linkedNordIds.has(n.id));

  return (
    <FloatingPanel variant="panel" isOpen={isOpen} onClose={onClose}>
      <div className="goal-detail-drawer">
        {/* ── Header ── */}
        <div className="goal-detail-drawer__header">
          <div className="goal-detail-drawer__icon" style={{ borderColor: goal.accent_color || '#6366f1' }}>
            <GoalIcon size={20} strokeWidth={1.6} style={{ color: goal.accent_color || '#6366f1' }} />
          </div>
          <div className="goal-detail-drawer__identity">
            <h2 className="goal-detail-drawer__name">{goal.name}</h2>
            <span className="goal-detail-drawer__eyebrow">Goal Config</span>
          </div>
          <button className="nords-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="goal-detail-drawer__content">
          {/* ── Description (read-only) ── */}
          {goal.description && (
            <div className="goal-detail-drawer__field">
              <label className="goal-detail-drawer__label">Description</label>
              <p className="goal-detail-drawer__text">{goal.description}</p>
            </div>
          )}

          {/* ── Session End Type ── */}
          <div className="goal-detail-drawer__section">
            <div className="goal-detail-drawer__section-header">
              <StopCircle size={14} />
              <span>Session Ending</span>
            </div>

            <p className="goal-detail-drawer__hint">
              When this goal completes, does the session end? If so, how does the next session start?
            </p>

            <div className="goal-detail-drawer__end-type-group">
              <EndTypeOption
                label="No end"
                sublabel="Session continues"
                value={null}
                current={goal.end_type}
                onChange={(v) => onUpdate(goal.id, { end_type: v })}
              />
              <EndTypeOption
                label="🔴 Reset"
                sublabel="End session, start fresh"
                value="reset"
                current={goal.end_type}
                onChange={(v) => onUpdate(goal.id, { end_type: v })}
              />
              <EndTypeOption
                label="🟡 Continue"
                sublabel="End session, carry over"
                value="continue"
                current={goal.end_type}
                onChange={(v) => onUpdate(goal.id, { end_type: v })}
              />
            </div>
          </div>

          {/* ── Achieved Prompt ── */}
          <div className="goal-detail-drawer__section">
            <div className="goal-detail-drawer__section-header">
              <MessageCircle size={14} />
              <span>Achieved Prompt</span>
            </div>
            <p className="goal-detail-drawer__hint">
              Optional message the AI says when this goal completes.
            </p>
            <textarea
              className="goal-detail-drawer__textarea"
              value={goal.achieved_prompt || ''}
              onChange={e => onUpdate(goal.id, { achieved_prompt: e.target.value || null })}
              placeholder="e.g. 'Great! We've captured everything we need for…'"
              rows={2}
            />
          </div>

          {/* ── Connections hint ── */}
          <div className="goal-detail-drawer__section">
            <div className="goal-detail-drawer__section-header">
              <Link size={14} />
              <span>Connections</span>
            </div>
            <p className="goal-detail-drawer__hint">
              Draw connections directly on the canvas — drag from one goal's handle to another.
              Click an edge and press Delete to remove it.
            </p>
          </div>

          {/* ── Collection Bindings Section ── */}
          <div className="goal-detail-drawer__section">
            <div className="goal-detail-drawer__section-header">
              <Variable size={14} />
              <span>Collection Bindings ({goal.variable_bindings?.length || 0})</span>
            </div>
            <p className="goal-detail-drawer__hint">
              Assign collections to this goal. Required collections must be collected for the goal to complete.
            </p>

            {goal.variable_bindings?.map(binding => {
              const variable = variables.find(v => v.id === binding.variable_id);
              return (
                <div key={binding.id} className="goal-detail-drawer__binding-row">
                  <span className="goal-detail-drawer__binding-nord">{variable?.name || 'Unknown'}</span>
                  <span className={`goal-detail-drawer__binding-badge ${binding.required ? 'is-required' : ''}`}>
                    {binding.required ? 'Required' : 'Optional'}
                  </span>
                  <button
                    className="goal-detail-drawer__binding-toggle"
                    onClick={() => onUpdateVariableBinding(goal.id, binding.id, !binding.required)}
                    title={binding.required ? 'Make optional' : 'Make required'}
                  >
                    {binding.required
                      ? <ToggleRight size={16} className="goal-detail-drawer__toggle-on" />
                      : <ToggleLeft size={16} className="goal-detail-drawer__toggle-off" />
                    }
                  </button>
                  <button
                    className="goal-detail-drawer__binding-remove"
                    onClick={() => onRemoveVariableBinding(goal.id, binding.id)}
                    title="Remove binding"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}

            <AddVariableBindingRow
              variables={unboundVariables}
              onAdd={(variableId) => onAddVariableBinding(goal.id, variableId, true)}
            />
          </div>

          {/* ── Relevant Nords Section ── */}
          <div className="goal-detail-drawer__section">
            <div className="goal-detail-drawer__section-header">
              <Target size={14} />
              <span>Relevant Nords ({goal.relevant_nords?.length || 0})</span>
            </div>
            <p className="goal-detail-drawer__hint">
              Link specific nords to this goal. The AI will prioritize these nords when working toward this goal.
            </p>

            {goal.relevant_nords?.map(rn => {
              const nord = nords.find(n => n.id === rn.nord_id);
              return (
                <div key={rn.id} className="goal-detail-drawer__binding-row">
                  <span className="goal-detail-drawer__binding-nord">{nord?.title || 'Unknown'}</span>
                  <span className="goal-detail-drawer__binding-type">{nord?.type_name || ''}</span>
                  <button
                    className="goal-detail-drawer__binding-remove"
                    onClick={() => onRemoveRelevantNord(goal.id, rn.nord_id)}
                    title="Unlink nord"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}

            <AddRelevantNordRow
              nords={unlinkedNords}
              onAdd={(nordId) => onAddRelevantNord(goal.id, nordId)}
            />
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
}

// ── End Type Radio Option ──

function EndTypeOption({
  label,
  sublabel,
  value,
  current,
  onChange,
}: {
  label: string;
  sublabel: string;
  value: 'reset' | 'continue' | null;
  current: 'reset' | 'continue' | null;
  onChange: (v: 'reset' | 'continue' | null) => void;
}) {
  const isActive = current === value;
  return (
    <button
      className={`goal-detail-drawer__end-option ${isActive ? 'is-active' : ''}`}
      onClick={() => onChange(value)}
    >
      <span className="goal-detail-drawer__end-option-label">{label}</span>
      <span className="goal-detail-drawer__end-option-sub">{sublabel}</span>
    </button>
  );
}

// ── Add Variable Binding Widget ──

function AddVariableBindingRow({
  variables,
  onAdd,
}: {
  variables: ProjectVariable[];
  onAdd: (variableId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState('');

  const handleAdd = () => {
    if (selectedId) {
      onAdd(selectedId);
      setSelectedId('');
    }
  };

  return (
    <div className="goal-detail-drawer__add-binding">
      <select
        className="goal-detail-drawer__select goal-detail-drawer__select--small"
        value={selectedId}
        onChange={e => setSelectedId(e.target.value)}
      >
        <option value="">Add collection…</option>
        {variables.map(v => (
          <option key={v.id} value={v.id}>
            {v.name} ({v.type}){v.required ? ' ✦' : ''}
          </option>
        ))}
      </select>
      <button
        className="goal-detail-drawer__add-btn"
        onClick={handleAdd}
        disabled={!selectedId}
      >
        <Plus size={12} /> Bind
      </button>
    </div>
  );
}

// ── Add Relevant Nord Widget ──

function AddRelevantNordRow({
  nords,
  onAdd,
}: {
  nords: NordRef[];
  onAdd: (nordId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState('');

  const handleAdd = () => {
    if (selectedId) {
      onAdd(selectedId);
      setSelectedId('');
    }
  };

  return (
    <div className="goal-detail-drawer__add-binding">
      <select
        className="goal-detail-drawer__select goal-detail-drawer__select--small"
        value={selectedId}
        onChange={e => setSelectedId(e.target.value)}
      >
        <option value="">Link nord…</option>
        {nords.map(n => (
          <option key={n.id} value={n.id}>{n.title} ({n.type_name})</option>
        ))}
      </select>
      <button
        className="goal-detail-drawer__add-btn"
        onClick={handleAdd}
        disabled={!selectedId}
      >
        <Plus size={12} /> Link
      </button>
    </div>
  );
}

export default GoalDetailDrawer;

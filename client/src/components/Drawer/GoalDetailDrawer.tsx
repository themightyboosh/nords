/**
 * GoalDetailDrawer — Side panel for flow config when clicking a goal on the Goal Canvas.
 *
 * Follows the same pattern as clicking a Nord → DetailDrawer:
 * Opens in a FloatingPanel (right side) with:
 *   - Goal name + icon (read-only summary at top)
 *   - Flow config: Requires (prerequisite), Ends Session, Exclusion Group
 *   - Property Bindings: Nord → property name binding CRUD
 *
 * This is where ALL the flow logic lives (moved out of ManageGoals modal).
 */

import React, { useState, useCallback, useRef } from 'react';
import { X, GitBranch, StopCircle, Unlink, Link, Plus, Trash2 } from 'lucide-react';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { resolveIcon } from '../../utils/iconRegistry';
import type { Goal, GoalProperty } from '../../hooks/useGoals';
import './GoalDetailDrawer.css';

// ── Types ──

interface NordRef {
  id: string;
  title: string;
  type_name: string;
  properties_schema: Array<{ name: string; type: string }>;
}

interface GoalDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  goals: Goal[];   // For prerequisite dropdown
  nords: NordRef[];  // For property binding
  onUpdate: (id: string, fields: Record<string, unknown>) => Promise<unknown>;
  onAddProperty: (goalId: string, nordId: string, propertyName: string) => Promise<unknown>;
  onRemoveProperty: (goalId: string, propId: string) => Promise<unknown>;
}

// ── Debounce helper ──
function useDebouncedSave(saveFn: (id: string, f: Record<string, unknown>) => Promise<unknown>, delay = 400) {
  const ref = useRef<ReturnType<typeof setTimeout>>();
  return useCallback((id: string, f: Record<string, unknown>) => {
    clearTimeout(ref.current);
    ref.current = setTimeout(() => saveFn(id, f), delay);
  }, [saveFn, delay]);
}

export function GoalDetailDrawer({
  isOpen,
  onClose,
  goal,
  goals,
  nords,
  onUpdate,
  onAddProperty,
  onRemoveProperty,
}: GoalDetailDrawerProps) {
  if (!goal) return null;

  const GoalIcon = resolveIcon(goal.icon);

  // Other goals for the prerequisite dropdown
  const otherGoals = goals.filter(g => g.id !== goal.id && !g.is_implicit);

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
            <span className="goal-detail-drawer__eyebrow">Goal Flow Config</span>
          </div>
        </div>

        <div className="goal-detail-drawer__content">
          {/* ── Description (read-only here) ── */}
          {goal.description && (
            <div className="goal-detail-drawer__field">
              <label className="goal-detail-drawer__label">Description</label>
              <p className="goal-detail-drawer__text">{goal.description}</p>
            </div>
          )}

          {/* ── Flow Section ── */}
          <div className="goal-detail-drawer__section">
            <div className="goal-detail-drawer__section-header">
              <GitBranch size={14} />
              <span>Flow</span>
            </div>

            {/* Prerequisite */}
            <div className="goal-detail-drawer__flow-row">
              <span className="goal-detail-drawer__flow-label">Requires</span>
              <select
                className="goal-detail-drawer__select"
                value={goal.requires_goal_id || ''}
                onChange={e => onUpdate(goal.id, { requires_goal_id: e.target.value || null })}
              >
                <option value="">None (entry point)</option>
                {otherGoals.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            {/* Ends Session */}
            <div className="goal-detail-drawer__flow-row">
              <span className="goal-detail-drawer__flow-label">
                <StopCircle size={12} /> Ends session
              </span>
              <button
                className={`goal-detail-drawer__toggle ${goal.terminates ? 'is-on' : ''}`}
                onClick={() => onUpdate(goal.id, { terminates: !goal.terminates })}
              >
                <span className="goal-detail-drawer__toggle-knob" />
              </button>
            </div>

            {/* Exclusion Group */}
            <div className="goal-detail-drawer__flow-row">
              <span className="goal-detail-drawer__flow-label">
                <Unlink size={12} /> Exclusion group
              </span>
              <input
                className="goal-detail-drawer__input"
                value={goal.exclusion_group || ''}
                onChange={e => onUpdate(goal.id, { exclusion_group: e.target.value || null })}
                placeholder="e.g., contact_method"
              />
            </div>
          </div>

          {/* ── Property Bindings Section ── */}
          <div className="goal-detail-drawer__section">
            <div className="goal-detail-drawer__section-header">
              <Link size={14} />
              <span>Property Bindings ({goal.properties?.length || 0})</span>
            </div>

            {goal.properties?.map(prop => {
              const nord = nords.find(n => n.id === prop.nord_id);
              return (
                <div key={prop.id} className="goal-detail-drawer__binding-row">
                  <span className="goal-detail-drawer__binding-nord">{nord?.title || 'Unknown'}</span>
                  <span className="goal-detail-drawer__binding-arrow">→</span>
                  <span className="goal-detail-drawer__binding-prop">{prop.property_name}</span>
                  <button
                    className="goal-detail-drawer__binding-remove"
                    onClick={() => onRemoveProperty(goal.id, prop.id)}
                    title="Remove binding"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}

            <AddPropertyRow
              nords={nords}
              existingProps={goal.properties || []}
              onAdd={(nordId, propName) => onAddProperty(goal.id, nordId, propName)}
            />
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
}

// ── Add Property Widget ──

function AddPropertyRow({
  nords,
  existingProps,
  onAdd,
}: {
  nords: NordRef[];
  existingProps: GoalProperty[];
  onAdd: (nordId: string, propName: string) => void;
}) {
  const [selectedNordId, setSelectedNordId] = useState('');
  const [selectedProp, setSelectedProp] = useState('');

  const selectedNord = nords.find(n => n.id === selectedNordId);
  const availableProps = selectedNord
    ? selectedNord.properties_schema.filter(
        p => !existingProps.some(ep => ep.nord_id === selectedNordId && ep.property_name === p.name)
      )
    : [];

  const handleAdd = () => {
    if (selectedNordId && selectedProp) {
      onAdd(selectedNordId, selectedProp);
      setSelectedProp('');
    }
  };

  return (
    <div className="goal-detail-drawer__add-binding">
      <select
        className="goal-detail-drawer__select goal-detail-drawer__select--small"
        value={selectedNordId}
        onChange={e => { setSelectedNordId(e.target.value); setSelectedProp(''); }}
      >
        <option value="">Select Nord…</option>
        {nords.map(n => (
          <option key={n.id} value={n.id}>{n.title} ({n.type_name})</option>
        ))}
      </select>
      {selectedNordId && (
        <select
          className="goal-detail-drawer__select goal-detail-drawer__select--small"
          value={selectedProp}
          onChange={e => setSelectedProp(e.target.value)}
        >
          <option value="">Select property…</option>
          {availableProps.map(p => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
      )}
      <button
        className="goal-detail-drawer__add-btn"
        onClick={handleAdd}
        disabled={!selectedNordId || !selectedProp}
      >
        <Plus size={12} /> Bind
      </button>
    </div>
  );
}

export default GoalDetailDrawer;

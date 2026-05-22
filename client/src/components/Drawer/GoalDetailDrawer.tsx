/**
 * GoalDetailDrawer — Side panel for goal config when clicking a goal on the Goal Canvas.
 *
 * Follows the same pattern as clicking a Nord → DetailDrawer:
 * Opens in a FloatingPanel (right side) with:
 *   - Goal name + icon (read-only summary at top)
 *   - End Type: None / Reset / Continue selector
 *   - Property Bindings: Nord → property name binding CRUD
 *
 * Flow connections (edges) are managed directly on the canvas via drag-to-connect.
 */

import React, { useState, useCallback } from 'react';
import { X, StopCircle, RefreshCw, Link, Plus, Trash2 } from 'lucide-react';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { resolveIcon } from '../../utils/iconRegistry';
import type { Goal, GoalProperty } from '../../hooks/useGoals';
import './GoalDetailDrawer.css';

// ── Types ──

interface NordRef {
  id: string;
  title: string;
  type_name: string;
  properties_schema: Array<{ name: string; type: string; source?: 'user' | 'mcp' }>;
}

interface GoalDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  goals: Goal[];
  nords: NordRef[];
  onUpdate: (id: string, fields: Record<string, unknown>) => Promise<unknown>;
  onAddProperty: (goalId: string, nordId: string, propertyName: string) => Promise<unknown>;
  onRemoveProperty: (goalId: string, propId: string) => Promise<unknown>;
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
        p =>
          // Only MCP-collectible properties can be bound to goals
          // (source: 'user' is admin context, source: 'mcp' or unset is collectible)
          p.source !== 'user' &&
          !existingProps.some(ep => ep.nord_id === selectedNordId && ep.property_name === p.name)
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

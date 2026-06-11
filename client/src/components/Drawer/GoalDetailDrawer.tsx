/**
 * GoalDetailDrawer — Side panel for goal config when clicking a goal on the Goal Canvas.
 *
 * Follows the same tab pattern as the Nord DetailDrawer:
 *   - PROPERTIES: Session ending, achieved prompt, relevant nords
 *   - FLOW: Prerequisites, next goals (DAG edges)
 *   - COLLECTION: Variable bindings
 */

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ToggleLeft, ToggleRight, ArrowRight, ArrowLeft } from 'lucide-react';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { resolveIcon } from '../../utils/iconRegistry';
import type { Goal, GoalVariableBinding, GoalEdge } from '../../hooks/useGoals';
import type { ProjectVariable } from '../../hooks/useVariables';
import type { CollectionGroup } from '../../hooks/useCollectionGroups';
import styles from './GoalDetailDrawer.module.css';

/**
 * Client-side BFS cycle detection — mirrors server logic.
 * Returns true if adding edge source→target would create a cycle.
 */
function wouldCreateCycleClient(
  sourceId: string,
  targetId: string,
  edges: GoalEdge[]
): boolean {
  if (sourceId === targetId) return true;
  const visited = new Set<string>();
  const queue = [targetId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const edge of edges) {
      if (edge.source_goal_id === current) {
        if (edge.target_goal_id === sourceId) return true;
        queue.push(edge.target_goal_id);
      }
    }
  }
  return false;
}

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
  /** All goals in the project (for edge dropdowns) */
  goals: Goal[];
  /** All DAG edges in the project */
  edges: GoalEdge[];
  nords: NordRef[];
  variables: ProjectVariable[];
  collectionGroups: CollectionGroup[];
  onUpdate: (id: string, fields: Record<string, unknown>) => Promise<unknown>;
  onAddVariableBinding: (goalId: string, variableId: string, required: boolean) => Promise<unknown>;
  onUpdateVariableBinding: (goalId: string, bindingId: string, required: boolean) => Promise<unknown>;
  onRemoveVariableBinding: (goalId: string, bindingId: string) => Promise<unknown>;
  onAddRelevantNord: (goalId: string, nordId: string) => Promise<unknown>;
  onRemoveRelevantNord: (goalId: string, nordId: string) => Promise<unknown>;
  onEdgeCreate: (sourceGoalId: string, targetGoalId: string) => Promise<unknown>;
  onEdgeDelete: (edgeId: string) => Promise<unknown>;
}

type GoalTab = 'properties' | 'flow' | 'collection';

export function GoalDetailDrawer({
  isOpen,
  onClose,
  goal,
  goals,
  edges,
  nords,
  variables,
  collectionGroups,
  onUpdate,
  onAddVariableBinding,
  onUpdateVariableBinding,
  onRemoveVariableBinding,
  onAddRelevantNord,
  onRemoveRelevantNord,
  onEdgeCreate,
  onEdgeDelete,
}: GoalDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<GoalTab>('flow');

  // Reset to properties tab when goal changes
  useEffect(() => {
    setActiveTab('flow');
  }, [goal?.id]);

  if (!goal) return null;

  // Safety defaults for arrays (prevents crash during HMR transitions)
  const safeEdges = edges || [];
  const safeGoals = goals || [];

  const GoalIcon = resolveIcon(goal.icon);

  // Find variables not yet bound to this goal
  const boundVariableIds = new Set(goal.variable_bindings.map(b => b.variable_id));
  const unboundVariables = variables.filter(v => !boundVariableIds.has(v.id));

  // Find nords not yet linked to this goal
  const linkedNordIds = new Set(goal.relevant_nords.map(rn => rn.nord_id));
  const unlinkedNords = nords.filter(n => !linkedNordIds.has(n.id));

  // Edge counts for tab labels
  const prerequisiteEdges = safeEdges.filter(e => e.target_goal_id === goal.id);
  const nextGoalEdges = safeEdges.filter(e => e.source_goal_id === goal.id);

  return (
    <FloatingPanel variant="panel" isOpen={isOpen} onClose={onClose}>
      <div className="goal-detail-drawer">
        {/* ── Header ── */}
        <div className="goal-detail-drawer__header">
          <div style={{ flex: 1 }}>
            <div className="nords-drawer-type-eyebrow" style={{ color: goal.accent_color || '#6366f1' }}>
              <GoalIcon size={12} strokeWidth={2} />
              Goal
            </div>
            <div className="goal-detail-drawer__identity">
              <h2 className="goal-detail-drawer__name">{goal.name}</h2>
            </div>
          </div>
          <button className="nords-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* ── Tab Bar ── */}
        <div className="nords-drawer-tabs">
          <button
            className={`nords-drawer-tab ${activeTab === 'flow' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('flow')}
          >
            Flow
          </button>
          <button
            className={`nords-drawer-tab ${activeTab === 'properties' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('properties')}
          >
            Properties
          </button>
          <button
            className={`nords-drawer-tab ${activeTab === 'collection' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('collection')}
          >
            Collection
          </button>
        </div>

        <div className="goal-detail-drawer__content">

          {/* ════════════════════════════════════════════════
              PROPERTIES TAB — Session ending, achieved prompt, relevant nords
              ════════════════════════════════════════════════ */}
          {activeTab === 'properties' && (
            <>
              {/* ── Description (Required) ── */}
              <div className="goal-detail-drawer__section">
                <div className="goal-detail-drawer__section-header">
                  <span>Description <span className="manage-types__required-badge">Required</span></span>
                </div>
                <p className="goal-detail-drawer__hint">
                  Describe the purpose and completion criteria for this goal. This is shown to the AI agent.
                </p>
                <textarea
                  className={`goal-detail-drawer__textarea ${!goal.description ? 'goal-detail-drawer__textarea--empty' : ''}`}
                  value={goal.description || ''}
                  onChange={e => onUpdate(goal.id, { description: e.target.value || null })}
                  placeholder="e.g. 'Collect the participant's contact details and validate their eligibility.'"
                  rows={2}
                />
              </div>
              <div className="goal-detail-drawer__section">
                <div className="goal-detail-drawer__section-header">
                  <span>Session Ending</span>
                </div>

                <p className="goal-detail-drawer__hint">
                  When this goal completes, does the session end?
                </p>

                {/* Continue / End toggle */}
                <div className="goal-detail-drawer__end-toggle">
                  <button
                    className={`goal-detail-drawer__end-toggle-btn ${!goal.end_type ? 'is-active' : ''}`}
                    onClick={() => onUpdate(goal.id, { end_type: null })}
                  >
                    Continue
                  </button>
                  <button
                    className={`goal-detail-drawer__end-toggle-btn ${goal.end_type ? 'is-active is-end' : ''}`}
                    onClick={async () => {
                      // If switching TO end_type and there are downstream edges, confirm pruning
                      if (!goal.end_type && nextGoalEdges.length > 0) {
                        const confirmed = window.confirm(
                          `This goal unlocks ${nextGoalEdges.length} downstream goal${nextGoalEdges.length > 1 ? 's' : ''}. ` +
                          'Setting it as an End goal will remove those links. Continue?'
                        );
                        if (!confirmed) return;
                        // Delete all outgoing edges
                        for (const edge of nextGoalEdges) {
                          await onEdgeDelete(edge.id);
                        }
                      }
                      onUpdate(goal.id, { end_type: goal.end_type || 'continue' });
                    }}
                  >
                    ⏹ End
                  </button>
                </div>

                {/* Reset checkbox — only shown when End is selected */}
                {goal.end_type && (
                  <label className="goal-detail-drawer__reset-checkbox">
                    <input
                      type="checkbox"
                      checked={goal.end_type === 'reset'}
                      onChange={(e) => onUpdate(goal.id, { end_type: e.target.checked ? 'reset' : 'continue' })}
                    />
                    <span>Reset session (start fresh with welcome message)</span>
                  </label>
                )}
              </div>

              {/* ── Achieved Prompt ── */}
              <div className="goal-detail-drawer__section">
                <div className="goal-detail-drawer__section-header">
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

              {/* ── Relevant Nords ── */}
              <div className="goal-detail-drawer__section">
                <div className="goal-detail-drawer__section-header">
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
            </>
          )}

          {/* ════════════════════════════════════════════════
              FLOW TAB — Prerequisites and Next Goals (DAG edges)
              ════════════════════════════════════════════════ */}
          {activeTab === 'flow' && (
            <>
              {/* ── Prerequisite Gate Type ── */}
              <div className="goal-detail-drawer__section">
                <div className="goal-detail-drawer__section-header">
                  <span>Prerequisite Gate</span>
                </div>
                <p className="goal-detail-drawer__hint">
                  How many prerequisites must complete before this goal activates?
                </p>
                <select
                  className="goal-detail-drawer__select"
                  value={goal.prerequisite_gate || 'all'}
                  onChange={(e) => onUpdate(goal.id, { prerequisite_gate: e.target.value as 'all' | 'any' })}
                >
                  <option value="all">AND — All prerequisites must complete</option>
                  <option value="any">OR — Any single prerequisite completes</option>
                </select>
              </div>

              {/* ── Prerequisites ── */}
              <div className="goal-detail-drawer__section">
                <div className="goal-detail-drawer__section-header">
                  <ArrowLeft size={14} />
                  <span>Prerequisites ({prerequisiteEdges.length})</span>
                  {prerequisiteEdges.length > 1 && (
                    <span className="goal-detail-drawer__gate-badge">
                      {goal.prerequisite_gate === 'any' ? 'OR' : 'AND'}
                    </span>
                  )}
                </div>
                <p className="goal-detail-drawer__hint">
                  Goals that must complete before this one becomes active.
                </p>

                {prerequisiteEdges.map(edge => {
                  const srcGoal = safeGoals.find(g => g.id === edge.source_goal_id);
                  if (!srcGoal) return null;
                  const SrcIcon = resolveIcon(srcGoal.icon);
                  return (
                    <div key={edge.id} className="goal-detail-drawer__binding-row">
                      <SrcIcon size={14} style={{ color: srcGoal.accent_color || '#6366f1', flexShrink: 0 }} />
                      <span className="goal-detail-drawer__binding-nord">{srcGoal.name}</span>
                      <ArrowRight size={12} className="goal-detail-drawer__edge-arrow" />
                      <span className="goal-detail-drawer__binding-badge">then this</span>
                      <button
                        className="goal-detail-drawer__binding-remove"
                        onClick={() => onEdgeDelete(edge.id)}
                        title="Remove prerequisite"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}

                <AddEdgeRow
                  label="Add prerequisite…"
                  goals={safeGoals.filter(g => {
                    if (g.id === goal.id) return false;
                    if (g.is_implicit) return false;
                    // Already a prerequisite?
                    if (safeEdges.some(e => e.source_goal_id === g.id && e.target_goal_id === goal.id)) return false;
                    // Would this create a cycle? (g → this goal, so check if this goal can reach g)
                    if (wouldCreateCycleClient(g.id, goal.id, safeEdges)) return false;
                    return true;
                  })}
                  onAdd={(sourceId) => onEdgeCreate(sourceId, goal.id)}
                />
              </div>

              {/* ── Unlocks (read-only downstream) — hidden for End goals ── */}
              {!goal.end_type && nextGoalEdges.length > 0 && (
                <div className="goal-detail-drawer__section">
                  <div className="goal-detail-drawer__section-header">
                    <ArrowRight size={14} />
                    <span>Unlocks ({nextGoalEdges.length})</span>
                  </div>
                  <p className="goal-detail-drawer__hint">
                    Goals unlocked when this one completes. Edit from the target goal's prerequisites.
                  </p>

                  {nextGoalEdges.map(edge => {
                    const tgtGoal = safeGoals.find(g => g.id === edge.target_goal_id);
                    if (!tgtGoal) return null;
                    const TgtIcon = resolveIcon(tgtGoal.icon);
                    return (
                      <div key={edge.id} className="goal-detail-drawer__binding-row goal-detail-drawer__binding-row--readonly">
                        <span className="goal-detail-drawer__binding-badge">this</span>
                        <ArrowRight size={12} className="goal-detail-drawer__edge-arrow" />
                        <TgtIcon size={14} style={{ color: tgtGoal.accent_color || '#6366f1', flexShrink: 0 }} />
                        <span className="goal-detail-drawer__binding-nord">{tgtGoal.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Fork Type — hidden for End goals ── */}
              {!goal.end_type && nextGoalEdges.length > 1 && (
                <div className="goal-detail-drawer__section">
                  <div className="goal-detail-drawer__section-header">
                    <span>Fork Type</span>
                  </div>
                  <p className="goal-detail-drawer__hint">
                    When this goal completes and unlocks multiple children, do they compete or coexist?
                  </p>
                  <select
                    className="goal-detail-drawer__select"
                    value={goal.fork_type || 'parallel'}
                    onChange={(e) => onUpdate(goal.id, { fork_type: e.target.value as 'parallel' | 'exclusive' })}
                  >
                    <option value="parallel">⚡ Parallel — All children activate together</option>
                    <option value="exclusive">◇ Exclusive — First child completed cancels siblings</option>
                  </select>
                </div>
              )}
            </>
          )}

          {/* ════════════════════════════════════════════════
              COLLECTION TAB — Property bindings
              ════════════════════════════════════════════════ */}
          {activeTab === 'collection' && (
            <>
              <div className="goal-detail-drawer__section">
                <div className="goal-detail-drawer__section-header">
                  <span>Property Bindings ({goal.variable_bindings?.length || 0})</span>
                </div>
                <p className="goal-detail-drawer__hint">
                  Assign collections to this goal. Required collections must be collected for the goal to complete.
                </p>

                {goal.variable_bindings?.map(binding => {
                  const variable = variables.find(v => v.id === binding.variable_id);
                  const group = collectionGroups.find(g => g.id === variable?.collection_group_id);
                  return (
                    <div key={binding.id} className="goal-detail-drawer__binding-row">
                      <div className="goal-detail-drawer__binding-info">
                        {group && (
                          <span className="goal-detail-drawer__binding-group">{group.name} ›</span>
                        )}
                        <span className="goal-detail-drawer__binding-nord">{variable?.name || 'Unknown'}</span>
                      </div>
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
                  collectionGroups={collectionGroups}
                  onAdd={(variableId) => onAddVariableBinding(goal.id, variableId, true)}
                />
              </div>
            </>
          )}

        </div>
      </div>
    </FloatingPanel>
  );
}


// ── Add Variable Binding Widget ──

function AddVariableBindingRow({
  variables,
  collectionGroups,
  onAdd,
}: {
  variables: ProjectVariable[];
  collectionGroups: CollectionGroup[];
  onAdd: (variableId: string) => void;
}) {
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedId, setSelectedId] = useState('');

  // Groups that have at least one unbound variable
  const availableGroups = collectionGroups.filter(g =>
    variables.some(v => v.collection_group_id === g.id)
  );
  const ungroupedVars = variables.filter(v => !v.collection_group_id);

  // Variables in the selected group (or ungrouped)
  const filteredVars = selectedGroupId === '__ungrouped__'
    ? ungroupedVars
    : variables.filter(v => v.collection_group_id === selectedGroupId);

  const handleAdd = () => {
    if (selectedId) {
      onAdd(selectedId);
      setSelectedId('');
      setSelectedGroupId('');
    }
  };

  if (variables.length === 0) return null;

  return (
    <div className="goal-detail-drawer__add-binding goal-detail-drawer__add-binding--cascade">
      <select
        className="goal-detail-drawer__select goal-detail-drawer__select--small"
        value={selectedGroupId}
        onChange={e => { setSelectedGroupId(e.target.value); setSelectedId(''); }}
      >
        <option value="">Select group…</option>
        {availableGroups.map(g => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
        {ungroupedVars.length > 0 && (
          <option value="__ungrouped__">Ungrouped</option>
        )}
      </select>
      {selectedGroupId && (
        <select
          className="goal-detail-drawer__select goal-detail-drawer__select--small"
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
        >
          <option value="">Select variable…</option>
          {filteredVars.map(v => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.type}){v.required ? ' ✦' : ''}
            </option>
          ))}
        </select>
      )}
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
  const [selectedType, setSelectedType] = useState('');
  const [selectedId, setSelectedId] = useState('');

  // Derive unique types from available nords
  const types = Array.from(new Set(nords.map(n => n.type_name))).sort();
  const filteredNords = selectedType
    ? nords.filter(n => n.type_name === selectedType)
    : [];

  const handleAdd = () => {
    if (selectedId) {
      onAdd(selectedId);
      setSelectedId('');
      setSelectedType('');
    }
  };

  if (nords.length === 0) return null;

  return (
    <div className="goal-detail-drawer__add-binding goal-detail-drawer__add-binding--cascade">
      <select
        className="goal-detail-drawer__select goal-detail-drawer__select--small"
        value={selectedType}
        onChange={e => { setSelectedType(e.target.value); setSelectedId(''); }}
      >
        <option value="">Select type…</option>
        {types.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      {selectedType && (
        <select
          className="goal-detail-drawer__select goal-detail-drawer__select--small"
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
        >
          <option value="">Select nord…</option>
          {filteredNords.map(n => (
            <option key={n.id} value={n.id}>{n.title}</option>
          ))}
        </select>
      )}
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

// ── Add Edge Widget (shared by Prerequisites + Next Goals) ──

function AddEdgeRow({
  label,
  goals,
  onAdd,
}: {
  label: string;
  goals: Goal[];
  onAdd: (goalId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState('');

  const handleAdd = () => {
    if (selectedId) {
      onAdd(selectedId);
      setSelectedId('');
    }
  };

  if (goals.length === 0) return null;

  return (
    <div className="goal-detail-drawer__add-binding">
      <select
        className="goal-detail-drawer__select goal-detail-drawer__select--small"
        value={selectedId}
        onChange={e => setSelectedId(e.target.value)}
      >
        <option value="">{label}</option>
        {goals.map(g => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>
      <button
        className="goal-detail-drawer__add-btn"
        onClick={handleAdd}
        disabled={!selectedId}
      >
        <Plus size={12} /> Add
      </button>
    </div>
  );
}

export default GoalDetailDrawer;

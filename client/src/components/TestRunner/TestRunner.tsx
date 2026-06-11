/**
 * TestRunner — Scenario editor for synthetic user tests.
 *
 * ┌───────────────────────────────────────────────────────────────┐
 * │ Test Runner                                             [X]  │
 * ├────────────┬──────────────────────────────────────────────────┤
 * │ Scenarios  │  Name: [editable]                               │
 * │ ──────────── │  Objective: [textarea]                         │
 * │ ☐ Happy    > │  Profile: [dropdown]                          │
 * │ ☐ Stress   │  Termination: [config]                          │
 * │ + New      │                                                  │
 * └────────────┴──────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Plus, Play, Trash2, FlaskConical,
  CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { api } from '../../api/client';
import styles from './TestRunner.module.css';

// ── Types ──

interface TestScenario {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  user_objective: string;
  user_profile: string;
  user_profile_custom: string | null;
  user_context: Record<string, unknown>;
  agent_model: string;
  user_model: string;
  max_rounds: number;
  stop_on_goal_id: string | null;
  stop_on_session_end: boolean;
  goal_name?: string;
  latest_run: { status: string; passed: boolean; synthetic_nps: number; started_at: string } | null;
  run_count: number;
}



interface Goal {
  id: string;
  name: string;
  end_type: string | null;
}

interface TestRunnerProps {
  projectId: string;
  projectMode: string;
  goalsEnabled: boolean;
  open: boolean;
  onClose: () => void;
}

const PROFILES = [
  { value: 'cooperative', label: 'Cooperative', desc: 'Answers directly, stays on topic' },
  { value: 'tangential', label: 'Tangential', desc: 'Drifts, buries data in stories' },
  { value: 'reluctant', label: 'Reluctant', desc: "Short answers, 'I don't know'" },
  { value: 'adversarial', label: 'Adversarial', desc: 'Contradicts, challenges' },
  { value: 'rushed', label: 'Rushed', desc: "Minimal info, 'are we done?'" },
  { value: 'other', label: 'Other', desc: 'Custom behavior' },
];

const MODELS = [
  { value: 'gemini-2.5-flash-lite', label: 'Flash Lite (cheapest)' },
  { value: 'gemini-2.5-flash', label: 'Flash' },
  { value: 'gemini-2.5-pro', label: 'Pro' },
];

const OTHER_PLACEHOLDER = `Describe how this user behaves. Example: 'You are an elderly person who is not tech-savvy. You ask the AI to repeat things. You use informal language and sometimes misunderstand questions.'`;

/** Reusable run-test button with loading state */
export function RunTestButton({ onClick, loading, disabled, className = '' }: {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      className={`test-runner__run-btn ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? <Loader2 size={14} className="test-runner__running" /> : <Play size={14} />}
      {loading ? 'Starting...' : 'Run Test'}
    </button>
  );
}

export function TestRunner({ projectId, projectMode, goalsEnabled, open, onClose }: TestRunnerProps) {
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    user_objective: '',
    user_profile: 'cooperative',
    user_profile_custom: '',
    user_context: '',
    agent_model: 'gemini-2.5-flash',
    user_model: 'gemini-2.5-flash-lite',
    max_rounds: 20,
    stop_on_goal_id: null as string | null,
    stop_on_session_end: true,
  });

  const selected = scenarios.find(s => s.id === selectedId) || null;

  // ── Data fetching ──

  const loadScenarios = useCallback(async () => {
    try {
      const data = await api.get<TestScenario[]>(`/api/projects/${projectId}/test-scenarios`);
      setScenarios(data);
    } catch (err) {
      console.error('Failed to load scenarios', err);
    }
  }, [projectId]);



  const loadGoals = useCallback(async () => {
    if (!goalsEnabled) return;
    try {
      const data = await api.get<Goal[]>(`/api/projects/${projectId}/goals`);
      setGoals(data);
    } catch (err) {
      console.error('Failed to load goals', err);
    }
  }, [projectId, goalsEnabled]);

  useEffect(() => {
    if (open) {
      loadScenarios();
      loadGoals();
    }
  }, [open, loadScenarios, loadGoals]);

  // Auto-select first scenario when list loads
  useEffect(() => {
    if (scenarios.length > 0 && !selectedId) {
      setSelectedId(scenarios[0].id);
    }
  }, [scenarios, selectedId]);



  // ── Form ──

  useEffect(() => {
    if (selected) {
      setForm({
        name: selected.name,
        description: selected.description || '',
        user_objective: selected.user_objective,
        user_profile: selected.user_profile,
        user_profile_custom: selected.user_profile_custom || '',
        user_context: typeof selected.user_context === 'object' ? JSON.stringify(selected.user_context, null, 2) : '',
        agent_model: selected.agent_model,
        user_model: selected.user_model,
        max_rounds: selected.max_rounds,
        stop_on_goal_id: selected.stop_on_goal_id,
        stop_on_session_end: selected.stop_on_session_end,
      });
    }
  }, [selected]);

  const handleCreate = async () => {
    try {
      const created = await api.post<TestScenario>(`/api/projects/${projectId}/test-scenarios`, {
        name: 'New Test',
        user_objective: 'Describe the user objective here',
      });
      await loadScenarios();
      setSelectedId(created.id);
    } catch (err) {
      console.error('Failed to create scenario', err);
    }
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      let userContext = {};
      try { userContext = form.user_context ? JSON.parse(form.user_context) : {}; } catch { /* ignore */ }

      await api.put(`/api/test-scenarios/${selectedId}`, {
        ...form,
        user_context: userContext,
      });
      await loadScenarios();
    } catch (err) {
      console.error('Failed to save scenario', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm('Delete this test scenario?')) return;
    await api.delete(`/api/test-scenarios/${selectedId}`);
    setSelectedId(null);
    await loadScenarios();
  };

  const handleRun = async (scenarioId: string) => {
    setLoading(true);
    try {
      await api.post(`/api/test-scenarios/${scenarioId}/run`, {});
      await loadScenarios(); // Refresh to show updated latest_run
    } catch (err) {
      console.error('Failed to start run', err);
    } finally {
      setLoading(false);
    }
  };



  if (!open) return null;

  return (
    <FloatingPanel variant="modal" isOpen={open} onClose={onClose} width="min(1100px, 95vw)">
      <div className="test-runner">
        {/* ── Header ── */}
        <div className="test-runner__header">
          <div className="test-runner__header-left">
            <h2 className="nords-panel-title"><FlaskConical size={18} strokeWidth={1.6} />Test Runner</h2>
          </div>
          <button className="nords-close-btn" onClick={onClose} aria-label="Close"><X size={18} strokeWidth={2} /></button>
        </div>

        <div className="test-runner__body">
          {/* ── Left: Scenario List ── */}
          <div className="test-runner__sidebar">
            <div className="test-runner__sidebar-header">
              <span>Scenarios</span>
              <button className="test-runner__add-btn" onClick={handleCreate} title="New scenario">
                <Plus size={14} />
              </button>
            </div>
            <div className="test-runner__scenario-list">
              {scenarios.map(s => (
                <button
                  key={s.id}
                  className={`test-runner__scenario-item ${s.id === selectedId ? 'active' : ''}`}
                  onClick={() => setSelectedId(s.id)}
                >
                  <span className="test-runner__scenario-status">
                    {s.latest_run?.passed === true && <CheckCircle2 size={12} className="test-runner__pass" />}
                    {s.latest_run?.passed === false && <XCircle size={12} className="test-runner__fail" />}
                    {s.latest_run?.status === 'running' && <Loader2 size={12} className="test-runner__running" />}
                  </span>
                  <span className="test-runner__scenario-name">{s.name}</span>
                  <span className="test-runner__profile-badge">{s.user_profile}</span>
                </button>
              ))}
              {scenarios.length === 0 && (
                <div className="test-runner__empty">No test scenarios yet</div>
              )}
            </div>
          </div>

          {/* ── Right: Scenario Editor ── */}
          <div className="test-runner__content">
            {!selectedId ? (
              <div className="test-runner__placeholder">
                <FlaskConical size={40} strokeWidth={1} />
                <p>Select a scenario or create a new one</p>
              </div>
            ) : (
              <div className="test-runner__form">
                {/* Run button at the top */}
                <div className="test-runner__form-top-actions">
                  <RunTestButton onClick={() => handleRun(selectedId!)} loading={loading} />
                </div>

                <div className="test-runner__field">
                  <label>Name</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    onBlur={handleSave}
                  />
                </div>

                <div className="test-runner__field">
                  <label>Description</label>
                  <input
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    onBlur={handleSave}
                    placeholder="Optional description"
                  />
                </div>

                <div className="test-runner__field">
                  <label>User Objective</label>
                  <textarea
                    value={form.user_objective}
                    onChange={e => setForm(f => ({ ...f, user_objective: e.target.value }))}
                    onBlur={handleSave}
                    rows={3}
                    placeholder="I want to register my 3-year-old golden retriever for boarding"
                  />
                </div>

                <div className="test-runner__row">
                  <div className="test-runner__field">
                    <label>Behavior Profile</label>
                    <select
                      value={form.user_profile}
                      onChange={e => { setForm(f => ({ ...f, user_profile: e.target.value })); setTimeout(handleSave, 50); }}
                    >
                      {PROFILES.map(p => (
                        <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {form.user_profile === 'other' && (
                  <div className="test-runner__field">
                    <label>Custom Profile</label>
                    <textarea
                      value={form.user_profile_custom}
                      onChange={e => setForm(f => ({ ...f, user_profile_custom: e.target.value }))}
                      onBlur={handleSave}
                      rows={4}
                      placeholder={OTHER_PLACEHOLDER}
                    />
                  </div>
                )}

                <div className="test-runner__field">
                  <label>User Context (optional background info)</label>
                  <textarea
                    value={form.user_context}
                    onChange={e => setForm(f => ({ ...f, user_context: e.target.value }))}
                    onBlur={handleSave}
                    rows={2}
                    placeholder='{"pet_name": "Buddy", "breed": "Golden Retriever"}'
                  />
                </div>

                <div className="test-runner__row">
                  <div className="test-runner__field">
                    <label>Agent Model</label>
                    <select
                      value={form.agent_model}
                      onChange={e => { setForm(f => ({ ...f, agent_model: e.target.value })); setTimeout(handleSave, 50); }}
                    >
                      {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div className="test-runner__field">
                    <label>User Model</label>
                    <select
                      value={form.user_model}
                      onChange={e => { setForm(f => ({ ...f, user_model: e.target.value })); setTimeout(handleSave, 50); }}
                    >
                      {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* ── Termination Conditions ── */}
                <div className="test-runner__section-title">⏹ Termination Conditions</div>

                <div className="test-runner__row">
                  <div className="test-runner__field">
                    <label>Max Rounds</label>
                    <input
                      type="number" min={5} max={50}
                      value={form.max_rounds}
                      onChange={e => setForm(f => ({ ...f, max_rounds: parseInt(e.target.value) || 20 }))}
                      onBlur={handleSave}
                    />
                  </div>
                  <div className="test-runner__field test-runner__field--toggle">
                    <label>Stop on Session End</label>
                    <input
                      type="checkbox"
                      checked={form.stop_on_session_end}
                      onChange={e => { setForm(f => ({ ...f, stop_on_session_end: e.target.checked })); setTimeout(handleSave, 50); }}
                    />
                  </div>
                </div>

                {/* Goal dropdown — guided mode only */}
                {goalsEnabled && goals.length > 0 && (
                  <div className="test-runner__field">
                    <label>Stop on Goal</label>
                    <select
                      value={form.stop_on_goal_id || ''}
                      onChange={e => { setForm(f => ({ ...f, stop_on_goal_id: e.target.value || null })); setTimeout(handleSave, 50); }}
                    >
                      <option value="">None</option>
                      {goals.filter(g => g.end_type != null).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="test-runner__form-actions">
                  <button className="test-runner__delete-btn" onClick={handleDelete}>
                    <Trash2 size={14} /> Delete Scenario
                  </button>
                  <span className="test-runner__save-status">
                    {saving ? 'Saving...' : 'Auto-saved'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
}

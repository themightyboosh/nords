/**
 * TestRunner — Management hub for synthetic user test scenarios and run history.
 *
 * ┌───────────────────────────────────────────────────────────────┐
 * │ Test Runner                                             [X]  │
 * ├────────────┬──────────────────────────────────────────────────┤
 * │ Scenarios  │  📝 Scenario  │  📊 Runs                        │
 * │ ──────────── │──────────────────────────────────────────────── │
 * │ ☐ Happy    > │  Name: [editable]                              │
 * │ ☐ Stress   │  Objective: [textarea]                          │
 * │ + New      │  Profile: [dropdown]                            │
 * │            │  Termination: [config]                           │
 * └────────────┴──────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Plus, Play, Trash2, FlaskConical, Download, Search,
  CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight,
} from 'lucide-react';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { api } from '../../api/client';
import './TestRunner.css';

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
  stop_on_completion_pct: number | null;
  stop_on_goal_id: string | null;
  stop_on_session_end: boolean;
  min_completion_pct: number;
  goal_name?: string;
  latest_run: { status: string; passed: boolean; synthetic_nps: number; started_at: string } | null;
  run_count: number;
}

interface TestRun {
  id: string;
  scenario_id: string;
  status: string;
  stop_reason: string | null;
  rounds_completed: number;
  completion_pct: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_latency_ms: number;
  tool_call_count: number;
  synthetic_nps: number | null;
  user_sentiment: string | null;
  passed: boolean | null;
  started_at: string;
  finished_at: string | null;
  has_critique: boolean;
  transcript?: unknown[];
  critique?: unknown;
}

interface Goal {
  id: string;
  name: string;
}

interface TestRunnerProps {
  projectId: string;
  projectMode: string;
  goalsEnabled: boolean;
  open: boolean;
  onClose: () => void;
  onReplay?: (transcript: any[], label: string) => void;
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

export function TestRunner({ projectId, projectMode, goalsEnabled, open, onClose, onReplay }: TestRunnerProps) {
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'scenario' | 'runs'>('scenario');
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [runDetail, setRunDetail] = useState<TestRun | null>(null);
  const [critique, setCritique] = useState<any>(null);
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
    stop_on_completion_pct: null as number | null,
    stop_on_goal_id: null as string | null,
    stop_on_session_end: true,
    min_completion_pct: 80,
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

  const loadRuns = useCallback(async (scenarioId: string) => {
    try {
      const data = await api.get<TestRun[]>(`/api/test-scenarios/${scenarioId}/runs`);
      setRuns(data);
    } catch (err) {
      console.error('Failed to load runs', err);
    }
  }, []);

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

  useEffect(() => {
    if (selectedId) loadRuns(selectedId);
  }, [selectedId, loadRuns]);

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
        stop_on_completion_pct: selected.stop_on_completion_pct,
        stop_on_goal_id: selected.stop_on_goal_id,
        stop_on_session_end: selected.stop_on_session_end,
        min_completion_pct: selected.min_completion_pct,
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
      setTab('scenario');
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
      // Switch to runs tab to show progress
      setTab('runs');
      // Poll for completion
      const pollInterval = setInterval(async () => {
        await loadRuns(scenarioId);
      }, 3000);
      // Stop polling after 10 minutes
      setTimeout(() => clearInterval(pollInterval), 600_000);
    } catch (err) {
      console.error('Failed to start run', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExpandRun = async (runId: string) => {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
      setRunDetail(null);
      setCritique(null);
      return;
    }
    setExpandedRunId(runId);
    try {
      const detail = await api.get<TestRun>(`/api/test-runs/${runId}`);
      setRunDetail(detail);
      setCritique(detail.critique || null);
    } catch (err) {
      console.error('Failed to load run detail', err);
    }
  };

  const handleCritique = async (runId: string) => {
    try {
      const result = await api.post<any>(`/api/test-runs/${runId}/critique`, {});
      setCritique(result);
    } catch (err) {
      console.error('Failed to generate critique', err);
    }
  };

  const handleExport = (runId: string, verbose: boolean) => {
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/test-runs/${runId}/export?verbose=${verbose}`;
    window.open(url, '_blank');
  };

  const handleDeleteRun = async (runId: string) => {
    await api.delete(`/api/test-runs/${runId}`);
    if (selectedId) loadRuns(selectedId);
  };

  if (!open) return null;

  return (
    <FloatingPanel variant="modal" isOpen={open} onClose={onClose} width="min(1100px, 95vw)">
      <div className="test-runner">
        {/* ── Header ── */}
        <div className="test-runner__header">
          <div className="test-runner__header-left">
            <FlaskConical size={18} />
            <h2>Test Runner</h2>
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
                  onClick={() => { setSelectedId(s.id); setTab('scenario'); }}
                >
                  <div className="test-runner__scenario-name">
                    {s.latest_run?.passed === true && <CheckCircle2 size={12} className="test-runner__pass" />}
                    {s.latest_run?.passed === false && <XCircle size={12} className="test-runner__fail" />}
                    {s.latest_run?.status === 'running' && <Loader2 size={12} className="test-runner__running" />}
                    <span>{s.name}</span>
                  </div>
                  <div className="test-runner__scenario-meta">
                    <span className="test-runner__profile-badge">{s.user_profile}</span>
                    <span className="test-runner__run-count">{s.run_count} runs</span>
                  </div>
                </button>
              ))}
              {scenarios.length === 0 && (
                <div className="test-runner__empty">No test scenarios yet</div>
              )}
            </div>
          </div>

          {/* ── Right: Content ── */}
          <div className="test-runner__content">
            {!selectedId ? (
              <div className="test-runner__placeholder">
                <FlaskConical size={40} strokeWidth={1} />
                <p>Select a scenario or create a new one</p>
              </div>
            ) : (
              <>
                {/* Tab bar */}
                <div className="test-runner__tabs">
                  <button
                    className={`test-runner__tab ${tab === 'scenario' ? 'active' : ''}`}
                    onClick={() => setTab('scenario')}
                  >
                    📝 Scenario
                  </button>
                  <button
                    className={`test-runner__tab ${tab === 'runs' ? 'active' : ''}`}
                    onClick={() => setTab('runs')}
                  >
                    📊 Runs ({runs.length})
                  </button>
                  <div className="test-runner__tab-actions">
                    <button
                      className="test-runner__run-btn"
                      onClick={() => handleRun(selectedId!)}
                      disabled={loading}
                    >
                      {loading ? <Loader2 size={14} className="test-runner__running" /> : <Play size={14} />}
                      {loading ? 'Starting...' : 'Run Test'}
                    </button>
                  </div>
                </div>

                {/* ── Scenario Editor ── */}
                {tab === 'scenario' && (
                  <div className="test-runner__form">
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

                    {/* Completion % — hidden for explore mode */}
                    {projectMode !== 'explore' && (
                      <div className="test-runner__row">
                        <div className="test-runner__field">
                          <label>Stop at Completion %</label>
                          <input
                            type="number" min={0} max={100}
                            value={form.stop_on_completion_pct ?? ''}
                            onChange={e => setForm(f => ({
                              ...f,
                              stop_on_completion_pct: e.target.value ? parseInt(e.target.value) : null,
                            }))}
                            onBlur={handleSave}
                            placeholder="Optional"
                          />
                        </div>
                        <div className="test-runner__field">
                          <label>Pass Threshold %</label>
                          <input
                            type="number" min={0} max={100}
                            value={form.min_completion_pct}
                            onChange={e => setForm(f => ({ ...f, min_completion_pct: parseInt(e.target.value) || 0 }))}
                            onBlur={handleSave}
                          />
                        </div>
                      </div>
                    )}

                    {/* Goal dropdown — guided mode only */}
                    {goalsEnabled && goals.length > 0 && (
                      <div className="test-runner__field">
                        <label>Stop on Goal</label>
                        <select
                          value={form.stop_on_goal_id || ''}
                          onChange={e => { setForm(f => ({ ...f, stop_on_goal_id: e.target.value || null })); setTimeout(handleSave, 50); }}
                        >
                          <option value="">None</option>
                          {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
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

                {/* ── Runs Tab ── */}
                {tab === 'runs' && (
                  <div className="test-runner__runs">
                    {runs.length === 0 ? (
                      <div className="test-runner__placeholder">
                        <p>No runs yet. Click "Run Test" to start.</p>
                      </div>
                    ) : runs.map(run => (
                      <div key={run.id} className="test-runner__run">
                        <button
                          className="test-runner__run-header"
                          onClick={() => handleExpandRun(run.id)}
                        >
                          <div className="test-runner__run-status">
                            {run.status === 'completed' && run.passed && <CheckCircle2 size={14} className="test-runner__pass" />}
                            {run.status === 'completed' && !run.passed && <XCircle size={14} className="test-runner__fail" />}
                            {run.status === 'running' && <Loader2 size={14} className="test-runner__running" />}
                            {run.status === 'failed' && <XCircle size={14} className="test-runner__fail" />}
                            <span>{run.passed ? 'PASS' : run.status === 'running' ? 'Running...' : run.status === 'failed' ? 'FAILED' : 'FAIL'}</span>
                          </div>
                          <div className="test-runner__run-stats">
                            {run.synthetic_nps != null && <span style={{ color: run.synthetic_nps >= 9 ? '#22c55e' : run.synthetic_nps >= 7 ? '#eab308' : '#ef4444' }}>NPS: {run.synthetic_nps}/10</span>}
                            <span>{Math.round(run.completion_pct)}%</span>
                            <span>{run.rounds_completed} rnds</span>
                            <span>{new Date(run.started_at).toLocaleDateString()}</span>
                          </div>
                          {expandedRunId === run.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>

                        {expandedRunId === run.id && runDetail && (
                          <div className="test-runner__run-detail">
                            {/* Score Card */}
                            <div className="test-runner__score-card">
                              <div className="test-runner__score-item">
                                <span className="test-runner__score-label">Completion</span>
                                <span className="test-runner__score-value">{Math.round(runDetail.completion_pct)}%</span>
                              </div>
                              <div className="test-runner__score-item">
                                <span className="test-runner__score-label">Rounds</span>
                                <span className="test-runner__score-value">{runDetail.rounds_completed}</span>
                              </div>
                              <div className="test-runner__score-item">
                                <span className="test-runner__score-label">NPS</span>
                                <span className="test-runner__score-value" style={{
                                  color: runDetail.synthetic_nps != null
                                    ? runDetail.synthetic_nps >= 9 ? '#22c55e'
                                    : runDetail.synthetic_nps >= 7 ? '#eab308'
                                    : '#ef4444'
                                    : undefined
                                }}>{ runDetail.synthetic_nps ?? '—'}/10</span>
                              </div>
                              <div className="test-runner__score-item">
                                <span className="test-runner__score-label">Tokens</span>
                                <span className="test-runner__score-value">
                                  {((runDetail.total_tokens_in + runDetail.total_tokens_out) / 1000).toFixed(1)}K
                                </span>
                              </div>
                              <div className="test-runner__score-item">
                                <span className="test-runner__score-label">Tool Calls</span>
                                <span className="test-runner__score-value">{runDetail.tool_call_count}</span>
                              </div>
                              <div className="test-runner__score-item">
                                <span className="test-runner__score-label">Stop</span>
                                <span className="test-runner__score-value">{runDetail.stop_reason || '—'}</span>
                              </div>
                            </div>

                            {/* Sentiment */}
                            {runDetail.user_sentiment && (
                              <div className="test-runner__sentiment">
                                <span className="test-runner__sentiment-label">🧪 User says:</span>
                                <p>{runDetail.user_sentiment}</p>
                              </div>
                            )}

                            {/* Transcript */}
                            {Array.isArray(runDetail.transcript) && runDetail.transcript.length > 0 && (
                              <div className="test-runner__transcript">
                                <div className="test-runner__section-title">Transcript</div>
                                {(runDetail.transcript as any[]).map((r: any) => (
                                  <div key={r.round} className="test-runner__round">
                                    <div className="test-runner__round-header">Round {r.round}</div>
                                    <div className="test-runner__round-user">
                                      <span className="test-runner__avatar">🧪</span>
                                      <p>{r.user_msg}</p>
                                    </div>
                                    <div className="test-runner__round-agent">
                                      <span className="test-runner__avatar">🤖</span>
                                      <p>{r.agent_msg}</p>
                                    </div>
                                    {r.tool_calls?.length > 0 && (
                                      <div className="test-runner__round-tools">
                                        {r.tool_calls.map((tc: any, i: number) => (
                                          <span key={i} className="test-runner__tool-pill">{tc.name}</span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Actions */}
                            <div className="test-runner__run-actions">
                              <button onClick={() => handleCritique(run.id)}>
                                <Search size={14} /> {critique ? 'Regenerate Critique' : 'Generate Critique'}
                              </button>
                              {onReplay && runDetail?.transcript && Array.isArray(runDetail.transcript) && (
                                <button
                                  onClick={() => {
                                    onReplay(
                                      runDetail.transcript as any[],
                                      `${scenarios.find(s => s.id === run.scenario_id)?.name || 'Test'} — ${run.passed ? 'PASS' : 'FAIL'}`
                                    );
                                  }}
                                  style={{ color: '#a78bfa' }}
                                >
                                  <Play size={14} /> Replay in Chat
                                </button>
                              )}
                              <button onClick={() => handleExport(run.id, false)}>
                                <Download size={14} /> Export (Clean)
                              </button>
                              <button onClick={() => handleExport(run.id, true)}>
                                <Download size={14} /> Export (Verbose)
                              </button>
                              <button onClick={async () => {
                                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                                const res = await fetch(`${apiUrl}/api/test-runs/${run.id}/report/conversation`);
                                const data = await res.json();
                                const blob = new Blob([data.markdown], { type: 'text/markdown' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a'); a.href = url;
                                a.download = `report-conversation-${run.id.slice(0,8)}.md`;
                                a.click(); URL.revokeObjectURL(url);
                              }}>
                                <Download size={14} /> Report (.md)
                              </button>
                              <button onClick={async () => {
                                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                                const res = await fetch(`${apiUrl}/api/test-runs/${run.id}/report/detailed`);
                                const data = await res.json();
                                const blob = new Blob([data.markdown], { type: 'text/markdown' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a'); a.href = url;
                                a.download = `report-detailed-${run.id.slice(0,8)}.md`;
                                a.click(); URL.revokeObjectURL(url);
                              }}>
                                <Download size={14} /> Detailed Report (.md)
                              </button>
                              <button className="test-runner__delete-btn" onClick={() => handleDeleteRun(run.id)}>
                                <Trash2 size={14} /> Delete Run
                              </button>
                            </div>

                            {/* Critique */}
                            {critique && (
                              <div className="test-runner__critique">
                                <div className="test-runner__section-title">🔍 AI Critique</div>
                                <p className="test-runner__critique-summary">{critique.summary}</p>
                                {critique.suggestions?.map((s: any, i: number) => (
                                  <div key={i} className={`test-runner__suggestion test-runner__suggestion--${s.severity}`}>
                                    <div className="test-runner__suggestion-header">
                                      <span className="test-runner__suggestion-category">{s.category}</span>
                                      <span className={`test-runner__suggestion-severity test-runner__suggestion-severity--${s.severity}`}>
                                        {s.severity}
                                      </span>
                                    </div>
                                    <div className="test-runner__suggestion-title">{s.title}</div>
                                    <p className="test-runner__suggestion-detail">{s.detail}</p>
                                    <div className="test-runner__suggestion-action">→ {s.action}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
}

/**
 * SessionExplorer.tsx — Browse, filter, replay, and export all sessions.
 *
 * Top-level menu item: 📊 Sessions
 * Left: session list with source/status filters
 * Right: conversation view + event log + metrics
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api/client';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { ChatMessage } from '../ChatMessage/ChatMessage';
import {
  X, Download, Play, Filter, MessageSquare, Activity, BarChart3,
  ChevronRight, Clock, ArrowRight, CheckCircle2, XCircle, AlertCircle,
  Bot, User, Wrench, Target, Variable as VariableIcon, Navigation, Zap,
  Layers, Database, ThumbsUp, ShieldAlert, Shield, Loader2, ChevronDown, Trash2,
} from 'lucide-react';
import './SessionExplorer.css';

interface SessionSummary {
  id: string;
  project_id: string;
  persona_id: string | null;
  source_type: 'chat' | 'test' | 'api' | 'share';
  status: string;
  started_at: string;
  ended_at: string | null;
  user_id: string | null;
  metadata: Record<string, unknown>;
  summary: string | null;
  persona_name: string | null;
  message_count: number;
  variables_collected: number;
  goals_completed: number;
  nps_score: string | null;
}

interface SessionEvent {
  id: string;
  action_type: string;
  key: string;
  value: any;
  event_at: string;
}

interface Props {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onReplay: (transcript: any[], label: string) => void;
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  chat: { label: 'Chat', color: '#3b82f6' },
  test: { label: 'Test', color: '#a855f7' },
  api: { label: 'Production', color: '#f59e0b' },
  share: { label: 'Shared', color: '#10b981' },
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  user_message: <User size={12} />,
  assistant_message: <Bot size={12} />,
  tool_call: <Wrench size={12} />,
  traversal: <Navigation size={12} />,
  visit: <ArrowRight size={12} />,
  variable_set: <VariableIcon size={12} />,
  variable_rejected: <XCircle size={12} />,
  goal_completed: <Target size={12} />,
  goal_activated: <Target size={12} />,
  persona_switch: <Zap size={12} />,
  session_start: <Play size={12} />,
  session_end: <CheckCircle2 size={12} />,
  nps_score: <BarChart3 size={12} />,
  test_score: <BarChart3 size={12} />,
  test_result: <CheckCircle2 size={12} />,
};

const ACTION_COLORS: Record<string, string> = {
  user_message: '#3b82f6',
  assistant_message: '#10b981',
  tool_call: '#f59e0b',
  traversal: '#8b5cf6',
  visit: '#8b5cf6',
  variable_set: '#06b6d4',
  variable_rejected: '#ef4444',
  goal_completed: '#10b981',
  goal_activated: '#f59e0b',
  persona_switch: '#ec4899',
  session_start: '#6b7280',
  session_end: '#6b7280',
  nps_score: '#f59e0b',
  test_score: '#a855f7',
  test_result: '#a855f7',
};

type Tab = 'conversation' | 'events' | 'metrics' | 'variables';

export function SessionExplorer({ projectId, open, onClose, onReplay }: Props) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('conversation');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<Set<string>>(new Set());
  const [exportDropdown, setExportDropdown] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [collectionVars, setCollectionVars] = useState<any>(null);
  const [varsLoading, setVarsLoading] = useState(false);
  const [metricsData, setMetricsData] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [expandedScorer, setExpandedScorer] = useState<string | null>(null);
  const [expandedVarId, setExpandedVarId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  // ── Load sessions ──
  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      // 'tests' filter combines chat + test source types
      if (sourceFilter === 'tests') {
        params.set('source', 'chat,test');
      } else if (sourceFilter !== 'all') {
        params.set('source', sourceFilter);
      }

      const data = await api.get<any>(`/api/projects/${projectId}/sessions?${params}`);
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, sourceFilter]);

  useEffect(() => {
    if (open) loadSessions();
  }, [open, loadSessions]);

  // ── Load events for selected session ──
  useEffect(() => {
    if (!selectedSessionId) return;
    setEventsLoading(true);
    setCollectionVars(null);
    api.get<any>(`/api/sessions/${selectedSessionId}/events`)
      .then(data => setEvents(data.events || []))
      .catch(err => console.error('Failed to load events', err))
      .finally(() => setEventsLoading(false));
  }, [selectedSessionId]);

  // ── Load collection variables when variables tab is selected ──
  useEffect(() => {
    if (tab !== 'variables' || !selectedSessionId || collectionVars) return;
    setVarsLoading(true);
    api.get<any>(`/api/sessions/${selectedSessionId}/variables`)
      .then(data => setCollectionVars(data))
      .catch(err => console.error('Failed to load variables', err))
      .finally(() => setVarsLoading(false));
  }, [tab, selectedSessionId, collectionVars]);

  // ── Load scorer metrics when metrics tab is selected ──
  useEffect(() => {
    if (tab !== 'metrics' || !selectedSessionId) return;
    setMetricsLoading(true);
    api.get<any>(`/api/sessions/${selectedSessionId}/metrics`)
      .then(data => setMetricsData(data))
      .catch(err => console.error('Failed to load metrics', err))
      .finally(() => setMetricsLoading(false));
  }, [tab, selectedSessionId]);

  // ── Score session on demand ──
  const handleScoreSession = async () => {
    if (!selectedSessionId || scoring) return;
    setScoring(true);
    try {
      await api.post<any>(`/api/sessions/${selectedSessionId}/score`, {});
      // Refresh metrics after scoring
      const data = await api.get<any>(`/api/sessions/${selectedSessionId}/metrics`);
      setMetricsData(data);
    } catch (err) {
      console.error('Failed to score session', err);
    } finally {
      setScoring(false);
    }
  };

  // ── Replay ──
  const handleReplay = async () => {
    if (!selectedSessionId) return;
    try {
      const data = await api.get<any>(`/api/sessions/${selectedSessionId}/replay`);
      const session = sessions.find(s => s.id === selectedSessionId);
      const label = session?.persona_name || session?.source_type || 'Session';
      onReplay(data.rounds || [], `Replay: ${label}`);
      onClose();
    } catch (err) {
      console.error('Failed to load replay', err);
    }
  };

  // ── Export ──
  const handleExport = async (format: 'markdown' | 'csv', conversationOnly: boolean) => {
    if (!selectedSessionId) return;
    setExportDropdown(false);

    const params = new URLSearchParams({ format });
    if (conversationOnly) {
      params.set('actions', 'user_message,assistant_message');
    }

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    window.open(`${apiBase}/api/sessions/${selectedSessionId}/export?${params}`, '_blank');
  };

  // ── Filtered events ──
  const filteredEvents = eventFilter.size > 0
    ? events.filter(e => eventFilter.has(e.action_type))
    : events;

  const conversationEvents = events.filter(
    e => e.action_type === 'user_message' || e.action_type === 'assistant_message'
  );

  // ── Event type counts for filter checkboxes ──
  const eventTypeCounts: Record<string, number> = {};
  for (const e of events) {
    eventTypeCounts[e.action_type] = (eventTypeCounts[e.action_type] || 0) + 1;
  }

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'Active';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  if (!open) return null;

  return (
    <FloatingPanel variant="modal" isOpen={open} onClose={onClose} width="min(1200px, 95vw)">
      <div className="session-explorer" data-testid="session-explorer">
        {/* ── Header ── */}
        <div className="session-explorer__header">
          <div className="session-explorer__header-left">
            <h2 className="nords-panel-title"><Activity size={18} strokeWidth={1.6} />Sessions</h2>
            <span className="session-explorer__count">{sessions.length}</span>
          </div>
          <div className="session-explorer__header-actions">
            {sessions.length > 0 && (
              <button
                className="session-explorer__clear-btn"
                disabled={clearing}
                onClick={async () => {
                  if (!confirm(`Clear ${sourceFilter === 'all' ? 'ALL' : sourceFilter} sessions? This cannot be undone.`)) return;
                  setClearing(true);
                  try {
                    const params = sourceFilter !== 'all' && sourceFilter !== 'tests'
                      ? `?source=${sourceFilter}`
                      : sourceFilter === 'tests'
                        ? '?source=chat,test'
                        : '';
                    await api.delete(`/api/projects/${projectId}/sessions${params}`);
                    setSessions([]);
                    setSelectedSessionId(null);
                    setEvents([]);
                  } catch (err) {
                    console.error('Failed to clear sessions', err);
                  } finally {
                    setClearing(false);
                  }
                }}
                title={`Clear ${sourceFilter === 'all' ? 'all' : sourceFilter} sessions`}
              >
                <Trash2 size={14} />
                {clearing ? 'Clearing…' : 'Clear All'}
              </button>
            )}
            <button className="session-explorer__close" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="session-explorer__body">
          {/* ── Left: Session List ── */}
          <div className="session-explorer__list">
            {/* Source filter pills */}
            <div className="session-explorer__filters">
              {[
                { key: 'all', label: 'All' },
                { key: 'tests', label: 'Tests' },
                { key: 'api', label: 'Production' },
                { key: 'share', label: 'Shared' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`session-explorer__filter-pill ${sourceFilter === key ? 'active' : ''}`}
                  onClick={() => setSourceFilter(key)}
                  data-testid={`filter-${key}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Session rows */}
            <div className="session-explorer__list-scroll">
              {loading ? (
                <div className="session-explorer__empty">Loading sessions...</div>
              ) : sessions.length === 0 ? (
                <div className="session-explorer__empty">No sessions found</div>
              ) : (
                sessions.map(s => (
                  <button
                    key={s.id}
                    className={`session-explorer__session-row ${selectedSessionId === s.id ? 'selected' : ''}`}
                    onClick={() => setSelectedSessionId(s.id)}
                    data-testid={`session-row-${s.id.slice(0, 8)}`}
                  >
                    <div className="session-explorer__session-top">
                      <span
                        className="session-explorer__source-badge"
                        style={{ backgroundColor: SOURCE_LABELS[s.source_type]?.color || '#6b7280' }}
                      >
                        {SOURCE_LABELS[s.source_type]?.label || s.source_type}
                      </span>
                      <span className="session-explorer__session-time">
                        {formatTime(s.started_at)}
                      </span>
                    </div>
                    <div className="session-explorer__session-meta">
                      {s.persona_name && (
                        <span className="session-explorer__session-persona">{s.persona_name}</span>
                      )}
                      <span className="session-explorer__session-stat">
                        <MessageSquare size={10} /> {s.message_count}
                      </span>
                      {s.variables_collected > 0 && (
                        <span className="session-explorer__session-stat">
                          <VariableIcon size={10} /> {s.variables_collected}
                        </span>
                      )}
                      {s.nps_score && (
                        <span className="session-explorer__session-stat session-explorer__nps">
                          NPS {s.nps_score}
                        </span>
                      )}
                    </div>
                    <div className="session-explorer__session-duration">
                      <Clock size={10} /> {formatDuration(s.started_at, s.ended_at)}
                      {s.status === 'completed' && <CheckCircle2 size={10} className="session-explorer__status-icon--completed" />}
                      {s.status === 'abandoned' && <AlertCircle size={10} className="session-explorer__status-icon--abandoned" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── Right: Detail Panel ── */}
          <div className="session-explorer__detail">
            {!selectedSessionId ? (
              <div className="session-explorer__empty-detail">
                <Activity size={32} strokeWidth={1} style={{ opacity: 0.3 }} />
                <p>Select a session to view details</p>
              </div>
            ) : (
              <>
                {/* Action bar */}
                <div className="session-explorer__actions">
                  <div className="session-explorer__tabs">
                    <button
                      className={`session-explorer__tab ${tab === 'conversation' ? 'active' : ''}`}
                      onClick={() => setTab('conversation')}
                    >
                      <MessageSquare size={13} /> Conversation
                    </button>
                    <button
                      className={`session-explorer__tab ${tab === 'events' ? 'active' : ''}`}
                      onClick={() => setTab('events')}
                    >
                      <Activity size={13} /> Events ({events.length})
                    </button>
                    <button
                      className={`session-explorer__tab ${tab === 'metrics' ? 'active' : ''}`}
                      onClick={() => setTab('metrics')}
                    >
                      <BarChart3 size={13} /> Metrics
                    </button>
                    <button
                      className={`session-explorer__tab ${tab === 'variables' ? 'active' : ''}`}
                      onClick={() => setTab('variables')}
                    >
                      <Database size={13} /> Collection
                    </button>
                  </div>
                  <div className="session-explorer__action-btns">
                    <button className="session-explorer__action-btn" onClick={handleReplay} title="Replay in Preview Chat">
                      <Play size={13} /> Replay
                    </button>
                    <div style={{ position: 'relative' }} ref={exportRef}>
                      <button className="session-explorer__action-btn" onClick={() => setExportDropdown(!exportDropdown)} title="Export">
                        <Download size={13} /> Export
                      </button>
                      {exportDropdown && (
                        <>
                          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setExportDropdown(false)} />
                          <div className="session-explorer__export-dropdown">
                            <button onClick={() => handleExport('markdown', true)}>Markdown — Conversation Only</button>
                            <button onClick={() => handleExport('markdown', false)}>Markdown — Everything</button>
                            <button onClick={() => handleExport('csv', true)}>CSV — Conversation Only</button>
                            <button onClick={() => handleExport('csv', false)}>CSV — Everything</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tab content */}
                <div className="session-explorer__content">
                  {eventsLoading ? (
                    <div className="session-explorer__empty">Loading events...</div>
                  ) : tab === 'conversation' ? (
                    <div className="session-explorer__conversation">
                      {conversationEvents.length === 0 ? (
                        <div className="session-explorer__empty">No messages in this session</div>
                      ) : (
                        conversationEvents.map(e => (
                          <ChatMessage
                            key={e.id}
                            role={e.action_type === 'user_message' ? 'user' : 'assistant'}
                            content={e.value?.text || e.key || ''}
                            timestamp={new Date(e.event_at).toLocaleTimeString()}
                            compact
                          />
                        ))
                      )}
                    </div>
                  ) : tab === 'events' ? (
                    <div className="session-explorer__events-panel">
                      {/* Event type filter checkboxes */}
                      <div className="session-explorer__event-filters">
                        <span className="session-explorer__event-filters-label">
                          <Filter size={11} /> Filter:
                        </span>
                        {Object.entries(eventTypeCounts).map(([type, count]) => (
                          <label key={type} className="session-explorer__event-filter-check">
                            <input
                              type="checkbox"
                              checked={eventFilter.size === 0 || eventFilter.has(type)}
                              onChange={() => {
                                setEventFilter(prev => {
                                  const next = new Set(prev);
                                  if (next.has(type)) {
                                    next.delete(type);
                                  } else {
                                    next.add(type);
                                  }
                                  return next;
                                });
                              }}
                            />
                            <span
                              className="session-explorer__event-type-dot"
                              style={{ backgroundColor: ACTION_COLORS[type] || '#6b7280' }}
                            />
                            {type.replace(/_/g, ' ')} ({count})
                          </label>
                        ))}
                      </div>

                      {/* Event list */}
                      <div className="session-explorer__event-list">
                        {filteredEvents.map(e => (
                          <div key={e.id} className="session-explorer__event-row">
                            <span className="session-explorer__event-time">
                              {new Date(e.event_at).toLocaleTimeString()}
                            </span>
                            <span
                              className="session-explorer__event-badge"
                              style={{ backgroundColor: ACTION_COLORS[e.action_type] || '#6b7280' }}
                            >
                              {ACTION_ICONS[e.action_type] || <ChevronRight size={10} />}
                              {e.action_type.replace(/_/g, ' ')}
                            </span>
                            <span className="session-explorer__event-key">{e.key}</span>
                            <details className="session-explorer__event-value-toggle">
                              <summary>json</summary>
                              <pre className="session-explorer__event-value-json">
                                {JSON.stringify(e.value, null, 2)}
                              </pre>
                            </details>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : tab === 'metrics' ? (
                    /* Metrics tab — scorer plugin cards */
                    <div className="session-explorer__metrics">
                      {metricsLoading ? (
                        <div className="session-explorer__empty">Loading metrics...</div>
                      ) : !metricsData ? (
                        <div className="session-explorer__empty">
                          <BarChart3 size={24} strokeWidth={1} style={{ opacity: 0.3 }} />
                          <p>Select a session to view metrics</p>
                        </div>
                      ) : (
                        <>
                          {/* Score Session button */}
                          {!metricsData.has_been_scored && (
                            <div className="session-explorer__score-cta">
                              <button
                                className="session-explorer__score-btn"
                                onClick={handleScoreSession}
                                disabled={scoring}
                              >
                                {scoring ? (
                                  <><Loader2 size={14} className="spin" /> Scoring…</>
                                ) : (
                                  <><BarChart3 size={14} /> Score This Session</>
                                )}
                              </button>
                              <span className="session-explorer__score-hint">
                                Runs hallucination, guardrail, and NPS analysis (~30s)
                              </span>
                            </div>
                          )}

                          {/* Scorer plugin cards */}
                          <div className="session-explorer__scorer-grid">
                            {(metricsData.scorers || []).map((scorer: any) => {
                              const result = scorer.result;
                              const score = result?.score;
                              const isExpanded = expandedScorer === scorer.key;

                              // Color coding: green ≥7, yellow 4-6, red ≤3
                              const scoreColor = score == null ? '#6b7280'
                                : score >= 7 ? '#10b981'
                                : score >= 4 ? '#f59e0b'
                                : '#ef4444';

                              const ScorerIcon = scorer.icon === 'Activity' ? Activity
                                : scorer.icon === 'Navigation' ? Navigation
                                : scorer.icon === 'ThumbsUp' ? ThumbsUp
                                : scorer.icon === 'ShieldAlert' ? ShieldAlert
                                : scorer.icon === 'Shield' ? Shield
                                : scorer.icon === 'CheckCircle' ? CheckCircle2
                                : BarChart3;

                              return (
                                <div
                                  key={scorer.key}
                                  className={`session-explorer__scorer-card ${isExpanded ? 'expanded' : ''} ${!result ? 'unscored' : ''}`}
                                  onClick={() => setExpandedScorer(isExpanded ? null : scorer.key)}
                                >
                                  <div className="session-explorer__scorer-header">
                                    <div className="session-explorer__scorer-icon" style={{ color: scoreColor }}>
                                      <ScorerIcon size={16} />
                                    </div>
                                    <div className="session-explorer__scorer-info">
                                      <span className="session-explorer__scorer-label">{scorer.label}</span>
                                      <span className="session-explorer__scorer-desc">{scorer.description}</span>
                                    </div>
                                    <div className="session-explorer__scorer-score" style={{ color: scoreColor }}>
                                      {score != null ? (
                                        <span className="session-explorer__score-badge">{score}/10</span>
                                      ) : (
                                        <span className="session-explorer__score-na">
                                          {!result ? '—' : 'N/A'}
                                        </span>
                                      )}
                                    </div>
                                    {result && (
                                      <ChevronDown size={14} className={`session-explorer__scorer-chevron ${isExpanded ? 'rotated' : ''}`} />
                                    )}
                                  </div>

                                  {/* Expanded details */}
                                  {isExpanded && result && (
                                    <div className="session-explorer__scorer-details">
                                      {result.details && (
                                        <div className="session-explorer__scorer-detail-text">
                                          {result.details}
                                        </div>
                                      )}
                                      {result.passed != null && (
                                        <div className={`session-explorer__scorer-status ${result.passed ? 'pass' : 'fail'}`}>
                                          {result.passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                          {result.passed ? 'Passed' : 'Issues detected'}
                                        </div>
                                      )}
                                      {/* Engagement metadata: show event counts */}
                                      {scorer.key === 'engagement' && result.metadata && (
                                        <div className="session-explorer__engagement-stats">
                                          <div className="session-explorer__stat-row">
                                            <span>Messages</span><span>{result.metadata.messages || 0}</span>
                                          </div>
                                          <div className="session-explorer__stat-row">
                                            <span>Tool Calls</span><span>{result.metadata.tool_calls || 0}</span>
                                          </div>
                                          <div className="session-explorer__stat-row">
                                            <span>Variables Set</span><span>{result.metadata.variables_set || 0}</span>
                                          </div>
                                          <div className="session-explorer__stat-row">
                                            <span>Goals Completed</span><span>{result.metadata.goals_completed || 0}</span>
                                          </div>
                                          <div className="session-explorer__stat-row">
                                            <span>Traversals</span><span>{result.metadata.traversals || 0}</span>
                                          </div>
                                          <div className="session-explorer__stat-row">
                                            <span>Rounds</span><span>{result.metadata.rounds || 0}</span>
                                          </div>
                                          <div className="session-explorer__stat-row">
                                            <span>Tokens (in/out)</span>
                                            <span>{(result.metadata.total_tokens_in || 0).toLocaleString()} / {(result.metadata.total_tokens_out || 0).toLocaleString()}</span>
                                          </div>
                                          <div className="session-explorer__stat-row">
                                            <span>Avg Latency</span><span>{result.metadata.avg_latency_ms || 0}ms</span>
                                          </div>
                                        </div>
                                      )}
                                      {/* Nav health: show flags */}
                                      {scorer.key === 'nav_health' && result.metadata?.flags?.length > 0 && (
                                        <div className="session-explorer__nav-flags">
                                          {result.metadata.flags.map((flag: string, i: number) => (
                                            <div key={i} className="session-explorer__nav-flag">
                                              <AlertCircle size={12} />
                                              {flag}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {/* Completion: goal progress + variable breakdown */}
                                      {scorer.key === 'completion' && result.metadata && (
                                        <div className="session-explorer__completion-stats">
                                          {/* Goal progress */}
                                          {(result.metadata.goals_total as number) > 0 && (
                                            <div className="session-explorer__completion-section">
                                              <div className="session-explorer__completion-section-title">Goals</div>
                                              <div className="session-explorer__progress-bar-row">
                                                <span>{result.metadata.goals_completed as number}/{result.metadata.goals_total as number}</span>
                                                <div className="session-explorer__progress-track">
                                                  <div className="session-explorer__progress-fill" style={{
                                                    width: `${result.metadata.goal_pct || 0}%`,
                                                    background: (result.metadata.goal_pct as number) === 100 ? '#10b981' : '#f59e0b',
                                                  }} />
                                                </div>
                                                <span className="session-explorer__progress-pct">{result.metadata.goal_pct || 0}%</span>
                                              </div>
                                              {(result.metadata.goal_names as any[])?.map((g: any, i: number) => (
                                                <div key={i} className={`session-explorer__goal-item ${g.status}`}>
                                                  {g.status === 'complete' ? <CheckCircle2 size={11} /> : g.status === 'active' ? <Target size={11} /> : <XCircle size={11} />}
                                                  <span>{g.name}</span>
                                                  <span className="session-explorer__goal-status">{g.status}</span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                          {/* Required vars */}
                                          {(result.metadata.required_total as number) > 0 && (
                                            <div className="session-explorer__completion-section">
                                              <div className="session-explorer__completion-section-title">Required Variables</div>
                                              <div className="session-explorer__progress-bar-row">
                                                <span>{result.metadata.required_filled as number}/{result.metadata.required_total as number}</span>
                                                <div className="session-explorer__progress-track">
                                                  <div className="session-explorer__progress-fill" style={{
                                                    width: `${result.metadata.required_pct || 0}%`,
                                                    background: (result.metadata.required_pct as number) === 100 ? '#10b981' : '#ef4444',
                                                  }} />
                                                </div>
                                                <span className="session-explorer__progress-pct">{result.metadata.required_pct || 0}%</span>
                                              </div>
                                              {(result.metadata.missing_required as string[])?.length > 0 && (
                                                <div className="session-explorer__missing-vars">
                                                  <span className="session-explorer__missing-label">Missing:</span>
                                                  {(result.metadata.missing_required as string[]).map((name, i) => (
                                                    <span key={i} className="session-explorer__missing-pill">{name}</span>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                          {/* Optional vars */}
                                          {(result.metadata.optional_total as number) > 0 && (
                                            <div className="session-explorer__completion-section">
                                              <div className="session-explorer__completion-section-title">Optional Variables</div>
                                              <div className="session-explorer__progress-bar-row">
                                                <span>{result.metadata.optional_filled as number}/{result.metadata.optional_total as number}</span>
                                                <div className="session-explorer__progress-track">
                                                  <div className="session-explorer__progress-fill" style={{
                                                    width: `${result.metadata.optional_pct || 0}%`,
                                                    background: '#3b82f6',
                                                  }} />
                                                </div>
                                                <span className="session-explorer__progress-pct">{result.metadata.optional_pct || 0}%</span>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  ) : tab === 'variables' ? (
                    /* Collection Variables tab — flat list */
                    <div className="session-explorer__variables">
                      {varsLoading ? (
                        <div className="session-explorer__empty">Loading collection data...</div>
                      ) : !collectionVars || collectionVars.total_collected === 0 ? (
                        <div className="session-explorer__empty">
                          <Database size={24} strokeWidth={1} style={{ opacity: 0.3 }} />
                          <p>No variables collected in this session</p>
                        </div>
                      ) : (
                        <>
                          <div className="session-explorer__vars-summary">
                            <span>{collectionVars.total_collected} variable{collectionVars.total_collected !== 1 ? 's' : ''} collected</span>
                          </div>
                          <div className="session-explorer__var-flat-list">
                            {(collectionVars.variables || []).map((v: any) => {
                              const isExpanded = expandedVarId === v.id;
                              const displayValue = typeof v.value === 'object' ? JSON.stringify(v.value) : String(v.value);
                              return (
                                <div
                                  key={v.id}
                                  className={`session-explorer__var-row ${isExpanded ? 'expanded' : ''}`}
                                  onClick={() => setExpandedVarId(isExpanded ? null : v.id)}
                                >
                                  {/* Collapsed: Category: Variable = "value" */}
                                  <div className="session-explorer__var-row-header">
                                    <span className="session-explorer__var-category" style={{ color: v.group_color || '#a78bfa' }}>
                                      {v.group_name}:
                                    </span>
                                    <span className="session-explorer__var-label">{v.name}</span>
                                    <span className="session-explorer__var-eq">=</span>
                                    <span className="session-explorer__var-val">"{displayValue}"</span>
                                    <ChevronDown size={12} className={`session-explorer__var-chevron ${isExpanded ? 'rotated' : ''}`} />
                                  </div>

                                  {/* Expanded: description + conversation */}
                                  {isExpanded && (
                                    <div className="session-explorer__var-expanded">
                                      {v.description && (
                                        <div className="session-explorer__var-description">
                                          {v.description}
                                        </div>
                                      )}
                                      {v.conversation && (
                                        <div className="session-explorer__var-convo">
                                          <div className="session-explorer__var-convo-label">Collection Round</div>
                                          <div className="session-explorer__var-convo-bubble user">
                                            <User size={10} />
                                            <span>{v.conversation.user_message}</span>
                                          </div>
                                          <div className="session-explorer__var-convo-bubble agent">
                                            <Bot size={10} />
                                            <span>{v.conversation.agent_response}</span>
                                          </div>
                                        </div>
                                      )}
                                      {!v.description && !v.conversation && (
                                        <div className="session-explorer__var-no-context">
                                          No additional context available
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
}

export default SessionExplorer;

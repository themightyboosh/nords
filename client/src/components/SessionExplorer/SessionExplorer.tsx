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
  Layers, Database,
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
          <button className="session-explorer__close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
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
                    /* Metrics tab */
                    <div className="session-explorer__metrics">
                      <div className="session-explorer__metrics-grid">
                        <div className="session-explorer__metric-card">
                          <span className="session-explorer__metric-label">Source</span>
                          <span className="session-explorer__metric-value" style={{ color: SOURCE_LABELS[selectedSession?.source_type || 'chat']?.color }}>
                            {SOURCE_LABELS[selectedSession?.source_type || 'chat']?.label}
                          </span>
                        </div>
                        <div className="session-explorer__metric-card">
                          <span className="session-explorer__metric-label">Messages</span>
                          <span className="session-explorer__metric-value">{eventTypeCounts['user_message'] || 0}</span>
                        </div>
                        <div className="session-explorer__metric-card">
                          <span className="session-explorer__metric-label">Tool Calls</span>
                          <span className="session-explorer__metric-value">{eventTypeCounts['tool_call'] || 0}</span>
                        </div>
                        <div className="session-explorer__metric-card">
                          <span className="session-explorer__metric-label">Variables Set</span>
                          <span className="session-explorer__metric-value">{eventTypeCounts['variable_set'] || 0}</span>
                        </div>
                        <div className="session-explorer__metric-card">
                          <span className="session-explorer__metric-label">Goals Completed</span>
                          <span className="session-explorer__metric-value">{eventTypeCounts['goal_completed'] || 0}</span>
                        </div>
                        <div className="session-explorer__metric-card">
                          <span className="session-explorer__metric-label">Traversals</span>
                          <span className="session-explorer__metric-value">{eventTypeCounts['traversal'] || 0}</span>
                        </div>
                        <div className="session-explorer__metric-card">
                          <span className="session-explorer__metric-label">Duration</span>
                          <span className="session-explorer__metric-value">
                            {selectedSession ? formatDuration(selectedSession.started_at, selectedSession.ended_at) : '—'}
                          </span>
                        </div>
                        {selectedSession?.nps_score && (
                          <div className="session-explorer__metric-card">
                            <span className="session-explorer__metric-label">NPS Score</span>
                            <span className="session-explorer__metric-value session-explorer__nps-big">
                              {selectedSession.nps_score}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Event breakdown */}
                      <h4 className="session-explorer__metrics-section-title">Event Breakdown</h4>
                      <div className="session-explorer__event-breakdown">
                        {(() => {
                          const maxCount = Math.max(...Object.values(eventTypeCounts), 1);
                          return Object.entries(eventTypeCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([type, count]) => (
                              <div key={type} className="session-explorer__breakdown-row">
                                <span
                                  className="session-explorer__event-type-dot"
                                  style={{ backgroundColor: ACTION_COLORS[type] || '#6b7280' }}
                                />
                                <span className="session-explorer__breakdown-label">{type.replace(/_/g, ' ')}</span>
                                <span className="session-explorer__breakdown-count">{count}</span>
                                <div className="session-explorer__breakdown-track">
                                  <div className="session-explorer__breakdown-bar" style={{
                                    width: `${(count / maxCount) * 100}%`,
                                    backgroundColor: ACTION_COLORS[type] || '#6b7280',
                                  }} />
                                </div>
                              </div>
                            ));
                        })()}
                      </div>
                    </div>
                  ) : tab === 'variables' ? (
                    /* Collection Variables tab */
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
                            <span>{collectionVars.total_collected} variables collected across {collectionVars.groups.length} group{collectionVars.groups.length !== 1 ? 's' : ''}</span>
                          </div>
                          {collectionVars.groups.map((group: any) => (
                            <div key={group.id || 'ungrouped'} className="session-explorer__var-group">
                              <div className="session-explorer__var-group-header">
                                <span
                                  className="session-explorer__var-group-icon"
                                  style={{ color: group.color || '#a78bfa' }}
                                >
                                  <Layers size={14} />
                                </span>
                                <span className="session-explorer__var-group-name">{group.name}</span>
                                <span className="session-explorer__var-group-count">{group.variables.length}</span>
                              </div>
                              <div className="session-explorer__var-list">
                                {group.variables.map((v: any) => (
                                  <div key={v.id} className="session-explorer__var-item">
                                    <div className="session-explorer__var-top">
                                      <span className="session-explorer__var-name">{v.name}</span>
                                      <span className="session-explorer__var-value">
                                        {typeof v.value === 'object' ? JSON.stringify(v.value) : String(v.value)}
                                      </span>
                                    </div>
                                    {v.description && (
                                      <div className="session-explorer__var-desc">{v.description}</div>
                                    )}
                                    <div className="session-explorer__var-meta">
                                      <span className="session-explorer__var-type">{v.type}</span>
                                      {v.collected_at_nord && (
                                        <span className="session-explorer__var-nord">at {v.collected_at_nord}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
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

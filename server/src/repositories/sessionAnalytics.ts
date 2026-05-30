/**
 * sessionAnalytics.ts — Aggregated analytics for MCP sessions.
 *
 * Provides insight into:
 * - Session metrics (duration, completion, tool calls)
 * - Traversal heatmap (most/least visited nords)
 * - Bottleneck detection (nords where users get stuck)
 * - Persona usage distribution
 * - Path analysis (common routes through the graph)
 */

import { query, queryOne } from '../db.js';

export interface SessionSummary {
  id: string;
  started_at: Date;
  ended_at: Date | null;
  status: string;
  persona_name: string | null;
  duration_minutes: number | null;
  traversal_count: number;
  visit_count: number;
  nords_tracked: number;
  nords_completed: number;
  completion_percentage: number;
  message_count: number;
  total_tokens_in: number;
  total_tokens_out: number;
}

export interface NordHeatmapEntry {
  nord_id: string;
  nord_title: string;
  type_name: string;
  visit_count: number;
  avg_time_seconds: number | null;
  completion_rate: number; // 0.0–1.0 across sessions
}

export interface PathSegment {
  source_title: string;
  target_title: string;
  traversal_count: number;
  connection_type: string;
}

export interface ProjectAnalytics {
  overview: {
    total_sessions: number;
    completed_sessions: number;
    avg_completion_pct: number;
    avg_duration_minutes: number | null;
    total_traversals: number;
    total_messages: number;
    total_tokens: { in: number; out: number };
  };
  sessions: SessionSummary[];
  nord_heatmap: NordHeatmapEntry[];
  popular_paths: PathSegment[];
  persona_distribution: Array<{ persona_name: string; session_count: number }>;
  bottlenecks: NordHeatmapEntry[]; // nords with high visits but low completion
}

/**
 * Get full analytics for a project's MCP sessions.
 */
export async function getProjectAnalytics(projectId: string, limit = 50): Promise<ProjectAnalytics> {

  // ── Session Summaries ──
  const sessions = await query<SessionSummary>(`
    SELECT
      s.id,
      s.started_at,
      s.ended_at,
      s.status,
      p.name AS persona_name,
      CASE WHEN s.ended_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) / 60.0
        ELSE NULL
      END AS duration_minutes,
      (SELECT COUNT(*) FROM mcp_traversals t WHERE t.session_id = s.id)::int AS traversal_count,
      (SELECT COUNT(*) FROM mcp_nord_visits v WHERE v.session_id = s.id)::int AS visit_count,
      (SELECT COUNT(*) FROM mcp_session_variables sv WHERE sv.session_id = s.id)::int AS nords_tracked,
      (SELECT COUNT(*) FROM mcp_session_variables sv WHERE sv.session_id = s.id AND sv.value IS NOT NULL)::int AS nords_completed,
      CASE
        WHEN (SELECT COUNT(*) FROM mcp_session_variables sv WHERE sv.session_id = s.id) > 0
        THEN ROUND(
          (SELECT COUNT(*) FROM mcp_session_variables sv WHERE sv.session_id = s.id AND sv.value IS NOT NULL)::numeric /
          (SELECT COUNT(*) FROM mcp_session_variables sv WHERE sv.session_id = s.id)::numeric * 100
        )::int
        ELSE 100
      END AS completion_percentage,
      COALESCE((SELECT COUNT(*) FROM mcp_messages m WHERE m.session_id = s.id), 0)::int AS message_count,
      COALESCE((SELECT SUM(m.tokens_in) FROM mcp_messages m WHERE m.session_id = s.id), 0)::int AS total_tokens_in,
      COALESCE((SELECT SUM(m.tokens_out) FROM mcp_messages m WHERE m.session_id = s.id), 0)::int AS total_tokens_out
    FROM mcp_sessions s
    LEFT JOIN personas p ON p.id = s.persona_id
    WHERE s.project_id = $1
    ORDER BY s.started_at DESC
    LIMIT $2
  `, [projectId, limit]);

  // ── Overview Aggregation ──
  const overview = {
    total_sessions: sessions.length,
    completed_sessions: sessions.filter(s => s.status === 'completed').length,
    avg_completion_pct: sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.completion_percentage, 0) / sessions.length)
      : 0,
    avg_duration_minutes: (() => {
      const withDuration = sessions.filter(s => s.duration_minutes !== null);
      if (withDuration.length === 0) return null;
      return Math.round(withDuration.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / withDuration.length);
    })(),
    total_traversals: sessions.reduce((sum, s) => sum + s.traversal_count, 0),
    total_messages: sessions.reduce((sum, s) => sum + s.message_count, 0),
    total_tokens: {
      in: sessions.reduce((sum, s) => sum + s.total_tokens_in, 0),
      out: sessions.reduce((sum, s) => sum + s.total_tokens_out, 0),
    },
  };

  // ── Nord Heatmap (most visited nords across all sessions) ──
  const nord_heatmap = await query<NordHeatmapEntry>(`
    SELECT
      n.id AS nord_id,
      n.title AS nord_title,
      nt.name AS type_name,
      COUNT(DISTINCT v.id)::int AS visit_count,
      AVG(
        CASE WHEN v2.visited_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (v2.visited_at - v.visited_at))
          ELSE NULL
        END
      )::int AS avg_time_seconds,
      0::numeric AS completion_rate
    FROM nords n
    JOIN nord_types nt ON nt.id = n.type_id
    LEFT JOIN mcp_nord_visits v ON v.nord_id = n.id
      AND v.session_id IN (SELECT id FROM mcp_sessions WHERE project_id = $1)
    LEFT JOIN mcp_nord_visits v2 ON v2.session_id = v.session_id
      AND v2.visited_at > v.visited_at
      AND v2.id = (
        SELECT id FROM mcp_nord_visits
        WHERE session_id = v.session_id AND visited_at > v.visited_at
        ORDER BY visited_at ASC LIMIT 1
      )
    WHERE n.project_id = $1 AND n.deleted_at IS NULL
    GROUP BY n.id, n.title, nt.name
    ORDER BY visit_count DESC
    LIMIT 50
  `, [projectId]);

  // ── Popular Paths (most traversed edges) ──
  const popular_paths = await query<PathSegment>(`
    SELECT
      sn.title AS source_title,
      tn.title AS target_title,
      COUNT(*)::int AS traversal_count,
      ct.name AS connection_type
    FROM mcp_traversals t
    JOIN mcp_sessions s ON s.id = t.session_id
    JOIN nords sn ON sn.id = t.source_nord_id
    JOIN nords tn ON tn.id = t.target_nord_id
    JOIN connections c ON c.id = t.connection_id
    JOIN connection_types ct ON ct.id = c.type_id
    WHERE s.project_id = $1
    GROUP BY sn.title, tn.title, ct.name
    ORDER BY traversal_count DESC
    LIMIT 20
  `, [projectId]);

  // ── Persona Distribution ──
  const persona_distribution = await query<{ persona_name: string; session_count: number }>(`
    SELECT
      COALESCE(p.name, 'No persona') AS persona_name,
      COUNT(*)::int AS session_count
    FROM mcp_sessions s
    LEFT JOIN personas p ON p.id = s.persona_id
    WHERE s.project_id = $1
    GROUP BY p.name
    ORDER BY session_count DESC
  `, [projectId]);

  // ── Bottlenecks (high visit count + low completion) ──
  const bottlenecks = nord_heatmap
    .filter(n => n.visit_count >= 2 && n.completion_rate < 0.5)
    .sort((a, b) => b.visit_count - a.visit_count)
    .slice(0, 10);

  return { overview, sessions, nord_heatmap, popular_paths, persona_distribution, bottlenecks };
}

/**
 * Get analytics for a single session.
 */
export async function getSessionAnalytics(sessionId: string) {
  const traversals = await query<{
    source_title: string; target_title: string;
    traversal_type: string; traversed_at: Date;
    connection_type: string;
  }>(`
    SELECT
      sn.title AS source_title, tn.title AS target_title,
      t.traversal_type, t.traversed_at,
      ct.name AS connection_type
    FROM mcp_traversals t
    JOIN nords sn ON sn.id = t.source_nord_id
    JOIN nords tn ON tn.id = t.target_nord_id
    JOIN connections c ON c.id = t.connection_id
    JOIN connection_types ct ON ct.id = c.type_id
    WHERE t.session_id = $1
    ORDER BY t.traversed_at ASC
  `, [sessionId]);

  const visits = await query<{
    nord_title: string; type_name: string;
    visit_type: string; visited_at: Date;
  }>(`
    SELECT
      n.title AS nord_title, nt.name AS type_name,
      v.visit_type, v.visited_at
    FROM mcp_nord_visits v
    JOIN nords n ON n.id = v.nord_id
    JOIN nord_types nt ON nt.id = n.type_id
    WHERE v.session_id = $1
    ORDER BY v.visited_at ASC
  `, [sessionId]);

  const messages = await queryOne<{ count: string; tokens_in: string; tokens_out: string }>(`
    SELECT COUNT(*)::text as count,
           COALESCE(SUM(tokens_in), 0)::text as tokens_in,
           COALESCE(SUM(tokens_out), 0)::text as tokens_out
    FROM mcp_messages WHERE session_id = $1
  `, [sessionId]);

  return {
    traversals,
    visits,
    messages: {
      count: parseInt(messages?.count || '0'),
      tokens_in: parseInt(messages?.tokens_in || '0'),
      tokens_out: parseInt(messages?.tokens_out || '0'),
    },
  };
}

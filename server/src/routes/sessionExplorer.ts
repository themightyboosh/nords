/**
 * sessionExplorer.ts — Session browsing, replay, and export API.
 *
 * GET /projects/:id/sessions          — List sessions with filters
 * GET /sessions/:id/events            — Event stream for a session
 * GET /sessions/:id/replay            — Replay data (rounds with timing)
 * GET /sessions/:id/export            — Download as markdown or CSV
 * GET /sessions/:id/metrics           — Computed metrics summary
 */

import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db.js';
import { getSessionEvents, getReplayData, getSessionEventCounts } from '../lib/sessionEvents.js';

export const sessionExplorerRouter = Router();

// ── List sessions for a project ──
sessionExplorerRouter.get('/projects/:id/sessions', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const {
      source,     // comma-separated: chat,test,api,share
      status,     // completed, abandoned, active
      from,       // ISO date
      to,         // ISO date
      limit = '50',
      offset = '0',
    } = req.query;

    const conditions = ['s.project_id = $1'];
    const params: unknown[] = [projectId];
    let paramIdx = 2;

    if (source) {
      const sources = (source as string).split(',').map(s => s.trim());
      conditions.push(`s.source_type = ANY($${paramIdx})`);
      params.push(sources);
      paramIdx++;
    }

    if (status) {
      conditions.push(`s.status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }

    if (from) {
      conditions.push(`s.started_at >= $${paramIdx}`);
      params.push(from);
      paramIdx++;
    }

    if (to) {
      conditions.push(`s.started_at <= $${paramIdx}`);
      params.push(to);
      paramIdx++;
    }

    const lim = Math.min(100, parseInt(limit as string, 10) || 50);
    const off = parseInt(offset as string, 10) || 0;

    const sessions = await query<any>(`
      SELECT
        s.id, s.project_id, s.persona_id, s.source_type, s.status,
        s.started_at, s.ended_at, s.user_id, s.metadata,
        s.summary,
        p.name AS persona_name,
        (SELECT COUNT(*) FROM session_events se WHERE se.session_id = s.id AND se.action_type = 'user_message')::int AS message_count,
        (SELECT COUNT(*) FROM session_events se WHERE se.session_id = s.id AND se.action_type = 'variable_set')::int AS variables_collected,
        (SELECT COUNT(*) FROM session_events se WHERE se.session_id = s.id AND se.action_type = 'goal_completed')::int AS goals_completed,
        (SELECT se.value->>'score' FROM session_events se WHERE se.session_id = s.id AND se.action_type = 'nps_score' LIMIT 1) AS nps_score
      FROM mcp_sessions s
      LEFT JOIN personas p ON p.id = s.persona_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.started_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, [...params, lim, off]);

    // Get total count
    const countResult = await queryOne<{ count: string }>(`
      SELECT COUNT(*)::text AS count FROM mcp_sessions s
      WHERE ${conditions.join(' AND ')}
    `, params);

    res.json({
      sessions,
      pagination: {
        total: parseInt(countResult?.count || '0', 10),
        limit: lim,
        offset: off,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get events for a session ──
sessionExplorerRouter.get('/sessions/:id/events', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const { actions } = req.query; // comma-separated action types

    const actionTypes = actions
      ? (actions as string).split(',').map(a => a.trim())
      : undefined;

    const events = await getSessionEvents(sessionId, actionTypes);

    res.json({ session_id: sessionId, events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get replay data for PreviewChat ──
sessionExplorerRouter.get('/sessions/:id/replay', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const rounds = await getReplayData(sessionId);
    res.json({ session_id: sessionId, rounds });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get computed metrics ──
sessionExplorerRouter.get('/sessions/:id/metrics', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;

    const [counts, session] = await Promise.all([
      getSessionEventCounts(sessionId),
      queryOne<any>(`
        SELECT id, status, started_at, ended_at, metadata, source_type
        FROM mcp_sessions WHERE id = $1
      `, [sessionId]),
    ]);

    // Compute duration
    const durationMs = session?.ended_at && session?.started_at
      ? new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()
      : null;

    res.json({
      session_id: sessionId,
      source_type: session?.source_type,
      status: session?.status,
      duration_ms: durationMs,
      event_counts: counts,
      nps: session?.metadata?.synthetic_nps ?? null,
      sentiment: session?.metadata?.user_sentiment ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Export session data ──
sessionExplorerRouter.get('/sessions/:id/export', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const format = (req.query.format as string) || 'markdown';
    const actions = req.query.actions
      ? (req.query.actions as string).split(',').map(a => a.trim())
      : undefined;

    const [events, session] = await Promise.all([
      getSessionEvents(sessionId, actions),
      queryOne<any>(`
        SELECT s.*, p.name AS persona_name
        FROM mcp_sessions s
        LEFT JOIN personas p ON p.id = s.persona_id
        WHERE s.id = $1
      `, [sessionId]),
    ]);

    if (format === 'csv') {
      // CSV export
      const header = 'timestamp,action_type,key,value';
      const rows = events.map(e => {
        const ts = new Date(e.event_at).toISOString();
        const val = JSON.stringify(e.value).replace(/"/g, '""');
        return `${ts},${e.action_type},"${e.key}","${val}"`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="session_${sessionId.slice(0, 8)}.csv"`);
      res.send([header, ...rows].join('\n'));
    } else {
      // Markdown export
      const lines: string[] = [];
      lines.push(`# Session Export`);
      lines.push(`- **ID:** ${sessionId}`);
      lines.push(`- **Source:** ${session?.source_type || 'unknown'}`);
      lines.push(`- **Persona:** ${session?.persona_name || 'None'}`);
      lines.push(`- **Started:** ${session?.started_at || 'N/A'}`);
      lines.push(`- **Status:** ${session?.status || 'unknown'}`);
      lines.push('');
      lines.push('---');
      lines.push('');

      for (const e of events) {
        const ts = new Date(e.event_at).toLocaleTimeString();

        if (e.action_type === 'user_message') {
          lines.push(`### 👤 User (${ts})`);
          lines.push(e.value?.text || e.key || '');
          lines.push('');
        } else if (e.action_type === 'assistant_message') {
          lines.push(`### 🤖 Assistant (${ts})`);
          lines.push(e.value?.text || e.key || '');
          lines.push('');
        } else if (e.action_type === 'variable_set') {
          lines.push(`> ✅ **${e.key}** = \`${JSON.stringify(e.value?.value)}\` (${ts})`);
          lines.push('');
        } else if (e.action_type === 'goal_completed') {
          lines.push(`> 🎯 **Goal Completed:** ${e.key} (${ts})`);
          lines.push('');
        } else if (e.action_type === 'tool_call') {
          lines.push(`> 🔧 \`${e.key}\` (${ts})`);
          lines.push('');
        } else {
          lines.push(`> ${e.action_type}: ${e.key} (${ts})`);
          lines.push('');
        }
      }

      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="session_${sessionId.slice(0, 8)}.md"`);
      res.send(lines.join('\n'));
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get collected variables for a session, grouped by collection group ──
sessionExplorerRouter.get('/sessions/:id/variables', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;

    // Get all collected variables with their collection group info
    const variables = await query<{
      variable_id: string;
      variable_name: string;
      variable_description: string;
      variable_type: string;
      value: unknown;
      collected_at: string;
      nord_title: string | null;
      group_id: string | null;
      group_name: string | null;
      group_icon: string | null;
      group_color: string | null;
      group_sort: number;
      var_sort: number;
    }>(`
      SELECT
        sv.variable_id,
        pv.name AS variable_name,
        pv.description AS variable_description,
        pv.type AS variable_type,
        sv.value,
        sv.collected_at,
        n.title AS nord_title,
        cg.id AS group_id,
        cg.name AS group_name,
        cg.icon AS group_icon,
        cg.accent_color AS group_color,
        COALESCE(cg.sort_order, 999) AS group_sort,
        COALESCE(pv.sort_order, 999) AS var_sort
      FROM mcp_session_variables sv
      JOIN project_variables pv ON pv.id = sv.variable_id
      LEFT JOIN nords n ON n.id = sv.nord_id
      LEFT JOIN collection_groups cg ON cg.id = pv.collection_group_id
      WHERE sv.session_id = $1 AND sv.value IS NOT NULL
      ORDER BY group_sort, var_sort, sv.collected_at
    `, [sessionId]);

    // Group by collection group
    const groupMap = new Map<string, {
      id: string | null;
      name: string;
      icon: string | null;
      color: string | null;
      variables: Array<{
        id: string;
        name: string;
        description: string;
        type: string;
        value: unknown;
        collected_at: string;
        collected_at_nord: string | null;
      }>;
    }>();

    for (const v of variables) {
      const groupKey = v.group_id || '__ungrouped__';
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          id: v.group_id,
          name: v.group_name || 'Ungrouped',
          icon: v.group_icon,
          color: v.group_color,
          variables: [],
        });
      }
      groupMap.get(groupKey)!.variables.push({
        id: v.variable_id,
        name: v.variable_name,
        description: v.variable_description,
        type: v.variable_type,
        value: v.value,
        collected_at: v.collected_at,
        collected_at_nord: v.nord_title,
      });
    }

    res.json({
      session_id: sessionId,
      total_collected: variables.length,
      groups: Array.from(groupMap.values()),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

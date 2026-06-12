/**
 * sessionExplorer.ts — Session browsing, replay, and export API.
 *
 * @openapi
 * /api/projects/{id}/sessions:
 *   get:
 *     tags: [Sessions]
 *     summary: List sessions for a project with filters
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: source
 *         schema: { type: string }
 *         description: Comma-separated source types (chat,test,api,share)
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, completed, abandoned] }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated session list
 */

/**
 * @openapi
 * /api/sessions/{id}/events:
 *   get:
 *     tags: [Sessions]
 *     summary: Get event stream for a session
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of session events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/SessionEvent' }
 */

/**
 * @openapi
 * /api/sessions/{id}/replay:
 *   get:
 *     tags: [Sessions]
 *     summary: Replay data with rounds and timing
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Replay data with conversation rounds
 */

/**
 * @openapi
 * /api/sessions/{id}/export:
 *   get:
 *     tags: [Sessions]
 *     summary: Download session as markdown or CSV
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [markdown, csv], default: markdown }
 *     responses:
 *       200:
 *         description: Exported session data
 */

/**
 * @openapi
 * /api/sessions/{id}/metrics:
 *   get:
 *     tags: [Sessions]
 *     summary: Computed metrics summary for a session
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Session metrics
 */

/**
 * @openapi
 * /api/sessions/{id}/variables:
 *   get:
 *     tags: [Sessions]
 *     summary: Get collected variables grouped by collection group
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of collected variable groups
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/CollectedVariableGroup' }
 */

import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db.js';
import { getSessionEvents, getReplayData, getSessionEventCounts } from '../lib/sessionEvents.js';
import { getScorerRegistryMetadata, runAllScorers } from '../lib/scorers/registry.js';
import type { ScorerInput } from '../lib/scorers/types.js';
import { GoogleGenAI } from '@google/genai';

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

    const events = await getSessionEvents(sessionId as string, actionTypes);

    res.json({ session_id: sessionId, events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get replay data for PreviewChat ──
sessionExplorerRouter.get('/sessions/:id/replay', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const rounds = await getReplayData(sessionId as string);
    res.json({ session_id: sessionId, rounds });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get computed metrics (scorer plugin results) ──
sessionExplorerRouter.get('/sessions/:id/metrics', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;

    // Get all scorer_result events for this session
    const scorerResults = await getSessionEvents(sessionId as string, ['scorer_result']);

    // Get session metadata for duration/status
    const session = await queryOne<any>(`
      SELECT id, status, started_at, ended_at, metadata, source_type
      FROM mcp_sessions WHERE id = $1
    `, [sessionId]);

    const durationMs = session?.ended_at && session?.started_at
      ? new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()
      : null;

    // Map scorer results by key
    const resultsByKey: Record<string, any> = {};
    for (const evt of scorerResults) {
      // If multiple scores exist for same key, use the latest one
      resultsByKey[evt.key] = evt.value;
    }

    // Get registry metadata for the client
    const registryMeta = getScorerRegistryMetadata();

    res.json({
      session_id: sessionId,
      source_type: session?.source_type,
      status: session?.status,
      duration_ms: durationMs,
      has_been_scored: scorerResults.length > 0,
      scorers: registryMeta.map(s => ({
        key: s.key,
        label: s.label,
        icon: s.icon,
        description: s.description,
        requires_llm: s.requiresLlm,
        result: resultsByKey[s.key] || null,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Score a session on demand (any session type) ──
sessionExplorerRouter.post('/sessions/:id/score', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id as string;

    // Get session info
    const session = await queryOne<any>(
      'SELECT * FROM mcp_sessions WHERE id = $1', [sessionId]
    );
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Initialize Gemini
    const gcpProject = 'nords-spatial-1776012153';
    const gcpLocation = process.env.VERTEX_AI_LOCATION || 'us-central1';
    process.env.GOOGLE_CLOUD_PROJECT = gcpProject;

    let genai: any = null;
    if (process.env.GEMINI_API_KEY) {
      genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } else if (gcpProject) {
      genai = new GoogleGenAI({ vertexai: true, project: gcpProject, location: gcpLocation });
    }

    // Get transcript and events
    const [transcript, events] = await Promise.all([
      getReplayData(sessionId),
      getSessionEvents(sessionId),
    ]);

    // Check if this is a test session and has a scenario
    let scenario = null;
    if (session.source_type === 'test') {
      const testRun = await queryOne<any>(
        'SELECT * FROM test_runs WHERE session_id = $1 LIMIT 1', [sessionId]
      );
      if (testRun) {
        const testScenario = await queryOne<any>(
          'SELECT * FROM test_scenarios WHERE id = $1', [testRun.scenario_id]
        );
        if (testScenario) {
          scenario = {
            user_profile: testScenario.user_profile,
            user_objective: testScenario.user_objective,
            user_context: testScenario.user_context || {},
            user_profile_custom: testScenario.user_profile_custom,
            user_model: testScenario.user_model,
            persona_id: testScenario.persona_id,
          };
        }
      }
    }

    // Build scorer input
    const scorerInput: ScorerInput = {
      sessionId,
      projectId: session.project_id,
      events,
      transcript,
      projectMode: 'collect', // default for non-test sessions
      scenario,
      genai,
      scoringModel: 'gemini-2.5-flash',
    };

    // Run all scorers
    const results = await runAllScorers(scorerInput);

    res.json({
      session_id: sessionId,
      scored_at: new Date().toISOString(),
      results: results.map(r => ({
        key: r.key,
        label: r.label,
        score: r.score,
        passed: r.passed,
        details: r.details,
        metadata: r.metadata,
      })),
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
      getSessionEvents(sessionId as string, actions),
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

// ── Get collected variables for a session, with conversation context ──
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

    // Get user_message + assistant_message events to build conversation context
    const messageEvents = await getSessionEvents(sessionId as string, ['user_message', 'assistant_message']);

    // Build chronological rounds: each user_message → next assistant_message
    interface Round { user: string; agent: string; timestamp: Date }
    const rounds: Round[] = [];
    for (let i = 0; i < messageEvents.length; i++) {
      const evt = messageEvents[i];
      if (evt.action_type === 'user_message') {
        // Find next assistant_message
        const nextAssistant = messageEvents.slice(i + 1).find(e => e.action_type === 'assistant_message');
        rounds.push({
          user: typeof evt.value === 'string' ? evt.value : (evt.value?.content || evt.value?.text || String(evt.value)),
          agent: nextAssistant
            ? (typeof nextAssistant.value === 'string' ? nextAssistant.value : (nextAssistant.value?.content || nextAssistant.value?.text || String(nextAssistant.value)))
            : '',
          timestamp: new Date(evt.event_at),
        });
      }
    }

    // For each variable, find the conversation round closest to (just before) its collection time
    const enrichedVars = variables.map(v => {
      const collectedAt = new Date(v.collected_at);
      // Find the last round whose timestamp is <= collected_at
      let matchedRound: Round | null = null;
      for (let i = rounds.length - 1; i >= 0; i--) {
        if (rounds[i].timestamp <= collectedAt) {
          matchedRound = rounds[i];
          break;
        }
      }

      return {
        id: v.variable_id,
        name: v.variable_name,
        description: v.variable_description,
        type: v.variable_type,
        value: v.value,
        collected_at: v.collected_at,
        collected_at_nord: v.nord_title,
        group_name: v.group_name || 'Ungrouped',
        group_color: v.group_color,
        conversation: matchedRound ? {
          user_message: matchedRound.user,
          agent_response: matchedRound.agent,
        } : null,
      };
    });

    res.json({
      session_id: sessionId,
      total_collected: variables.length,
      variables: enrichedVars,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

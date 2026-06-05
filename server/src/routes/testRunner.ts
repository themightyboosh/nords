/**
 * testRunnerRoutes.ts — REST API for Test Scenarios and Test Runs
 *
 * @openapi
 * /api/projects/{id}/test-scenarios:
 *   get:
 *     tags: [Test Runner]
 *     summary: List test scenarios for a project
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of test scenarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/TestScenario' }
 *   post:
 *     tags: [Test Runner]
 *     summary: Create a test scenario
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Created test scenario
 *
 * /api/test-scenarios/{id}:
 *   put:
 *     tags: [Test Runner]
 *     summary: Update a test scenario
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated scenario
 *   delete:
 *     tags: [Test Runner]
 *     summary: Delete a test scenario
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Scenario deleted
 *
 * /api/test-scenarios/{id}/runs:
 *   get:
 *     tags: [Test Runner]
 *     summary: List runs for a test scenario
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of test runs
 *
 * /api/test-scenarios/{id}/run:
 *   post:
 *     tags: [Test Runner]
 *     summary: Execute a test run (triggers Gemini + MCP loop)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Completed test run result
 *
 * /api/test-runs/{id}:
 *   get:
 *     tags: [Test Runner]
 *     summary: Get test run details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Test run with conversation log
 *   delete:
 *     tags: [Test Runner]
 *     summary: Delete a test run
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Test run deleted
 *
 * /api/test-runs/{id}/stream:
 *   get:
 *     tags: [Test Runner]
 *     summary: SSE stream for live test run progress
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Server-Sent Events stream
 *         content:
 *           text/event-stream: {}
 *
 * /api/test-runs/{id}/cancel:
 *   post:
 *     tags: [Test Runner]
 *     summary: Cancel a running test
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Cancellation acknowledged
 *
 * /api/test-runs/{id}/critique:
 *   post:
 *     tags: [Test Runner]
 *     summary: Generate AI critique for a test run
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Critique text
 *
 * /api/test-runs/{id}/export:
 *   get:
 *     tags: [Test Runner]
 *     summary: Export test run as markdown
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Markdown export of the test run
 *         content:
 *           text/markdown: {}
 *
 * /api/test-runs/{id}/report/conversation:
 *   get:
 *     tags: [Test Runner]
 *     summary: Get conversation-format report
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Conversation report with messages and tool calls
 *
 * /api/test-runs/{id}/report/detailed:
 *   get:
 *     tags: [Test Runner]
 *     summary: Get detailed report with metrics
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Detailed report with timing, tool usage, and completion
 *
 * CRUD for test scenarios, run trigger with SSE streaming,
 * export, critique, and cancellation.
 */

import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db.js';
import logger from '../lib/logger.js';
import {
  executeTestRun,
  generateCritique,
  scoreTestRun,
  type TestScenario,
  type TestRunRecord,
  type RunProgress,
} from '../lib/testRunner.js';
import { getReplayData } from '../lib/sessionEvents.js';

export const testRunnerRouter = Router();

// In-memory map of active SSE connections per run
const activeStreams = new Map<string, Set<Response>>();
// In-memory cancellation flags
const cancelledRuns = new Set<string>();

// ══════════════════════════════════════════════════════════
// Test Scenarios — CRUD
// ══════════════════════════════════════════════════════════
//
// ⚠️  IMPORTANT: Test scenario subjects (the synthetic users defined in
// user_objective / user_context) must NOT overlap with the project's
// Personas/Lenses. Personas are the agent's perspective lenses — they
// define *how* the agent speaks (e.g. "Marcus Cole, Lead Systems Engineer").
// Test subjects are the *simulated users* who interact with the agent
// during test runs. Using the same character for both creates confusion
// about who is who in the conversation.
//

/**
 * GET /api/projects/:id/test-scenarios
 * List all scenarios for a project.
 */
testRunnerRouter.get('/projects/:id/test-scenarios', async (req: Request, res: Response) => {
  try {
    const scenarios = await query<TestScenario>(
      `SELECT ts.*, g.name AS goal_name
       FROM test_scenarios ts
       LEFT JOIN goals g ON g.id = ts.stop_on_goal_id
       WHERE ts.project_id = $1 AND ts.deleted_at IS NULL
       ORDER BY ts.created_at DESC`,
      [req.params.id as string]
    );

    // Attach latest run info for each scenario
    const enriched = await Promise.all(scenarios.map(async (s) => {
      const latestRun = await queryOne<{ status: string; passed: boolean; synthetic_nps: number; started_at: string }>(
        `SELECT status, passed, synthetic_nps, started_at FROM test_runs
         WHERE scenario_id = $1 ORDER BY started_at DESC LIMIT 1`,
        [s.id]
      );
      const runCount = await queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM test_runs WHERE scenario_id = $1',
        [s.id]
      );
      return {
        ...s,
        latest_run: latestRun || null,
        run_count: parseInt(runCount?.count || '0'),
      };
    }));

    res.json(enriched);
  } catch (err: any) {
    logger.error('Failed to list test scenarios', { error: err.message });
    res.status(500).json({ error: 'Failed to list scenarios' });
  }
});

/**
 * POST /api/projects/:id/test-scenarios
 * Create a new test scenario.
 */
testRunnerRouter.post('/projects/:id/test-scenarios', async (req: Request, res: Response) => {
  try {
    const { name, description, user_objective, user_profile, user_profile_custom,
      user_context, agent_model, user_model, max_rounds,
      stop_on_goal_id, stop_on_session_end,
      persona_id } = req.body;

    if (!name || !user_objective) {
      return res.status(400).json({ error: 'name and user_objective are required' });
    }

    const scenario = await queryOne<TestScenario>(`
      INSERT INTO test_scenarios (
        project_id, name, description, user_objective, user_profile, user_profile_custom,
        user_context, agent_model, user_model, max_rounds,
        stop_on_goal_id, stop_on_session_end, persona_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `, [
      req.params.id as string, name, description || null, user_objective,
      user_profile || 'cooperative', user_profile_custom || null,
      JSON.stringify(user_context || {}),
      agent_model || 'gemini-2.5-flash', user_model || 'gemini-2.5-flash-lite',
      max_rounds || 20,
      stop_on_goal_id || null, stop_on_session_end ?? true,
      persona_id || null,
    ]);

    res.status(201).json(scenario);
  } catch (err: any) {
    logger.error('Failed to create test scenario', { error: err.message });
    res.status(500).json({ error: 'Failed to create scenario' });
  }
});

/**
 * PUT /api/test-scenarios/:id
 * Update a test scenario.
 */
testRunnerRouter.put('/test-scenarios/:id', async (req: Request, res: Response) => {
  try {
    const allowedKeys = [
      'name', 'description', 'user_objective', 'user_profile', 'user_profile_custom',
      'user_context', 'agent_model', 'user_model', 'max_rounds',
      'stop_on_goal_id', 'stop_on_session_end',
      'persona_id',
    ];

    const setClauses: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let paramIdx = 1;

    for (const [key, value] of Object.entries(req.body)) {
      if (!allowedKeys.includes(key)) continue;
      if (key === 'user_context') {
        setClauses.push(`${key} = $${paramIdx}::jsonb`);
        values.push(JSON.stringify(value));
      } else {
        setClauses.push(`${key} = $${paramIdx}`);
        values.push(value);
      }
      paramIdx++;
    }

    if (values.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(req.params.id as string);
    const result = await queryOne<TestScenario>(
      `UPDATE test_scenarios SET ${setClauses.join(', ')} WHERE id = $${paramIdx} AND deleted_at IS NULL RETURNING *`,
      values
    );

    if (!result) return res.status(404).json({ error: 'Scenario not found' });
    res.json(result);
  } catch (err: any) {
    logger.error('Failed to update test scenario', { error: err.message });
    res.status(500).json({ error: 'Failed to update scenario' });
  }
});

/**
 * DELETE /api/test-scenarios/:id
 * Soft delete a test scenario.
 */
testRunnerRouter.delete('/test-scenarios/:id', async (req: Request, res: Response) => {
  try {
    await query(
      'UPDATE test_scenarios SET deleted_at = NOW() WHERE id = $1',
      [req.params.id as string]
    );
    res.json({ ok: true });
  } catch (err: any) {
    logger.error('Failed to delete test scenario', { error: err.message });
    res.status(500).json({ error: 'Failed to delete scenario' });
  }
});

// ══════════════════════════════════════════════════════════
// Test Runs — List, Stream, Cancel, Export, Critique
// ══════════════════════════════════════════════════════════

/**
 * GET /api/test-scenarios/:id/runs
 * List all runs for a scenario.
 */
testRunnerRouter.get('/test-scenarios/:id/runs', async (req: Request, res: Response) => {
  try {
    const runs = await query<TestRunRecord>(
      `SELECT id, scenario_id, project_id, session_id, status, stop_reason,
        rounds_completed, completion_pct, total_tokens_in, total_tokens_out,
        total_latency_ms, tool_call_count, synthetic_nps, user_sentiment,
        passed, started_at, finished_at, error,
        critique IS NOT NULL AS has_critique
       FROM test_runs WHERE scenario_id = $1 ORDER BY started_at DESC`,
      [req.params.id as string]
    );
    res.json(runs);
  } catch (err: any) {
    logger.error('Failed to list test runs', { error: err.message });
    res.status(500).json({ error: 'Failed to list runs' });
  }
});

/**
 * POST /api/test-scenarios/:id/run
 * Kick off a new test run. Returns the run ID immediately.
 */
testRunnerRouter.post('/test-scenarios/:id/run', async (req: Request, res: Response) => {
  try {
    const scenario = await queryOne<TestScenario>(
      'SELECT * FROM test_scenarios WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id as string]
    );
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });

    // Create run record
    const run = await queryOne<{ id: string }>(
      `INSERT INTO test_runs (scenario_id, project_id) VALUES ($1, $2) RETURNING id`,
      [scenario.id, scenario.project_id]
    );
    if (!run) throw new Error('Failed to create run record');

    const runId = run.id;

    // Start the test run asynchronously
    const onProgress = (progress: RunProgress) => {
      const listeners = activeStreams.get(runId);
      if (listeners) {
        const data = JSON.stringify(progress);
        for (const listener of listeners) {
          try {
            listener.write(`data: ${data}\n\n`);
          } catch {
            listeners.delete(listener);
          }
        }
      }
    };

    // Fire and forget — the run executes in the background
    executeTestRun(scenario, runId, onProgress, () => cancelledRuns.has(runId)).finally(() => {
      // Clean up SSE connections and cancellation flag when run finishes
      cancelledRuns.delete(runId);
      const listeners = activeStreams.get(runId);
      if (listeners) {
        for (const listener of listeners) {
          try { listener.end(); } catch { /* ignore */ }
        }
        activeStreams.delete(runId);
      }
    });

    res.status(201).json({
      runId,
      streamUrl: `/api/test-runs/${runId}/stream`,
    });
  } catch (err: any) {
    logger.error('Failed to start test run', { error: err.message });
    res.status(500).json({ error: 'Failed to start run' });
  }
});

/**
 * GET /api/test-runs/:id
 * Get full run details including transcript.
 */
testRunnerRouter.get('/test-runs/:id', async (req: Request, res: Response) => {
  try {
    const run = await queryOne<TestRunRecord>(
      'SELECT * FROM test_runs WHERE id = $1',
      [req.params.id as string]
    );
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch (err: any) {
    logger.error('Failed to get test run', { error: err.message });
    res.status(500).json({ error: 'Failed to get run' });
  }
});

/**
 * GET /api/test-runs/:id/stream
 * SSE stream of live run progress.
 */
testRunnerRouter.get('/test-runs/:id/stream', (req: Request, res: Response) => {
  const runId = req.params.id as string;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Register this connection
  if (!activeStreams.has(runId)) {
    activeStreams.set(runId, new Set());
  }
  activeStreams.get(runId)!.add(res);

  // Clean up on disconnect
  req.on('close', () => {
    activeStreams.get(runId)?.delete(res);
    if (activeStreams.get(runId)?.size === 0) {
      activeStreams.delete(runId);
    }
  });
});

/**
 * POST /api/test-runs/:id/cancel
 * Cancel a running test.
 */
testRunnerRouter.post('/test-runs/:id/cancel', async (req: Request, res: Response) => {
  try {
    const run = await queryOne<{ status: string }>(
      'SELECT status FROM test_runs WHERE id = $1',
      [req.params.id as string]
    );
    if (!run) return res.status(404).json({ error: 'Run not found' });
    if (run.status !== 'running') return res.status(409).json({ error: 'Run is not running' });

    cancelledRuns.add(req.params.id as string);
    await query(
      `UPDATE test_runs SET status = 'cancelled', stop_reason = 'cancelled', finished_at = NOW() WHERE id = $1`,
      [req.params.id as string]
    );
    res.json({ ok: true });
  } catch (err: any) {
    logger.error('Failed to cancel test run', { error: err.message });
    res.status(500).json({ error: 'Failed to cancel run' });
  }
});

/**
 * POST /api/test-runs/:id/critique
 * Generate AI critique for a completed run.
 */
testRunnerRouter.post('/test-runs/:id/critique', async (req: Request, res: Response) => {
  try {
    const critique = await generateCritique(req.params.id as string);
    res.json(critique);
  } catch (err: any) {
    logger.error('Failed to generate critique', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/test-runs/:id/rescore
 * Re-score a completed run from session_events.
 * Useful when scoring logic changes and you want to recalculate.
 */
testRunnerRouter.post('/test-runs/:id/rescore', async (req: Request, res: Response) => {
  try {
    const results = await scoreTestRun(req.params.id as string);
    res.json(results);
  } catch (err: any) {
    logger.error('Failed to re-score run', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/test-runs/:id/export
 * Export a completed run as JSON.
 * Query params: verbose=true|false (default false)
 */
testRunnerRouter.get('/test-runs/:id/export', async (req: Request, res: Response) => {
  try {
    const run = await queryOne<TestRunRecord>(
      'SELECT * FROM test_runs WHERE id = $1',
      [req.params.id as string]
    );
    if (!run) return res.status(404).json({ error: 'Run not found' });

    const scenario = await queryOne<TestScenario>(
      'SELECT * FROM test_scenarios WHERE id = $1',
      [run.scenario_id]
    );

    const verbose = req.query.verbose === 'true';
    const transcript = run.session_id ? await getReplayData(run.session_id) : [];

    const conversation = transcript.map((r: any) => {
      const base: any = {
        round: r.round,
        user: r.user_msg,
        agent: r.agent_msg,
        tool_calls: (r.tool_calls || []).map((tc: any) => ({
          name: tc.name,
          arguments: tc.arguments,
          ...(verbose ? { result: tc.result } : {}),
        })),
      };
      if (verbose) {
        base.horizon_snapshot = r.horizon_snapshot;
        base.tokens = { in: r.tokens_in, out: r.tokens_out };
        base.latency_ms = r.latency_ms;
      }
      return base;
    });

    const exportData: any = {
      scenario: {
        name: scenario?.name,
        profile: scenario?.user_profile,
        objective: scenario?.user_objective,
      },
      run: {
        id: run.id,
        status: run.status,
        stop_reason: run.stop_reason,
        started_at: run.started_at,
        finished_at: run.finished_at,
      },
      conversation,
      score: {
        completion_pct: run.completion_pct,
        rounds: run.rounds_completed,
        nps: run.synthetic_nps,
        sentiment: run.user_sentiment,
        passed: run.passed,
        ...(typeof run.score === 'string' ? JSON.parse(run.score) : run.score),
      },
    };

    if (verbose && run.critique) {
      exportData.critique = typeof run.critique === 'string'
        ? JSON.parse(run.critique)
        : run.critique;
    }

    const filename = `test-run-${run.id.slice(0, 8)}-${verbose ? 'verbose' : 'clean'}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (err: any) {
    logger.error('Failed to export test run', { error: err.message });
    res.status(500).json({ error: 'Failed to export run' });
  }
});

/**
 * DELETE /api/test-runs/:id
 * Delete a test run permanently.
 */
testRunnerRouter.delete('/test-runs/:id', async (req: Request, res: Response) => {
  try {
    await query('DELETE FROM test_runs WHERE id = $1', [req.params.id as string]);
    res.json({ ok: true });
  } catch (err: any) {
    logger.error('Failed to delete test run', { error: err.message });
    res.status(500).json({ error: 'Failed to delete run' });
  }
});

/**
 * GET /api/test-runs/:id/report/conversation
 * Generate a Markdown conversation report with variables + goals.
 */
testRunnerRouter.get('/test-runs/:id/report/conversation', async (req: Request, res: Response) => {
  try {
    const run = await queryOne<TestRunRecord>(
      'SELECT * FROM test_runs WHERE id = $1',
      [req.params.id as string]
    );
    if (!run) return res.status(404).json({ error: 'Run not found' });

    const scenario = await queryOne<TestScenario>(
      'SELECT * FROM test_scenarios WHERE id = $1',
      [run.scenario_id]
    );

    const transcript = run.session_id ? await getReplayData(run.session_id) : [];

    // ── Fetch collected variables ──
    const collectedVars = run.session_id ? await query<{
      name: string; value: any; description: string; type: string; required: boolean;
    }>(`
      SELECT pv.name, sv.value, pv.description, pv.type, pv.required
      FROM mcp_session_variables sv
      JOIN project_variables pv ON pv.id = sv.variable_id
      WHERE sv.session_id = $1
      ORDER BY pv.name
    `, [run.session_id]) : [];

    // ── Fetch goal status ──
    const goalStatus = run.session_id ? await query<{
      name: string; status: string; description: string;
    }>(`
      SELECT g.name, sg.status, g.description
      FROM mcp_session_goals sg
      JOIN goals g ON g.id = sg.goal_id
      WHERE sg.session_id = $1 AND NOT g.is_implicit
      ORDER BY sg.status DESC, g.name
    `, [run.session_id]) : [];

    // ── Fetch persona ──
    const persona = scenario?.persona_id ? await queryOne<{ name: string }>(`
      SELECT name FROM personas WHERE id = $1
    `, [scenario.persona_id]) : null;

    const statusIcon = run.passed ? '✅' : run.status === 'cancelled' ? '⚠️' : '❌';
    const statusLabel = run.passed ? 'PASS' : run.status === 'cancelled' ? 'CANCELLED' : 'FAIL';
    const date = new Date(run.started_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const lines: string[] = [
      `# Test Run Report: ${scenario?.name || 'Unknown Scenario'}`,
      '',
      `**Date**: ${date} | **Status**: ${statusIcon} ${statusLabel} | **NPS**: ${run.synthetic_nps ?? 'N/A'}/10`,
      '',
    ];

    // ── Scenario Metadata ──
    lines.push('## Scenario', '');
    if (scenario?.description) lines.push(`${scenario.description}`, '');
    lines.push(
      '| Setting | Value |',
      '|---------|-------|',
      `| **Objective** | ${scenario?.user_objective || 'N/A'} |`,
      `| **Behavior Profile** | ${scenario?.user_profile || 'N/A'} |`,
      `| **Persona** | ${persona?.name || 'None'} |`,
      `| **Agent Model** | ${scenario?.agent_model || 'N/A'} |`,
      '',
    );

    // ── Summary Metrics ──
    lines.push('## Results', '');
    lines.push(
      '| Metric | Value |',
      '|--------|-------|',
      `| Rounds | ${run.rounds_completed} |`,
      `| Completion | ${run.completion_pct ?? 0}% |`,
      `| Variables Collected | ${collectedVars.length} |`,
      `| Goals Completed | ${goalStatus.filter(g => g.status === 'complete').length} / ${goalStatus.length} |`,
      `| Stop Reason | ${run.stop_reason || 'N/A'} |`,
      '',
    );

    if (run.user_sentiment) {
      lines.push(`**User Sentiment**: "${run.user_sentiment}"`, '');
    }

    // ── Collected Variables ──
    if (collectedVars.length > 0) {
      lines.push('## Collected Variables', '');
      lines.push('| Variable | Value | Type | Required | Description |');
      lines.push('|----------|-------|------|----------|-------------|');
      for (const v of collectedVars) {
        const val = typeof v.value === 'string' ? v.value.replace(/^"|"$/g, '') : JSON.stringify(v.value);
        const desc = (v.description || '').split('.')[0]; // first sentence
        lines.push(`| ${v.name} | ${val} | ${v.type} | ${v.required ? '✅' : '⬜'} | ${desc} |`);
      }
      lines.push('');
    }

    // ── Goal Status ──
    if (goalStatus.length > 0) {
      lines.push('## Goals', '');
      lines.push('| Status | Goal | Description |');
      lines.push('|--------|------|-------------|');
      for (const g of goalStatus) {
        const icon = g.status === 'complete' ? '✅' : g.status === 'active' ? '🔄' : '⬜';
        const desc = (g.description || '').split('.')[0];
        lines.push(`| ${icon} ${g.status} | **${g.name}** | ${desc} |`);
      }
      lines.push('');
    }

    // ── Conversation ──
    lines.push('---', '', '## Conversation', '');

    for (const round of transcript) {
      const toolCount = round.tool_calls?.length || 0;
      lines.push(`### Round ${round.round}${toolCount ? ` (${toolCount} tool call${toolCount > 1 ? 's' : ''})` : ''}`, '');
      if (round.user_msg) {
        lines.push(`**🧪 User**:`, '', round.user_msg, '');
      }
      if (round.tool_calls?.length > 0) {
        for (const tc of round.tool_calls) {
          const args = tc.arguments || tc.args || {};
          const argSummary = Object.entries(args)
            .filter(([k]) => !['nord_id'].includes(k) || Object.keys(args).length <= 2)
            .map(([k, v]) => {
              const val = typeof v === 'string' ? v : (Array.isArray(v) ? `[${v.length} items]` : JSON.stringify(v));
              return `${k}=${val.length > 60 ? val.slice(0, 57) + '...' : val}`;
            })
            .join(', ');
          lines.push(`> 🔧 \`${tc.name}\`${argSummary ? ` — ${argSummary}` : ''}`);
        }
        lines.push('');
      }
      if (round.agent_msg) {
        lines.push(`**🤖 Agent**:`, '', round.agent_msg, '');
      }
    }

    res.json({ markdown: lines.join('\n') });
  } catch (err: any) {
    logger.error('Failed to generate conversation report', { error: err.message });
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * GET /api/test-runs/:id/report/detailed
 * Generate a detailed Markdown report with tool calls, metrics, variables, goals, and per-round breakdown.
 */
testRunnerRouter.get('/test-runs/:id/report/detailed', async (req: Request, res: Response) => {
  try {
    const run = await queryOne<TestRunRecord>(
      'SELECT * FROM test_runs WHERE id = $1',
      [req.params.id as string]
    );
    if (!run) return res.status(404).json({ error: 'Run not found' });

    const scenario = await queryOne<TestScenario>(
      'SELECT * FROM test_scenarios WHERE id = $1',
      [run.scenario_id]
    );

    const transcript = run.session_id ? await getReplayData(run.session_id) : [];
    const score = typeof run.score === 'string'
      ? JSON.parse(run.score) : (run.score || {});

    // ── Fetch collected variables with goal bindings ──
    const collectedVars = run.session_id ? await query<{
      name: string; value: any; description: string; type: string; required: boolean;
      goal_names: string | null;
    }>(`
      SELECT pv.name, sv.value, pv.description, pv.type, pv.required,
        (SELECT string_agg(g.name, ', ')
         FROM goal_variable_bindings gvb
         JOIN goals g ON g.id = gvb.goal_id
         WHERE gvb.variable_id = pv.id
        ) AS goal_names
      FROM mcp_session_variables sv
      JOIN project_variables pv ON pv.id = sv.variable_id
      WHERE sv.session_id = $1
      ORDER BY pv.name
    `, [run.session_id]) : [];

    // ── Fetch all project variables to show remaining ──
    const allVars = run.project_id ? await query<{ name: string; required: boolean }>(`
      SELECT name, required FROM project_variables WHERE project_id = $1 ORDER BY name
    `, [run.project_id]) : [];
    const collectedNames = new Set(collectedVars.map(v => v.name));
    const remainingVars = allVars.filter(v => !collectedNames.has(v.name));

    // ── Fetch goal status ──
    const goalStatus = run.session_id ? await query<{
      name: string; status: string; description: string; end_type: string | null;
    }>(`
      SELECT g.name, sg.status, g.description, g.end_type
      FROM mcp_session_goals sg
      JOIN goals g ON g.id = sg.goal_id
      WHERE sg.session_id = $1 AND NOT g.is_implicit
      ORDER BY
        CASE sg.status WHEN 'complete' THEN 0 WHEN 'active' THEN 1 ELSE 2 END,
        g.name
    `, [run.session_id]) : [];

    // ── Fetch persona ──
    const persona = scenario?.persona_id ? await queryOne<{ name: string; description: string }>(`
      SELECT name, description FROM personas WHERE id = $1
    `, [scenario.persona_id]) : null;

    const statusIcon = run.passed ? '✅' : run.status === 'cancelled' ? '⚠️' : '❌';
    const statusLabel = run.passed ? 'PASS' : run.status === 'cancelled' ? 'CANCELLED' : 'FAIL';
    const date = new Date(run.started_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const duration = run.finished_at
      ? `${((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000).toFixed(0)}s`
      : 'N/A';

    const totalTokensIn = transcript.reduce((sum: number, r: any) => sum + (r.tokens_in || 0), 0);
    const totalTokensOut = transcript.reduce((sum: number, r: any) => sum + (r.tokens_out || 0), 0);
    const totalToolCalls = transcript.reduce((sum: number, r: any) => sum + (r.tool_calls?.length || 0), 0);
    const avgLatency = transcript.length > 0
      ? Math.round(transcript.reduce((sum: number, r: any) => sum + (r.latency_ms || 0), 0) / transcript.length)
      : 0;

    const lines: string[] = [
      `# Detailed Test Report: ${scenario?.name || 'Unknown Scenario'}`,
      '',
      `**Date**: ${date} | **Duration**: ${duration} | **Status**: ${statusIcon} ${statusLabel} | **NPS**: ${run.synthetic_nps ?? 'N/A'}/10`,
      '',
    ];

    // ── Scenario Configuration ──
    lines.push('## Scenario Configuration', '');
    if (scenario?.description) lines.push(`> ${scenario.description}`, '');
    lines.push(
      '| Setting | Value |',
      '|---------|-------|',
      `| **User Objective** | ${scenario?.user_objective || 'N/A'} |`,
      `| **Behavior Profile** | ${scenario?.user_profile || 'N/A'} |`,
      `| **Persona** | ${persona ? `${persona.name} — ${persona.description || ''}` : 'None'} |`,
      `| **Agent Model** | ${scenario?.agent_model || 'N/A'} |`,
      `| **User Model** | ${scenario?.user_model || 'N/A'} |`,
      `| **Max Rounds** | ${scenario?.max_rounds || 'N/A'} |`,
      `| **Stop on Goal** | ${(scenario as any)?.goal_name || 'None'} |`,
      '',
    );

    // ── Metrics ──
    lines.push('## Performance Metrics', '');
    lines.push(
      '| Metric | Value |',
      '|--------|-------|',
      `| Total Tokens | ${((totalTokensIn + totalTokensOut) / 1000).toFixed(1)}K (in: ${(totalTokensIn / 1000).toFixed(1)}K, out: ${(totalTokensOut / 1000).toFixed(1)}K) |`,
      `| Duration | ${duration} |`,
      `| Avg Latency/Round | ${avgLatency.toLocaleString()}ms |`,
      `| Tool Calls | ${totalToolCalls} |`,
      `| Rounds Completed | ${run.rounds_completed} |`,
      `| Completion | ${run.completion_pct ?? 0}% |`,
      `| Stop Reason | ${run.stop_reason || 'N/A'} |`,
      '',
    );

    if (run.user_sentiment) {
      lines.push(`**User Sentiment**: "${run.user_sentiment}"`, '');
    }

    // ── Collected Variables ──
    lines.push('## Collected Variables', '');
    if (collectedVars.length > 0) {
      lines.push(`${collectedVars.length} of ${allVars.length} variables collected (${allVars.filter(v => v.required).length} required).`, '');
      lines.push('| Variable | Value | Type | Req | Goals | Description |');
      lines.push('|----------|-------|------|-----|-------|-------------|');
      for (const v of collectedVars) {
        const val = typeof v.value === 'string' ? v.value.replace(/^"|"$/g, '') : JSON.stringify(v.value);
        const desc = (v.description || '').split('.')[0];
        lines.push(`| **${v.name}** | ${val} | ${v.type} | ${v.required ? '✅' : '⬜'} | ${v.goal_names || '—'} | ${desc} |`);
      }
      lines.push('');
    } else {
      lines.push('*No variables were collected during this run.*', '');
    }

    // ── Remaining Variables ──
    if (remainingVars.length > 0) {
      lines.push('### Remaining (Not Collected)', '');
      for (const v of remainingVars) {
        lines.push(`- ${v.required ? '🔴' : '⚪'} ${v.name}${v.required ? ' *(required)*' : ''}`);
      }
      lines.push('');
    }

    // ── Goal Status ──
    if (goalStatus.length > 0) {
      lines.push('## Goals', '');
      const completed = goalStatus.filter(g => g.status === 'complete').length;
      lines.push(`${completed} of ${goalStatus.length} goals completed.`, '');
      lines.push('| Status | Goal | Type | Description |');
      lines.push('|--------|------|------|-------------|');
      for (const g of goalStatus) {
        const icon = g.status === 'complete' ? '✅' : g.status === 'active' ? '🔄' : '⬜';
        const desc = (g.description || '').split('.')[0];
        lines.push(`| ${icon} ${g.status} | **${g.name}** | ${g.end_type || '—'} | ${desc} |`);
      }
      lines.push('');
    }

    // ── Coverage Gaps ──
    if (score.coverage_gaps?.length > 0) {
      lines.push('### Coverage Gaps', '');
      for (const gap of score.coverage_gaps) {
        lines.push(`- ${gap}`);
      }
      lines.push('');
    }

    // ── Per-Round Breakdown ──
    lines.push('---', '', '## Per-Round Breakdown', '');

    for (const round of transcript) {
      const latency = round.latency_ms ? `${round.latency_ms.toLocaleString()}ms` : '?';
      const tokensIn = round.tokens_in || 0;
      const tokensOut = round.tokens_out || 0;
      const tokens = `${((tokensIn + tokensOut) / 1000).toFixed(1)}K tokens`;
      const tools = round.tool_calls?.length || 0;

      lines.push(`### Round ${round.round} (${latency} | ${tokens} | ${tools} tools)`, '');

      if (round.user_msg) {
        lines.push(`**🧪 User**:`, '', round.user_msg, '');
      }
      if (round.agent_msg) {
        lines.push(`**🤖 Agent**:`, '', round.agent_msg, '');
      }

      if (round.tool_calls?.length > 0) {
        lines.push('<details><summary>Tool Calls</summary>', '');
        for (const tc of round.tool_calls) {
          const args = tc.arguments || tc.args;
          const argStr = args ? JSON.stringify(args, null, 2) : '';
          lines.push(`**\`${tc.name}\`**`);
          if (argStr) {
            lines.push('```json', argStr.slice(0, 500), '```');
          }
          lines.push('');
        }
        lines.push('</details>', '');
      }
    }

    // ── Critique ──
    if (run.critique) {
      const critique = typeof run.critique === 'string' ? JSON.parse(run.critique) : run.critique;
      lines.push('---', '', '## AI Critique', '');
      if (critique.summary) lines.push(critique.summary, '');
      if (critique.suggestions?.length > 0) {
        lines.push('| Severity | Category | Finding | Action |');
        lines.push('|----------|----------|---------|--------|');
        for (const s of critique.suggestions) {
          lines.push(`| ${s.severity || 'info'} | ${s.category || 'general'} | ${s.title || s.message || ''} | ${s.action || ''} |`);
        }
        lines.push('');
      }
      if (critique.findings?.length > 0) {
        lines.push('| Severity | Category | Finding |', '|----------|----------|---------|');
        for (const f of critique.findings) {
          lines.push(`| ${f.severity || 'info'} | ${f.category || 'general'} | ${f.message || f.text || ''} |`);
        }
        lines.push('');
      }
    }

    res.json({ markdown: lines.join('\n') });
  } catch (err: any) {
    logger.error('Failed to generate detailed report', { error: err.message });
    res.status(500).json({ error: 'Failed to generate report' });
  }
});


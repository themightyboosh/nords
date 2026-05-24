/**
 * testRunnerRoutes.ts — REST API for Test Scenarios and Test Runs
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
  type TestScenario,
  type TestRunRecord,
  type RunProgress,
} from '../lib/testRunner.js';

export const testRunnerRouter = Router();

// In-memory map of active SSE connections per run
const activeStreams = new Map<string, Set<Response>>();
// In-memory cancellation flags
const cancelledRuns = new Set<string>();

// ══════════════════════════════════════════════════════════
// Test Scenarios — CRUD
// ══════════════════════════════════════════════════════════

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
      stop_on_completion_pct, stop_on_goal_id, stop_on_session_end,
      min_completion_pct } = req.body;

    if (!name || !user_objective) {
      return res.status(400).json({ error: 'name and user_objective are required' });
    }

    const scenario = await queryOne<TestScenario>(`
      INSERT INTO test_scenarios (
        project_id, name, description, user_objective, user_profile, user_profile_custom,
        user_context, agent_model, user_model, max_rounds,
        stop_on_completion_pct, stop_on_goal_id, stop_on_session_end, min_completion_pct
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
    `, [
      req.params.id as string, name, description || null, user_objective,
      user_profile || 'cooperative', user_profile_custom || null,
      JSON.stringify(user_context || {}),
      agent_model || 'gemini-2.5-flash', user_model || 'gemini-2.5-flash-lite',
      max_rounds || 20, stop_on_completion_pct || null,
      stop_on_goal_id || null, stop_on_session_end ?? true,
      min_completion_pct ?? 80,
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
      'stop_on_completion_pct', 'stop_on_goal_id', 'stop_on_session_end',
      'min_completion_pct',
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
    executeTestRun(scenario, runId, onProgress).finally(() => {
      // Clean up SSE connections when run finishes
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
    const transcript = typeof run.transcript === 'string'
      ? JSON.parse(run.transcript)
      : run.transcript;

    const conversation = transcript.map((r: any) => {
      const base: any = {
        round: r.round,
        user: r.user_msg,
        agent: r.agent_msg,
      };
      if (verbose) {
        base.tool_calls = r.tool_calls;
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

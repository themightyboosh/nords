/**
 * sessionEvents.ts — Flat, append-only event logger for session analytics.
 *
 * Every session interaction is a row: action_type + key + value.
 * This is the single write interface for the session_events table.
 *
 * Fire-and-forget: if the insert fails, the caller succeeds anyway.
 * This is analytics, not the transaction path.
 */

import { query } from '../db.js';
import logger from './logger.js';

// ── Action Types ──
// Unconstrained in the DB but typed here for code safety.

export type ActionType =
  // Session lifecycle
  | 'session_start'
  | 'session_end'
  // Conversation
  | 'user_message'
  | 'assistant_message'
  | 'tool_call'
  // Navigation
  | 'traversal'
  | 'visit'
  | 'navigate'
  | 'position_change'
  // Data collection
  | 'variable_set'
  | 'variable_rejected'
  // Goals
  | 'goal_activated'
  | 'goal_progress'
  | 'goal_completed'
  // System
  | 'persona_switch'
  | 'nps_score'
  | 'error'
  | 'completion_check'
  // Scoring & snapshots
  | 'horizon_snapshot'
  | 'scorer_result'
  | 'hallucination_score'
  | 'guardrail_score'
  | 'test_score'
  | 'test_result'
  | 'test_properties'
  | 'test_coverage_gaps';

/**
 * Log a single session event.
 * Fire-and-forget — never throws.
 */
export async function logEvent(
  sessionId: string,
  actionType: ActionType,
  key: string,
  value: Record<string, unknown> = {}
): Promise<void> {
  try {
    await query(
      `INSERT INTO session_events (session_id, action_type, key, value)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, actionType, key, JSON.stringify(value)]
    );
  } catch (err: any) {
    // Never fail the caller — this is analytics
    logger.warn('Failed to log session event', {
      sessionId, actionType, key, error: err.message,
    });
  }
}

/**
 * Batch insert multiple events in one round-trip.
 * Fire-and-forget — never throws.
 */
export async function logEvents(
  sessionId: string,
  events: Array<{ actionType: ActionType; key: string; value?: Record<string, unknown> }>
): Promise<void> {
  if (events.length === 0) return;
  try {
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let i = 1;
    for (const evt of events) {
      placeholders.push(`($${i}, $${i + 1}, $${i + 2}, $${i + 3})`);
      values.push(sessionId, evt.actionType, evt.key, JSON.stringify(evt.value || {}));
      i += 4;
    }
    await query(
      `INSERT INTO session_events (session_id, action_type, key, value)
       VALUES ${placeholders.join(', ')}`,
      values
    );
  } catch (err: any) {
    logger.warn('Failed to batch log session events', {
      sessionId, count: events.length, error: err.message,
    });
  }
}

/**
 * Query events for a session, optionally filtered by action types.
 */
export async function getSessionEvents(
  sessionId: string,
  actionTypes?: string[],
  limit?: number
): Promise<Array<{ id: string; action_type: string; key: string; value: any; event_at: Date }>> {
  const conditions = ['session_id = $1'];
  const params: unknown[] = [sessionId];

  if (actionTypes && actionTypes.length > 0) {
    conditions.push(`action_type = ANY($2)`);
    params.push(actionTypes);
  }

  let sql = `SELECT id, action_type, key, value, event_at
             FROM session_events
             WHERE ${conditions.join(' AND ')}
             ORDER BY event_at ASC`;

  if (limit) {
    sql += ` LIMIT $${params.length + 1}`;
    params.push(limit);
  }

  return query(sql, params);
}

/**
 * Get replay data — user_message + assistant_message events grouped into rounds.
 * Returns the TranscriptRound[] format that PreviewChat expects.
 *
 * Round 0 = agent welcome (assistant_message before any user_message).
 * Subsequent rounds = user_message → tool_calls → assistant_message.
 * Tool calls now include result_summary for debugging.
 */
export async function getReplayData(sessionId: string): Promise<Array<{
  round: number;
  user_msg: string;
  agent_msg: string;
  tool_calls: any[];
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  delay_ms: number; // real time gap from previous event for replay pacing
}>> {
  const events = await query<{
    action_type: string;
    key: string;
    value: any;
    event_at: Date;
  }>(
    `SELECT action_type, key, value, event_at
     FROM session_events
     WHERE session_id = $1
       AND action_type IN ('user_message', 'assistant_message', 'tool_call')
     ORDER BY event_at ASC`,
    [sessionId]
  );

  // Group into rounds: user_message → (tool_calls) → assistant_message
  const rounds: Array<{
    round: number;
    user_msg: string;
    agent_msg: string;
    tool_calls: any[];
    tokens_in: number;
    tokens_out: number;
    latency_ms: number;
    delay_ms: number;
  }> = [];

  let currentRound: {
    user_msg: string;
    tool_calls: any[];
    agent_msg: string;
    tokens_in: number;
    tokens_out: number;
    latency_ms: number;
    user_event_at: Date | null;
  } | null = null;

  let prevEventAt: Date | null = null;

  // ── Round 0: Capture welcome phase (tool_calls + assistant_message before any user_message) ──
  let seenFirstUserMessage = false;
  const round0ToolCalls: any[] = [];

  for (const evt of events) {
    if (!seenFirstUserMessage && evt.action_type === 'user_message') {
      seenFirstUserMessage = true;
    }

    // Collect round 0 events (before any user_message)
    if (!seenFirstUserMessage) {
      if (evt.action_type === 'tool_call') {
        round0ToolCalls.push({
          name: evt.key,
          arguments: evt.value?.args || {},
          result: evt.value?.result_summary || evt.value?.result_data || null,
          error: evt.value?.error || null,
        });
      } else if (evt.action_type === 'assistant_message') {
        // Push round 0 with the welcome message
        rounds.push({
          round: 0,
          user_msg: '',
          agent_msg: evt.value?.text || evt.key || '',
          tool_calls: round0ToolCalls,
          tokens_in: evt.value?.tokens_in || 0,
          tokens_out: evt.value?.tokens_out || 0,
          latency_ms: evt.value?.latency_ms || 0,
          delay_ms: 1000,
        });
        prevEventAt = new Date(evt.event_at);
      }
      continue;
    }

    // ── Standard rounds (1+) ──
    if (evt.action_type === 'user_message') {
      // Start a new round
      currentRound = {
        user_msg: evt.value?.text || evt.key || '',
        tool_calls: [],
        agent_msg: '',
        tokens_in: 0,
        tokens_out: 0,
        latency_ms: 0,
        user_event_at: new Date(evt.event_at),
      };
    } else if (evt.action_type === 'tool_call' && currentRound) {
      currentRound.tool_calls.push({
        name: evt.key,
        arguments: evt.value?.args || {},
        result: evt.value?.result_summary || evt.value?.result_data || null,
        error: evt.value?.error || null,
      });
    } else if (evt.action_type === 'assistant_message' && currentRound) {
      currentRound.agent_msg = evt.value?.text || evt.key || '';
      currentRound.tokens_in = evt.value?.tokens_in || 0;
      currentRound.tokens_out = evt.value?.tokens_out || 0;
      currentRound.latency_ms = evt.value?.latency_ms || 0;

      // Calculate real delay from previous round's assistant message
      const delayMs = prevEventAt
        ? Math.max(0, new Date(currentRound.user_event_at!).getTime() - prevEventAt.getTime())
        : 1000; // default 1s for first round

      rounds.push({
        round: rounds.length,
        user_msg: currentRound.user_msg,
        agent_msg: currentRound.agent_msg,
        tool_calls: currentRound.tool_calls,
        tokens_in: currentRound.tokens_in,
        tokens_out: currentRound.tokens_out,
        latency_ms: currentRound.latency_ms,
        delay_ms: delayMs,
      });

      prevEventAt = new Date(evt.event_at);
      currentRound = null;
    }
  }

  return rounds;
}

/**
 * Get event counts by action_type for a session (for metrics tab).
 */
export async function getSessionEventCounts(
  sessionId: string
): Promise<Record<string, number>> {
  const rows = await query<{ action_type: string; count: string }>(
    `SELECT action_type, COUNT(*)::text AS count
     FROM session_events
     WHERE session_id = $1
     GROUP BY action_type
     ORDER BY action_type`,
    [sessionId]
  );
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.action_type] = parseInt(row.count, 10);
  }
  return counts;
}

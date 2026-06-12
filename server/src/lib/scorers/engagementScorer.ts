/**
 * engagementScorer.ts — Session engagement metrics from event counts.
 *
 * Pure computation: counts events by type, computes duration, builds
 * the event breakdown data that the metrics tab renders as bar charts.
 * No LLM call required.
 */

import type { ScorerFn, ScorerResult, ScorerInput } from './types.js';

export const engagementScorer: ScorerFn = async (input: ScorerInput): Promise<ScorerResult> => {
  const { events, transcript } = input;

  // Count events by action_type
  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.action_type] = (counts[e.action_type] || 0) + 1;
  }

  const messages = (counts['user_message'] || 0);
  const toolCalls = (counts['tool_call'] || 0);
  const variablesSet = (counts['variable_set'] || 0);
  const variablesRejected = (counts['variable_rejected'] || 0);
  const goalsCompleted = (counts['goal_completed'] || 0);
  const traversals = (counts['traversal'] || 0) + (counts['navigate'] || 0);
  const personaSwitches = (counts['persona_switch'] || 0);

  // Duration from first to last event
  let durationMs: number | null = null;
  if (events.length >= 2) {
    const first = new Date(events[0].event_at).getTime();
    const last = new Date(events[events.length - 1].event_at).getTime();
    durationMs = last - first;
  }

  // Token usage from transcript
  const totalTokensIn = transcript.reduce((sum, r) => sum + r.tokens_in, 0);
  const totalTokensOut = transcript.reduce((sum, r) => sum + r.tokens_out, 0);
  const avgLatencyMs = transcript.length > 0
    ? Math.round(transcript.reduce((sum, r) => sum + r.latency_ms, 0) / transcript.length)
    : 0;

  // Engagement score: simple heuristic based on conversation depth
  // 10 = rich interaction, 0 = single-message session
  let score: number;
  if (messages === 0) {
    score = 0;
  } else if (messages <= 2) {
    score = 3;
  } else if (messages <= 5) {
    score = 5;
  } else if (messages <= 10) {
    score = 7;
  } else {
    score = Math.min(10, 7 + Math.floor((variablesSet + goalsCompleted) / 3));
  }

  return {
    key: 'engagement',
    label: 'Engagement',
    score,
    passed: null, // engagement doesn't have pass/fail
    details: `${messages} messages, ${toolCalls} tool calls, ${variablesSet} variables collected`,
    metadata: {
      event_counts: counts,
      messages,
      tool_calls: toolCalls,
      variables_set: variablesSet,
      variables_rejected: variablesRejected,
      goals_completed: goalsCompleted,
      traversals,
      persona_switches: personaSwitches,
      duration_ms: durationMs,
      total_tokens_in: totalTokensIn,
      total_tokens_out: totalTokensOut,
      avg_latency_ms: avgLatencyMs,
      rounds: transcript.length,
    },
  };
};

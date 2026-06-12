/**
 * navHealthScorer.ts — Navigation cadence and depth analysis.
 *
 * Detects three anti-patterns from the conversation transcript:
 *   - shallow_navigation: too few unique nords visited relative to rounds
 *   - freewheeling: consecutive rounds without any tool call
 *   - stuck: consecutive rounds without navigation
 *
 * Pure computation — no LLM call required.
 */

import type { ScorerFn, ScorerResult, ScorerInput } from './types.js';
import { query } from '../../db.js';

export const navHealthScorer: ScorerFn = async (input: ScorerInput): Promise<ScorerResult> => {
  const { sessionId, events, transcript } = input;
  const rounds = transcript.length;

  if (rounds === 0) {
    return {
      key: 'nav_health',
      label: 'Navigation Health',
      score: null,
      passed: null,
      details: 'No conversation rounds to analyze',
      metadata: {},
    };
  }

  // ── Navigation metrics from session_events ──
  const navEvents = events.filter(e => e.action_type === 'navigate');
  const posEvents = events.filter(e => e.action_type === 'position_change');

  const traversalCount = navEvents.length;

  // Unique nords visited (from position_change keys = target nord IDs)
  const visitedNords = new Set<string>();
  for (const e of posEvents) visitedNords.add(e.key);
  // Also count starting position
  const startEvent = events.find(e => e.action_type === 'session_start');
  if (startEvent?.value?.start_nord_id) visitedNords.add(startEvent.value.start_nord_id);
  const uniqueNordsVisited = visitedNords.size;

  // Max chain depth (longest sequential traversal chain)
  let maxChainDepth = 0;
  let currentChain = 0;
  for (const e of navEvents) {
    if (e.value?.method === 'traverse') {
      currentChain++;
      maxChainDepth = Math.max(maxChainDepth, currentChain);
    } else {
      currentChain = 0; // jump breaks the chain
    }
  }

  const personaSwitches = events.filter(e => e.action_type === 'persona_switch').length;

  // Search and peek calls
  const searchCalls = events.filter(e => e.action_type === 'tool_call' && e.key === 'nords_search').length;
  const peekCalls = events.filter(e => e.action_type === 'tool_call' && e.key === 'nords_get_context').length;

  // Traversal ratio
  const traversalRatio = rounds > 0 ? +(traversalCount / rounds).toFixed(2) : 0;

  // ── Navigation health flags ──
  const flags: string[] = [];

  // Shallow navigation: < 4 unique nords visited in 6+ rounds
  if (uniqueNordsVisited < 4 && rounds > 6) {
    flags.push(`shallow_navigation: visited ${uniqueNordsVisited} nords in ${rounds} rounds`);
  }

  // Freewheeling: consecutive rounds without ANY tool call
  let maxConsecutiveNoTool = 0;
  let currentNoTool = 0;
  for (const r of transcript) {
    if (r.tool_calls.length === 0) { currentNoTool++; }
    else { maxConsecutiveNoTool = Math.max(maxConsecutiveNoTool, currentNoTool); currentNoTool = 0; }
  }
  maxConsecutiveNoTool = Math.max(maxConsecutiveNoTool, currentNoTool);
  if (maxConsecutiveNoTool >= 3) {
    flags.push(`freewheeling: ${maxConsecutiveNoTool} consecutive rounds without tool calls`);
  }

  // Stuck: consecutive rounds without navigation
  let maxConsecutiveNoNav = 0;
  let currentNoNav = 0;
  for (const r of transcript) {
    const hasNav = r.tool_calls.some((tc: any) =>
      ['nords_navigate', 'nords_traverse_connection'].includes(tc.name || tc.tool_name));
    if (!hasNav) { currentNoNav++; }
    else { maxConsecutiveNoNav = Math.max(maxConsecutiveNoNav, currentNoNav); currentNoNav = 0; }
  }
  maxConsecutiveNoNav = Math.max(maxConsecutiveNoNav, currentNoNav);
  if (maxConsecutiveNoNav >= 4) {
    flags.push(`stuck: ${maxConsecutiveNoNav} consecutive rounds without navigation`);
  }

  // Score: 10 = clean navigation, 0 = severe problems
  let score = 10;
  if (flags.length > 0) score -= flags.length * 2;
  // Bonus penalty for extreme values
  if (maxConsecutiveNoNav >= 8) score -= 2;
  if (uniqueNordsVisited <= 1 && rounds > 4) score -= 2;
  score = Math.max(0, Math.min(10, score));

  return {
    key: 'nav_health',
    label: 'Navigation Health',
    score,
    passed: flags.length === 0,
    details: flags.length > 0
      ? `${flags.length} issue${flags.length > 1 ? 's' : ''}: ${flags.join('; ')}`
      : `Healthy navigation: ${uniqueNordsVisited} nords visited across ${rounds} rounds`,
    metadata: {
      flags,
      traversal_count: traversalCount,
      unique_nords_visited: uniqueNordsVisited,
      max_chain_depth: maxChainDepth,
      persona_switches: personaSwitches,
      traversal_ratio: traversalRatio,
      search_count: searchCalls,
      peek_count: peekCalls,
      max_consecutive_no_tool: maxConsecutiveNoTool,
      max_consecutive_no_nav: maxConsecutiveNoNav,
    },
  };
};

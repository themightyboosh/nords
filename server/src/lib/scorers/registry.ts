/**
 * registry.ts — Scorer plugin registry and orchestrator.
 *
 * Central list of all scorer plugins. The orchestrator runs each plugin
 * and writes results back as session_events with action_type='scorer_result'.
 */

import type { ScorerRegistryEntry, ScorerInput, ScorerResult } from './types.js';
import { engagementScorer } from './engagementScorer.js';
import { completionScorer } from './completionScorer.js';
import { navHealthScorer } from './navHealthScorer.js';
import { npsScorer } from './npsScorer.js';
import { hallucinationScorer } from './hallucinationScorer.js';
import { guardrailScorer } from './guardrailScorer.js';
import { logEvent } from '../sessionEvents.js';
import logger from '../logger.js';

/**
 * Registry of all scorer plugins.
 * Order matters: engagement + nav_health run first (fast, no LLM),
 * then LLM judges (nps, hallucination, guardrail).
 */
export const scorerRegistry: ScorerRegistryEntry[] = [
  {
    key: 'engagement',
    label: 'Engagement',
    icon: 'Activity',
    description: 'Message counts, tool usage, variables collected, duration',
    requiresLlm: false,
    fn: engagementScorer,
  },
  {
    key: 'completion',
    label: 'Completion',
    icon: 'CheckCircle',
    description: 'Goal completion % and variable collection coverage (required/optional)',
    requiresLlm: false,
    fn: completionScorer,
  },
  {
    key: 'nav_health',
    label: 'Navigation Health',
    icon: 'Navigation',
    description: 'Graph traversal depth, navigation cadence, anti-pattern detection',
    requiresLlm: false,
    fn: navHealthScorer,
  },
  {
    key: 'nps',
    label: 'NPS Score',
    icon: 'ThumbsUp',
    description: 'Synthetic user satisfaction rating (test sessions only)',
    requiresLlm: true,
    fn: npsScorer,
  },
  {
    key: 'hallucination',
    label: 'Hallucination Audit',
    icon: 'ShieldAlert',
    description: 'Grounding check: agent claims vs. actual graph data',
    requiresLlm: true,
    fn: hallucinationScorer,
  },
  {
    key: 'guardrail',
    label: 'Guardrail Compliance',
    icon: 'Shield',
    description: 'Persona guardrail adherence (MUST/NEVER/PREFER rules)',
    requiresLlm: true,
    fn: guardrailScorer,
  },
];

/**
 * Run all registered scorers against a session.
 * Writes each result back as a session_event (action_type='scorer_result').
 * Returns the array of results.
 */
export async function runAllScorers(input: ScorerInput): Promise<ScorerResult[]> {
  const results: ScorerResult[] = [];

  for (const entry of scorerRegistry) {
    try {
      logger.info(`Running scorer: ${entry.key}`, { sessionId: input.sessionId });
      const result = await entry.fn(input);
      results.push(result);

      // Write result back as session_event
      logEvent(input.sessionId, 'scorer_result' as any, entry.key, {
        score: result.score,
        passed: result.passed,
        label: result.label,
        details: result.details,
        metadata: result.metadata,
      });
    } catch (err) {
      logger.error(`Scorer ${entry.key} threw unexpectedly`, { error: (err as Error).message });
      results.push({
        key: entry.key,
        label: entry.label,
        score: null,
        passed: null,
        details: `Scorer crashed: ${(err as Error).message}`,
        metadata: { error: (err as Error).message },
      });
    }
  }

  return results;
}

/**
 * Get the registry metadata for the client (without function references).
 */
export function getScorerRegistryMetadata(): Array<{
  key: string;
  label: string;
  icon: string;
  description: string;
  requiresLlm: boolean;
}> {
  return scorerRegistry.map(({ key, label, icon, description, requiresLlm }) => ({
    key, label, icon, description, requiresLlm,
  }));
}

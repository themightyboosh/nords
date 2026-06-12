/**
 * types.ts — Shared types for the scorer plugin system.
 *
 * Each scorer is a function: (ScorerInput) => Promise<ScorerResult>.
 * The registry orchestrates them; results are written back as session_events.
 */

import type { TranscriptRound } from '../testRunner.js';

/** Raw session event row from the DB. */
export interface SessionEventRow {
  id: string;
  action_type: string;
  key: string;
  value: any;
  event_at: Date;
}

/**
 * Input bundle passed to every scorer plugin.
 * Constructed once by the orchestrator and shared across all scorers.
 */
export interface ScorerInput {
  sessionId: string;
  projectId: string;
  /** All session_events for this session, ordered by event_at ASC. */
  events: SessionEventRow[];
  /** Reconstructed conversation rounds (user_msg → tool_calls → agent_msg). */
  transcript: TranscriptRound[];
  /** Project mode: 'collect', 'guided', or 'explore'. */
  projectMode: string;
  /** Test scenario (null for non-test sessions). */
  scenario: {
    user_profile: string;
    user_objective: string;
    user_context: Record<string, unknown>;
    user_profile_custom?: string | null;
    user_model: string;
    persona_id: string | null;
  } | null;
  /** GoogleGenAI instance for LLM-based scorers. Null if no API key configured. */
  genai: any | null;
  /** Model to use for LLM scoring calls. */
  scoringModel: string;
}

/**
 * Standard result returned by every scorer plugin.
 * Written to session_events as action_type='scorer_result', key=ScorerResult.key.
 */
export interface ScorerResult {
  /** Unique key for this scorer, e.g. 'hallucination', 'guardrail', 'nps'. */
  key: string;
  /** Human-readable label, e.g. 'Hallucination Audit'. */
  label: string;
  /** Numeric score (0-10), or null if the scorer couldn't run (missing data). */
  score: number | null;
  /** Pass/fail determination, or null if not applicable. */
  passed: boolean | null;
  /** Human-readable explanation/details (truncated for storage). */
  details: string | null;
  /** Plugin-specific metadata (event counts, flags, violation list, etc.). */
  metadata: Record<string, unknown>;
}

/** Scorer function signature. */
export type ScorerFn = (input: ScorerInput) => Promise<ScorerResult>;

/** Registry entry: maps a scorer key → its metadata + function. */
export interface ScorerRegistryEntry {
  key: string;
  label: string;
  /** Lucide icon name for the client to render. */
  icon: string;
  /** Brief description shown in the UI. */
  description: string;
  /** Whether this scorer requires an LLM call (affects cost/time). */
  requiresLlm: boolean;
  fn: ScorerFn;
}

/**
 * npsScorer.ts — Synthetic NPS score via LLM judge.
 *
 * Re-uses the test scenario's user profile to judge the conversation
 * from the synthetic user's perspective. Only runs when:
 *   1. A scenario is available (test sessions)
 *   2. A genai instance is available
 *   3. The transcript has content
 */

import type { ScorerFn, ScorerResult, ScorerInput } from './types.js';
import { retryGenerateContent } from './llmRetry.js';
import { buildSyntheticUserPrompt } from '../testRunner.js';
import logger from '../logger.js';

export const npsScorer: ScorerFn = async (input: ScorerInput): Promise<ScorerResult> => {
  const { transcript, scenario, genai, scoringModel } = input;

  // Guard: requires scenario + LLM
  if (!scenario || !genai) {
    return {
      key: 'nps',
      label: 'NPS Score',
      score: null,
      passed: null,
      details: !scenario ? 'Requires test scenario (not available for chat sessions)' : 'No LLM configured',
      metadata: {},
    };
  }

  const conversationSummary = transcript
    .filter(r => r.user_msg || r.agent_msg)
    .map(r => r.user_msg
      ? `User: ${r.user_msg}\nAssistant: ${r.agent_msg}`
      : `Assistant: ${r.agent_msg}`
    ).join('\n\n');

  if (conversationSummary.length < 50) {
    return {
      key: 'nps',
      label: 'NPS Score',
      score: null,
      passed: null,
      details: 'Conversation too short to score',
      metadata: {},
    };
  }

  try {
    const syntheticUserPrompt = buildSyntheticUserPrompt(
      scenario.user_profile,
      scenario.user_objective,
      scenario.user_context,
      scenario.user_profile_custom
    );

    const npsResponse = await retryGenerateContent(genai, {
      model: scoringModel,
      contents: [{
        role: 'user',
        parts: [{
          text: `You just had the following conversation with an AI assistant:

${conversationSummary}

The conversation is now over. Based on your experience:
1. On a scale of 0-10, how likely would you recommend this assistant to a friend? Respond with just the number.
2. In exactly 2 sentences, describe how the experience felt from your perspective as a user.

Format your response as:
NPS: [number]
SENTIMENT: [2 sentences]`
        }],
      }],
      config: {
        systemInstruction: syntheticUserPrompt,
        temperature: 0.5,
      },
    }, 'nps-scoring');

    const npsText = npsResponse.candidates?.[0]?.content?.parts
      ?.filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join('') || '';

    let score: number | null = null;
    let sentiment: string | null = null;

    const npsMatch = npsText.match(/NPS:\s*(\d+)/i);
    if (npsMatch) score = Math.min(10, Math.max(0, parseInt(npsMatch[1])));

    const sentMatch = npsText.match(/SENTIMENT:\s*(.+)/is);
    if (sentMatch) sentiment = sentMatch[1].trim().slice(0, 500);

    return {
      key: 'nps',
      label: 'NPS Score',
      score,
      passed: score !== null ? score >= 7 : null,
      details: sentiment,
      metadata: {
        sentiment,
        raw_response: npsText.slice(0, 1000),
      },
    };
  } catch (err) {
    logger.warn('NPS scorer failed', { error: (err as Error).message });
    return {
      key: 'nps',
      label: 'NPS Score',
      score: null,
      passed: null,
      details: `Scoring failed: ${(err as Error).message}`,
      metadata: { error: (err as Error).message },
    };
  }
};

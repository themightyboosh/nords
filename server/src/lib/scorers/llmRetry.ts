/**
 * llmRetry.ts — Shared retry wrapper for Gemini API calls in scorers.
 */

import logger from '../logger.js';

const MAX_API_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 2_000;

export async function retryGenerateContent(
  genai: any,
  params: any,
  label: string
): Promise<any> {
  for (let attempt = 1; attempt <= MAX_API_RETRIES; attempt++) {
    try {
      return await genai.models.generateContent(params);
    } catch (err: any) {
      const msg = err?.message || String(err);
      const isTransient = /fetch failed|ECONNRESET|socket hang up|503|429|DEADLINE_EXCEEDED/i.test(msg);
      if (!isTransient || attempt === MAX_API_RETRIES) throw err;
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn(`[Scorer] ${label}: transient error (attempt ${attempt}/${MAX_API_RETRIES}), retrying in ${delay}ms`, { error: msg });
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}

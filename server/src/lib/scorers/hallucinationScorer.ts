/**
 * hallucinationScorer.ts — Grounding auditor via LLM judge.
 *
 * Compares agent responses against the project's graph data
 * (nords + connections + properties) to detect fabricated claims.
 *
 * Requires: genai instance + project graph data in the DB.
 * Works for any session type — reads graph from DB at scoring time.
 */

import type { ScorerFn, ScorerResult, ScorerInput } from './types.js';
import { retryGenerateContent } from './llmRetry.js';
import { query } from '../../db.js';
import logger from '../logger.js';

export const hallucinationScorer: ScorerFn = async (input: ScorerInput): Promise<ScorerResult> => {
  const { projectId, transcript, genai, scoringModel } = input;

  if (!genai) {
    return {
      key: 'hallucination',
      label: 'Hallucination Audit',
      score: null,
      passed: null,
      details: 'No LLM configured for scoring',
      metadata: {},
    };
  }

  const agentMessages = transcript
    .map(r => r.agent_msg)
    .filter(Boolean)
    .join('\n---\n');

  if (agentMessages.length < 50) {
    return {
      key: 'hallucination',
      label: 'Hallucination Audit',
      score: null,
      passed: null,
      details: 'Conversation too short to audit',
      metadata: {},
    };
  }

  try {
    // Build graph snapshot from current DB state
    const graphNords = await query<{ title: string; type_name: string; properties: Record<string, unknown> }>(`
      SELECT n.title, nt.name AS type_name, n.properties
      FROM nords n JOIN nord_types nt ON nt.id = n.type_id
      WHERE n.project_id = $1 AND n.deleted_at IS NULL
      ORDER BY nt.name, n.title
    `, [projectId]);

    const graphConns = await query<{ source_title: string; target_title: string; type_name: string; direction: string; properties: Record<string, unknown> | null }>(`
      SELECT sn.title AS source_title, tn.title AS target_title, ct.name AS type_name, c.direction, c.properties
      FROM connections c
      JOIN nords sn ON sn.id = c.source_nord_id
      JOIN nords tn ON tn.id = c.target_nord_id
      JOIN connection_types ct ON ct.id = c.type_id
      WHERE c.project_id = $1 AND c.deleted_at IS NULL
    `, [projectId]);

    const snapshotLines: string[] = ['NORDS:'];
    for (const n of graphNords) {
      const propStr = n.properties && typeof n.properties === 'object'
        ? Object.entries(n.properties).map(([k, v]) => `${k}: ${v}`).join(', ')
        : '';
      snapshotLines.push(`- [${n.type_name}] "${n.title}"${propStr ? ` — ${propStr}` : ''}`);
    }
    snapshotLines.push('', 'CONNECTIONS (properties describe the relationship, not the nodes):');
    for (const c of graphConns) {
      const arrow = c.direction === 'both' ? '<-->' : '-->';
      const connPropStr = c.properties && typeof c.properties === 'object'
        ? Object.entries(c.properties)
            .filter(([, v]) => v != null && v !== '')
            .map(([k, v]) => `${k}: ${v}`).join(', ')
        : '';
      snapshotLines.push(`- "${c.source_title}" ${arrow}[${c.type_name}] "${c.target_title}"${connPropStr ? ` — ${connPropStr}` : ''}`);
    }
    const graphSnapshot = snapshotLines.join('\n');

    const hallResponse = await retryGenerateContent(genai, {
      model: scoringModel,
      contents: [{
        role: 'user',
        parts: [{
          text: `You are a grounding auditor. Review the AGENT's responses below and determine whether the factual claims about the project data are supported by the provided graph snapshot.

GRAPH SNAPSHOT:
${graphSnapshot}

AGENT RESPONSES:
${agentMessages}

Instructions:
1. Identify every factual claim the agent made about specific data (names, values, relationships, counts).
2. Check each claim against the graph snapshot. Note that connection properties (like Severity, Verification Status, Estimated Resolution) describe the RELATIONSHIP between two nords, not the nords themselves.
3. A claim is "grounded" if the graph contains supporting data. A claim is "hallucinated" if it cannot be traced to the graph.
4. ATTRIBUTION ERRORS: If the agent attributes a connection property to a node (e.g., says "the risk has Critical Path severity" when the graph shows "the risk BLOCKS the requirement with Severity: Critical Path"), this is a MINOR attribution error — the data IS grounded but the framing is imprecise. Score attribution errors as partially grounded, not fully hallucinated.
5. PARTIAL GROUNDING: A claim that combines grounded data with fabricated extensions should be scored as partially hallucinated — acknowledge the grounded portion but flag the fabricated extension.
6. Score 0-10 where 10 = every claim is grounded, 0 = every claim is fabricated.
7. Conversational phrases, suggestions, and questions are NOT claims — ignore them.

Format:
HALLUCINATION_SCORE: [0-10]
DETAILS: [Brief list of any hallucinated claims, or "None found" if fully grounded]`
        }],
      }],
      config: { temperature: 0.2 },
    }, 'hallucination-scoring');

    const hallText = hallResponse.candidates?.[0]?.content?.parts
      ?.filter((p: any) => p.text).map((p: any) => p.text).join('') || '';

    let score: number | null = null;
    let details: string | null = null;

    const scoreMatch = hallText.match(/HALLUCINATION_SCORE:\s*(\d+)/i);
    if (scoreMatch) score = Math.min(10, Math.max(0, parseInt(scoreMatch[1])));

    const detailMatch = hallText.match(/DETAILS:\s*(.+)/is);
    if (detailMatch) details = detailMatch[1].trim().slice(0, 1000);

    return {
      key: 'hallucination',
      label: 'Hallucination Audit',
      score,
      passed: score !== null ? score >= 7 : null,
      details,
      metadata: {
        nords_in_graph: graphNords.length,
        connections_in_graph: graphConns.length,
        agent_messages_audited: transcript.filter(r => r.agent_msg).length,
        raw_response: hallText.slice(0, 1000),
      },
    };
  } catch (err) {
    logger.warn('Hallucination scorer failed', { error: (err as Error).message });
    return {
      key: 'hallucination',
      label: 'Hallucination Audit',
      score: null,
      passed: null,
      details: `Scoring failed: ${(err as Error).message}`,
      metadata: { error: (err as Error).message },
    };
  }
};

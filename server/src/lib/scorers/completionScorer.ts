/**
 * completionScorer.ts — Goal + variable completion metrics.
 *
 * Measures two axes of session success:
 *   1. Goal completion percentage (total goals, completed, in-progress)
 *   2. Variable collection coverage (required vs optional, filled vs empty)
 *
 * Pure computation — no LLM call required.
 */

import type { ScorerFn, ScorerResult, ScorerInput } from './types.js';
import { query, queryOne } from '../../db.js';

interface GoalInfo {
  goal_id: string;
  goal_name: string;
  status: string;
}

interface VariableInfo {
  id: string;
  name: string;
  required: boolean;
  value: string | null;
  type: string;
  collection_group_name: string | null;
}

export const completionScorer: ScorerFn = async (input: ScorerInput): Promise<ScorerResult> => {
  const { sessionId, projectId } = input;

  // ── 1. Goal Completion ──
  const goals = await query<GoalInfo>(`
    SELECT sg.goal_id, g.name AS goal_name, sg.status
    FROM mcp_session_goals sg
    JOIN goals g ON g.id = sg.goal_id
    WHERE sg.session_id = $1
  `, [sessionId]);

  const goalsTotal = goals.length;
  const goalsCompleted = goals.filter(g => g.status === 'complete').length;
  const goalsActive = goals.filter(g => g.status === 'active').length;
  const goalsCancelled = goals.filter(g => g.status === 'cancelled').length;
  const goalPct = goalsTotal > 0 ? Math.round((goalsCompleted / goalsTotal) * 100) : null;

  // ── 2. Variable Collection ──
  // Get ALL project variables with their required flag
  const allVars = await query<{
    id: string; name: string; required: boolean; type: string;
    group_name: string | null;
  }>(`
    SELECT pv.id, pv.name, pv.required, pv.type,
           cg.name AS group_name
    FROM project_variables pv
    LEFT JOIN collection_groups cg ON cg.id = pv.collection_group_id
    WHERE pv.project_id = $1
    ORDER BY pv.sort_order, pv.created_at
  `, [projectId]);

  // Get values collected in this session
  const sessionVars = await query<{
    variable_id: string; value: string | null;
  }>(`
    SELECT variable_id, value
    FROM mcp_session_variables
    WHERE session_id = $1
  `, [sessionId]);

  const varValueMap = new Map<string, string | null>();
  for (const sv of sessionVars) {
    varValueMap.set(sv.variable_id, sv.value);
  }

  // Classify variables
  const variables: VariableInfo[] = allVars.map(v => ({
    id: v.id,
    name: v.name,
    required: v.required,
    value: varValueMap.get(v.id) ?? null,
    type: v.type,
    collection_group_name: v.group_name,
  }));

  const totalVars = variables.length;
  const requiredVars = variables.filter(v => v.required);
  const optionalVars = variables.filter(v => !v.required);

  const requiredFilled = requiredVars.filter(v => v.value != null && v.value !== '').length;
  const optionalFilled = optionalVars.filter(v => v.value != null && v.value !== '').length;
  const totalFilled = requiredFilled + optionalFilled;

  const requiredTotal = requiredVars.length;
  const optionalTotal = optionalVars.length;

  const requiredPct = requiredTotal > 0 ? Math.round((requiredFilled / requiredTotal) * 100) : null;
  const optionalPct = optionalTotal > 0 ? Math.round((optionalFilled / optionalTotal) * 100) : null;
  const totalPct = totalVars > 0 ? Math.round((totalFilled / totalVars) * 100) : null;

  // Missing required variables (for the details display)
  const missingRequired = requiredVars
    .filter(v => v.value == null || v.value === '')
    .map(v => v.name);

  // ── 3. Score Calculation ──
  // Weight: 40% goals + 60% variable coverage (required weighted 3x vs optional)
  let score: number;

  if (goalsTotal === 0 && totalVars === 0) {
    // Nothing to measure
    score = 5; // neutral
  } else {
    let goalScore = 0;
    let varScore = 0;
    let goalWeight = 0;
    let varWeight = 0;

    if (goalsTotal > 0) {
      goalScore = (goalsCompleted / goalsTotal) * 10;
      goalWeight = 0.4;
    }

    if (totalVars > 0) {
      // Required variables matter more than optional
      const reqWeight = requiredTotal > 0 ? 0.75 : 0;
      const optWeight = optionalTotal > 0 ? 0.25 : 0;
      const totalWeight = reqWeight + optWeight;

      const reqScore = requiredTotal > 0 ? (requiredFilled / requiredTotal) * 10 : 0;
      const optScore = optionalTotal > 0 ? (optionalFilled / optionalTotal) * 10 : 0;

      varScore = totalWeight > 0
        ? (reqScore * reqWeight + optScore * optWeight) / totalWeight
        : 0;
      varWeight = goalsTotal > 0 ? 0.6 : 1.0;
    } else {
      // No variables — all weight on goals
      goalWeight = 1.0;
    }

    const totalWeight = goalWeight + varWeight;
    score = totalWeight > 0
      ? Math.round(((goalScore * goalWeight) + (varScore * varWeight)) / totalWeight)
      : 5;
    score = Math.max(0, Math.min(10, score));
  }

  // ── 4. Build details string ──
  const detailParts: string[] = [];
  if (goalsTotal > 0) {
    detailParts.push(`Goals: ${goalsCompleted}/${goalsTotal} completed (${goalPct}%)`);
  }
  if (requiredTotal > 0) {
    detailParts.push(`Required vars: ${requiredFilled}/${requiredTotal} (${requiredPct}%)`);
  }
  if (optionalTotal > 0) {
    detailParts.push(`Optional vars: ${optionalFilled}/${optionalTotal} (${optionalPct}%)`);
  }
  if (missingRequired.length > 0 && missingRequired.length <= 5) {
    detailParts.push(`Missing: ${missingRequired.join(', ')}`);
  } else if (missingRequired.length > 5) {
    detailParts.push(`Missing: ${missingRequired.slice(0, 5).join(', ')} +${missingRequired.length - 5} more`);
  }

  const passed = (requiredTotal === 0 || requiredFilled === requiredTotal)
    && (goalsTotal === 0 || goalsCompleted === goalsTotal);

  return {
    key: 'completion',
    label: 'Completion',
    score,
    passed: (goalsTotal > 0 || totalVars > 0) ? passed : null,
    details: detailParts.length > 0 ? detailParts.join(' • ') : 'No goals or variables configured',
    metadata: {
      // Goal metrics
      goals_total: goalsTotal,
      goals_completed: goalsCompleted,
      goals_active: goalsActive,
      goals_cancelled: goalsCancelled,
      goal_pct: goalPct,
      goal_names: goals.map(g => ({ name: g.goal_name, status: g.status })),
      // Variable metrics — summary
      variables_total: totalVars,
      variables_filled: totalFilled,
      variables_pct: totalPct,
      // Required breakdown
      required_total: requiredTotal,
      required_filled: requiredFilled,
      required_pct: requiredPct,
      missing_required: missingRequired,
      // Optional breakdown
      optional_total: optionalTotal,
      optional_filled: optionalFilled,
      optional_pct: optionalPct,
      // Per-variable detail for the expanded view
      variable_details: variables.map(v => ({
        name: v.name,
        required: v.required,
        filled: v.value != null && v.value !== '',
        type: v.type,
        group: v.collection_group_name,
      })),
    },
  };
};

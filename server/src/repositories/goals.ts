import { query, queryOne } from '../db.js';
import type {
  Goal, GoalEdge, GoalVariableBinding, GoalRelevantNord,
  GoalRelevantNordType, PersonaGoalWeight,
} from '../types/entities.js';
import logger from '../lib/logger.js';

// ══════════════════════════════════════════════════════════
// Goals CRUD
// ══════════════════════════════════════════════════════════

export async function findByProject(projectId: string): Promise<Goal[]> {
  return query<Goal>(
    'SELECT * FROM goals WHERE project_id = $1 ORDER BY sort_order, created_at',
    [projectId]
  );
}

export async function findById(id: string): Promise<Goal | null> {
  return queryOne<Goal>('SELECT * FROM goals WHERE id = $1', [id]);
}

export async function create(goal: {
  project_id: string;
  name: string;
  description?: string;
  icon?: string;
  accent_color?: string;
  sort_order?: number;
  end_type?: 'reset' | 'continue' | null;
  achieved_prompt?: string | null;
  is_implicit?: boolean;
}): Promise<Goal> {
  return queryOne<Goal>(`
    INSERT INTO goals (project_id, name, description, icon, accent_color, sort_order, end_type, achieved_prompt, is_implicit)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    goal.project_id,
    goal.name,
    goal.description ?? '',
    goal.icon ?? 'Target',
    goal.accent_color ?? '#6366f1',
    goal.sort_order ?? 0,
    goal.end_type ?? null,
    goal.achieved_prompt ?? null,
    goal.is_implicit ?? false,
  ]) as Promise<Goal>;
}

export async function update(id: string, updates: Partial<Pick<Goal,
  'name' | 'description' | 'icon' | 'accent_color' | 'sort_order' |
  'end_type' | 'achieved_prompt' | 'prerequisite_gate' | 'fork_type'
>>): Promise<Goal | null> {
  const allowedKeys = [
    'name', 'description', 'icon', 'accent_color', 'sort_order',
    'end_type', 'achieved_prompt', 'prerequisite_gate', 'fork_type',
  ];

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (!allowedKeys.includes(key)) continue;
    setClauses.push(`${key} = $${paramIdx}`);
    values.push(value);
    paramIdx++;
  }

  if (setClauses.length === 0) return findById(id);

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  return queryOne<Goal>(`
    UPDATE goals SET ${setClauses.join(', ')}
    WHERE id = $${paramIdx}
    RETURNING *
  `, values);
}

export async function remove(id: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    'DELETE FROM goals WHERE id = $1 RETURNING id', [id]
  );
  return result !== null;
}

// ══════════════════════════════════════════════════════════
// Goal Edges — DAG connections
// ══════════════════════════════════════════════════════════

export async function findEdgesByProject(projectId: string): Promise<GoalEdge[]> {
  return query<GoalEdge>(
    'SELECT * FROM goal_edges WHERE project_id = $1 ORDER BY created_at',
    [projectId]
  );
}

/**
 * Check if adding an edge source→target would create a cycle.
 * A cycle exists if target can already reach source via existing forward edges.
 */
export function wouldCreateCycle(
  sourceId: string,
  targetId: string,
  edges: GoalEdge[]
): boolean {
  if (sourceId === targetId) return true;
  const visited = new Set<string>();
  const queue = [targetId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const edge of edges) {
      if (edge.source_goal_id === current) {
        if (edge.target_goal_id === sourceId) return true;
        queue.push(edge.target_goal_id);
      }
    }
  }
  return false;
}

export async function createEdge(
  projectId: string,
  sourceGoalId: string,
  targetGoalId: string
): Promise<GoalEdge> {
  // Guard: self-loop
  if (sourceGoalId === targetGoalId) {
    throw new Error('A goal cannot be its own prerequisite');
  }

  // Guard: cycle detection
  const existingEdges = await findEdgesByProject(projectId);
  if (wouldCreateCycle(sourceGoalId, targetGoalId, existingEdges)) {
    throw new Error('This edge would create a circular dependency');
  }

  return queryOne<GoalEdge>(`
    INSERT INTO goal_edges (project_id, source_goal_id, target_goal_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (source_goal_id, target_goal_id) DO NOTHING
    RETURNING *
  `, [projectId, sourceGoalId, targetGoalId]) as Promise<GoalEdge>;
}

export async function removeEdge(edgeId: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    'DELETE FROM goal_edges WHERE id = $1 RETURNING id', [edgeId]
  );
  return result !== null;
}

export async function removeEdgeByEndpoints(
  sourceGoalId: string,
  targetGoalId: string
): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    'DELETE FROM goal_edges WHERE source_goal_id = $1 AND target_goal_id = $2 RETURNING id',
    [sourceGoalId, targetGoalId]
  );
  return result !== null;
}

// ══════════════════════════════════════════════════════════
// Implicit Goal
// ══════════════════════════════════════════════════════════

/** Get or create the implicit goal for a project (auto-inferred collect mode) */
export async function ensureImplicitGoal(projectId: string): Promise<Goal> {
  const existing = await queryOne<Goal>(
    'SELECT * FROM goals WHERE project_id = $1 AND is_implicit = true',
    [projectId]
  );
  if (existing) return existing;

  return create({
    project_id: projectId,
    name: 'Complete All Required Variables',
    description: 'Automatically tracks all required project variables.',
    icon: 'ClipboardCheck',
    is_implicit: true,
  });
}

// ══════════════════════════════════════════════════════════
// Goal Variable Bindings (replaces goal_properties)
// ══════════════════════════════════════════════════════════

export async function findVariableBindingsByGoal(goalId: string): Promise<GoalVariableBinding[]> {
  return query<GoalVariableBinding>(
    'SELECT * FROM goal_variable_bindings WHERE goal_id = $1 ORDER BY created_at',
    [goalId]
  );
}

export async function addVariableBinding(
  goalId: string,
  variableId: string,
  required: boolean = true
): Promise<GoalVariableBinding | null> {
  return queryOne<GoalVariableBinding>(`
    INSERT INTO goal_variable_bindings (goal_id, variable_id, required)
    VALUES ($1, $2, $3)
    ON CONFLICT (goal_id, variable_id) DO NOTHING
    RETURNING *
  `, [goalId, variableId, required]);
}

export async function updateVariableBinding(
  bindingId: string,
  required: boolean
): Promise<GoalVariableBinding | null> {
  return queryOne<GoalVariableBinding>(`
    UPDATE goal_variable_bindings SET required = $2 WHERE id = $1 RETURNING *
  `, [bindingId, required]);
}

export async function removeVariableBinding(bindingId: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    'DELETE FROM goal_variable_bindings WHERE id = $1 RETURNING id', [bindingId]
  );
  return !!result;
}

// ══════════════════════════════════════════════════════════
// Goal Relevant Nords (bidirectional linking)
// ══════════════════════════════════════════════════════════

export async function findRelevantNords(goalId: string): Promise<GoalRelevantNord[]> {
  return query<GoalRelevantNord>(
    'SELECT * FROM goal_relevant_nords WHERE goal_id = $1',
    [goalId]
  );
}

export async function findGoalsByNord(nordId: string): Promise<Array<{ goal_id: string; goal_name: string }>> {
  return query<{ goal_id: string; goal_name: string }>(`
    SELECT grn.goal_id, g.name AS goal_name
    FROM goal_relevant_nords grn
    JOIN goals g ON g.id = grn.goal_id
    WHERE grn.nord_id = $1
  `, [nordId]);
}

export async function addRelevantNord(goalId: string, nordId: string): Promise<GoalRelevantNord | null> {
  return queryOne<GoalRelevantNord>(`
    INSERT INTO goal_relevant_nords (goal_id, nord_id)
    VALUES ($1, $2)
    ON CONFLICT (goal_id, nord_id) DO NOTHING
    RETURNING *
  `, [goalId, nordId]);
}

export async function removeRelevantNord(goalId: string, nordId: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    'DELETE FROM goal_relevant_nords WHERE goal_id = $1 AND nord_id = $2 RETURNING id',
    [goalId, nordId]
  );
  return !!result;
}

// ══════════════════════════════════════════════════════════
// Goal Relevant Nord Types
// ══════════════════════════════════════════════════════════

export async function findRelevantNordTypes(goalId: string): Promise<GoalRelevantNordType[]> {
  return query<GoalRelevantNordType>(
    'SELECT * FROM goal_relevant_nord_types WHERE goal_id = $1',
    [goalId]
  );
}

export async function addRelevantNordType(goalId: string, nordTypeId: string): Promise<GoalRelevantNordType | null> {
  return queryOne<GoalRelevantNordType>(`
    INSERT INTO goal_relevant_nord_types (goal_id, nord_type_id)
    VALUES ($1, $2)
    ON CONFLICT (goal_id, nord_type_id) DO NOTHING
    RETURNING *
  `, [goalId, nordTypeId]);
}

export async function removeRelevantNordType(goalId: string, nordTypeId: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    'DELETE FROM goal_relevant_nord_types WHERE goal_id = $1 AND nord_type_id = $2 RETURNING id',
    [goalId, nordTypeId]
  );
  return !!result;
}

// ══════════════════════════════════════════════════════════
// Persona Goal Weights
// ══════════════════════════════════════════════════════════

export async function findWeightsByPersona(personaId: string): Promise<PersonaGoalWeight[]> {
  return query<PersonaGoalWeight>(
    'SELECT * FROM persona_goal_weights WHERE persona_id = $1',
    [personaId]
  );
}

export async function findWeightsByGoal(goalId: string): Promise<PersonaGoalWeight[]> {
  return query<PersonaGoalWeight>(
    'SELECT * FROM persona_goal_weights WHERE goal_id = $1',
    [goalId]
  );
}

export async function upsertWeight(personaId: string, goalId: string, weight: number): Promise<PersonaGoalWeight> {
  return queryOne<PersonaGoalWeight>(`
    INSERT INTO persona_goal_weights (persona_id, goal_id, weight)
    VALUES ($1, $2, $3)
    ON CONFLICT (persona_id, goal_id) DO UPDATE SET weight = $3
    RETURNING *
  `, [personaId, goalId, weight]) as Promise<PersonaGoalWeight>;
}

// ══════════════════════════════════════════════════════════
// Combined Fetch — Goals + Variable Bindings + Relevant Nords
// ══════════════════════════════════════════════════════════

export interface GoalWithBindings extends Goal {
  variable_bindings: GoalVariableBinding[];
  relevant_nords: GoalRelevantNord[];
  relevant_nord_types: GoalRelevantNordType[];
}

export async function findByProjectWithBindings(projectId: string): Promise<GoalWithBindings[]> {
  const goals = await findByProject(projectId);
  if (goals.length === 0) return [];

  const goalIds = goals.map(g => g.id);

  const [allBindings, allRelevantNords, allRelevantTypes] = await Promise.all([
    query<GoalVariableBinding>(
      'SELECT * FROM goal_variable_bindings WHERE goal_id = ANY($1) ORDER BY created_at',
      [goalIds]
    ),
    query<GoalRelevantNord>(
      'SELECT * FROM goal_relevant_nords WHERE goal_id = ANY($1)',
      [goalIds]
    ),
    query<GoalRelevantNordType>(
      'SELECT * FROM goal_relevant_nord_types WHERE goal_id = ANY($1)',
      [goalIds]
    ),
  ]);

  const bindingsByGoal = new Map<string, GoalVariableBinding[]>();
  for (const b of allBindings) {
    const arr = bindingsByGoal.get(b.goal_id) || [];
    arr.push(b);
    bindingsByGoal.set(b.goal_id, arr);
  }

  const nordsByGoal = new Map<string, GoalRelevantNord[]>();
  for (const rn of allRelevantNords) {
    const arr = nordsByGoal.get(rn.goal_id) || [];
    arr.push(rn);
    nordsByGoal.set(rn.goal_id, arr);
  }

  const typesByGoal = new Map<string, GoalRelevantNordType[]>();
  for (const rt of allRelevantTypes) {
    const arr = typesByGoal.get(rt.goal_id) || [];
    arr.push(rt);
    typesByGoal.set(rt.goal_id, arr);
  }

  return goals.map(g => ({
    ...g,
    variable_bindings: bindingsByGoal.get(g.id) || [],
    relevant_nords: nordsByGoal.get(g.id) || [],
    relevant_nord_types: typesByGoal.get(g.id) || [],
  }));
}

/** @deprecated Use findByProjectWithBindings instead */
export async function findByProjectWithProperties(projectId: string) {
  return findByProjectWithBindings(projectId);
}

// ══════════════════════════════════════════════════════════
// Session Goal Initialization (auto-inferred mode)
// ══════════════════════════════════════════════════════════

/**
 * Initialize session goals when a session is created.
 *
 * Auto-inferred mode:
 * - No goals + no variables (graph_only): skip entirely
 * - No explicit goals + has variables: ensure implicit goal, 1 active session goal
 * - Has explicit goals (guided): create session goals
 *   - Root goals (no incoming edges) start as 'active'
 *   - Gated goals (have incoming edges) start as 'pending'
 */
export async function initializeSessionGoals(
  sessionId: string,
  projectId: string,
  _projectMode: string     // kept for signature compat, now auto-inferred
): Promise<void> {
  // Check if graph_only
  const project = await queryOne<{ graph_only: boolean }>(`
    SELECT graph_only FROM projects WHERE id = $1
  `, [projectId]);
  if (project?.graph_only) return;

  const projectGoals = await findByProject(projectId);
  const explicitGoals = projectGoals.filter(g => !g.is_implicit);

  // Check if there are variables
  const varCount = await queryOne<{ count: string }>(
    'SELECT COUNT(*) FROM project_variables WHERE project_id = $1',
    [projectId]
  );
  const hasVariables = parseInt(varCount?.count || '0', 10) > 0;

  if (explicitGoals.length === 0) {
    // No explicit goals — use implicit goal if there are variables
    if (!hasVariables) return;

    const implicitGoal = await ensureImplicitGoal(projectId);
    await query(`
      INSERT INTO mcp_session_goals (session_id, goal_id, status)
      VALUES ($1, $2, 'active')
      ON CONFLICT (session_id, goal_id) DO NOTHING
    `, [sessionId, implicitGoal.id]);
    return;
  }

  // Guided mode — find roots (goals with no incoming edges)
  const edges = await findEdgesByProject(projectId);
  const targetsWithIncoming = new Set(edges.map(e => e.target_goal_id));

  for (const goal of explicitGoals) {
    // Root goals = no incoming edges → active immediately
    const isRoot = !targetsWithIncoming.has(goal.id);
    const status = isRoot ? 'active' : 'pending';
    await query(`
      INSERT INTO mcp_session_goals (session_id, goal_id, status)
      VALUES ($1, $2, $3)
      ON CONFLICT (session_id, goal_id) DO NOTHING
    `, [sessionId, goal.id, status]);
  }
}

// ══════════════════════════════════════════════════════════
// Goal Evaluation Engine — Variable-based with DAG sequencing
// ══════════════════════════════════════════════════════════

export interface GoalEvent {
  type: 'goal_completed' | 'goal_activated' | 'goal_cancelled';
  goal_id: string;
  goal_name: string;
  achieved_prompt?: string | null;
  reason?: string;
  excluded_by_goal?: string;
  end_type?: 'reset' | 'continue' | null;
  progress?: { filled: number; required: number; total: number };
}

/**
 * Evaluate all session goals after a variable save.
 *
 * Variable-based evaluation with DAG sequencing:
 * 1. Check if any active goal's required variable bindings are all filled → complete it
 * 2. On completion: activate children (targets of outgoing edges) if ALL parents complete
 * 3. Structural exclusion: cancel sibling goals (other targets of same parent)
 * 4. If completed goal has end_type → include end_type on the goal_completed event
 */
export async function evaluateGoals(
  sessionId: string,
  projectId: string
): Promise<GoalEvent[]> {
  const events: GoalEvent[] = [];

  // Get all session goals still in play
  const sessionGoals = await query<{
    id: string; session_id: string; goal_id: string; status: string;
  }>(`
    SELECT * FROM mcp_session_goals
    WHERE session_id = $1 AND status IN ('active', 'pending')
  `, [sessionId]);

  if (sessionGoals.length === 0) return events;

  // Load goal definitions — include ALL goals (even completed parents) so we can
  // check fork_type on parents and prerequisite_gate on children
  const goals = await query<Goal>(
    'SELECT * FROM goals WHERE project_id = $1', [projectId]
  );
  const goalMap = new Map(goals.map(g => [g.id, g]));

  // Load all edges for the project
  const edges = await findEdgesByProject(projectId);

  // Load session variable values
  const sessionVars = await query<{ variable_id: string; value: unknown }>(`
    SELECT variable_id, value FROM mcp_session_variables WHERE session_id = $1
  `, [sessionId]);
  const filledVarIds = new Set(
    sessionVars
      .filter(sv => sv.value !== undefined && sv.value !== null && sv.value !== '')
      .map(sv => sv.variable_id)
  );

  // Evaluate each active goal
  for (const sg of sessionGoals) {
    if (sg.status !== 'active') continue;

    const goal = goalMap.get(sg.goal_id);
    if (!goal) continue;

    let isComplete = false;
    let completedData: Record<string, unknown> = {};
    let progress: GoalEvent['progress'];

    if (goal.is_implicit) {
      const result = await evaluateImplicitGoal(sessionId, projectId);
      isComplete = result.complete;
      completedData = result.data;
      progress = result.progress;
    } else {
      const result = await evaluateExplicitGoal(sg.goal_id, filledVarIds);
      isComplete = result.complete;
      completedData = result.data;
      progress = result.progress;
    }

    if (!isComplete) continue;

    // ── Goal completed! ──
    await query(`
      UPDATE mcp_session_goals
      SET status = 'complete', completed_data = $2, completed_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [sg.id, JSON.stringify(completedData)]);

    events.push({
      type: 'goal_completed',
      goal_id: goal.id,
      goal_name: goal.name,
      achieved_prompt: goal.achieved_prompt,
      end_type: goal.end_type || null,
      progress,
    });

    logger.info('goal.completed', {
      sessionId, projectId, goalId: goal.id,
      goalName: goal.name, endType: goal.end_type || null,
      progress,
    });

    // ── Structural exclusion: cancel sibling branches (opt-in per parent) ──
    // Only cancel siblings if the parent's fork_type is 'exclusive'.
    // Default (parallel) means all children coexist.
    const parentsOfCompleted = edges
      .filter(e => e.target_goal_id === goal.id)
      .map(e => e.source_goal_id);

    for (const parentId of parentsOfCompleted) {
      const parentGoal = goalMap.get(parentId);
      // Skip if parent uses parallel fork (the default)
      if (parentGoal?.fork_type !== 'exclusive') continue;

      const siblingTargets = edges
        .filter(e => e.source_goal_id === parentId && e.target_goal_id !== goal.id)
        .map(e => e.target_goal_id);

      if (siblingTargets.length === 0) continue;

      // Cancel siblings and all their descendants
      const toCancel = new Set<string>();
      const queue = [...siblingTargets];
      while (queue.length > 0) {
        const id = queue.shift()!;
        if (toCancel.has(id)) continue;
        toCancel.add(id);
        for (const e of edges) {
          if (e.source_goal_id === id) queue.push(e.target_goal_id);
        }
      }

      if (toCancel.size > 0) {
        const cancelledGoals = await query<{ id: string; goal_id: string }>(`
          UPDATE mcp_session_goals SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
          WHERE session_id = $1
            AND goal_id = ANY($2)
            AND status IN ('active', 'pending')
          RETURNING id, goal_id
        `, [sessionId, Array.from(toCancel)]);

        for (const cancelled of cancelledGoals) {
          const cancelledGoal = goalMap.get(cancelled.goal_id);
          events.push({
            type: 'goal_cancelled',
            goal_id: cancelled.goal_id,
            goal_name: cancelledGoal?.name || 'Unknown',
            reason: 'sibling_excluded',
            excluded_by_goal: goal.name,
          });
        }
      }
    }

    // ── Activate children (targets of outgoing edges from completed goal) ──
    const childTargets = edges
      .filter(e => e.source_goal_id === goal.id)
      .map(e => e.target_goal_id);

    if (childTargets.length > 0) {
      // For join nodes: check gate type (AND/OR) to determine activation
      for (const childId of childTargets) {
        const allParents = edges
          .filter(e => e.target_goal_id === childId)
          .map(e => e.source_goal_id);

        const parentStates = await query<{ goal_id: string; status: string }>(`
          SELECT goal_id, status FROM mcp_session_goals
          WHERE session_id = $1 AND goal_id = ANY($2)
        `, [sessionId, allParents]);

        // Check gate type: 'any' (OR) = first parent, 'all' (AND) = every parent
        const childGoal = goalMap.get(childId);
        const gateType = childGoal?.prerequisite_gate || 'all';

        const shouldActivate = gateType === 'any'
          ? allParents.some(pid =>
              parentStates.some(ps => ps.goal_id === pid && ps.status === 'complete')
            )
          : allParents.every(pid =>
              parentStates.some(ps => ps.goal_id === pid && ps.status === 'complete')
            );

        if (shouldActivate) {
          const promoted = await query<{ id: string; goal_id: string }>(`
            UPDATE mcp_session_goals SET status = 'active', updated_at = NOW()
            WHERE goal_id = $1 AND session_id = $2 AND status = 'pending'
            RETURNING id, goal_id
          `, [childId, sessionId]);

          for (const p of promoted) {
            const promotedGoal = goalMap.get(p.goal_id);
            events.push({
              type: 'goal_activated',
              goal_id: p.goal_id,
              goal_name: promotedGoal?.name || 'Unknown',
              reason: 'prerequisites_met',
            });

            logger.info('goal.activated', {
              sessionId, projectId, goalId: p.goal_id,
              goalName: promotedGoal?.name || 'Unknown',
              reason: 'prerequisites_met',
            });
          }
        }
      }
    }

    // end_type is now carried on the goal_completed event itself
  }

  return events;
}

/** Evaluate an implicit goal: all required project variables collected */
async function evaluateImplicitGoal(
  sessionId: string,
  projectId: string
): Promise<{ complete: boolean; data: Record<string, unknown>; progress: GoalEvent['progress'] }> {
  const requiredVars = await query<{ id: string; name: string }>(`
    SELECT id, name FROM project_variables
    WHERE project_id = $1 AND required = true
    ORDER BY sort_order
  `, [projectId]);

  if (requiredVars.length === 0) {
    return { complete: false, data: {}, progress: { filled: 0, required: 0, total: 0 } };
  }

  const filledVars = await query<{ variable_id: string }>(`
    SELECT variable_id FROM mcp_session_variables
    WHERE session_id = $1
      AND variable_id = ANY($2)
      AND value IS NOT NULL AND value != 'null'::jsonb
  `, [sessionId, requiredVars.map(v => v.id)]);

  const filledSet = new Set(filledVars.map(f => f.variable_id));
  const filled = filledSet.size;
  const required = requiredVars.length;

  // Also count total vars
  const totalVarsRow = await queryOne<{ count: string }>(
    'SELECT COUNT(*) FROM project_variables WHERE project_id = $1',
    [projectId]
  );
  const total = parseInt(totalVarsRow?.count || '0', 10);

  if (filled < required) {
    return {
      complete: false,
      data: { filled, required },
      progress: { filled, required, total },
    };
  }

  return {
    complete: true,
    data: { filled, required, total_variables: total },
    progress: { filled, required, total },
  };
}

/**
 * Evaluate an explicit goal: all REQUIRED variable bindings have values.
 *
 * A goal completes when all its required variable bindings are filled.
 * Non-required bindings are tracked but don't block completion.
 */
async function evaluateExplicitGoal(
  goalId: string,
  filledVarIds: Set<string>
): Promise<{ complete: boolean; data: Record<string, unknown>; progress: GoalEvent['progress'] }> {
  const bindings = await query<GoalVariableBinding>(
    'SELECT * FROM goal_variable_bindings WHERE goal_id = $1', [goalId]
  );

  if (bindings.length === 0) return {
    complete: false,
    data: {},
    progress: { filled: 0, required: 0, total: 0 },
  };

  const requiredBindings = bindings.filter(b => b.required);
  const totalBindings = bindings.length;
  const filledCount = bindings.filter(b => filledVarIds.has(b.variable_id)).length;
  const requiredFilledCount = requiredBindings.filter(b => filledVarIds.has(b.variable_id)).length;

  const progress = {
    filled: filledCount,
    required: requiredBindings.length,
    total: totalBindings,
  };

  if (requiredBindings.length === 0) {
    // No required bindings — goal can't auto-complete
    return { complete: false, data: {}, progress };
  }

  if (requiredFilledCount < requiredBindings.length) {
    return { complete: false, data: { filled: requiredFilledCount, required: requiredBindings.length }, progress };
  }

  // All required variables filled
  const data: Record<string, unknown> = {
    filled: filledCount,
    required: requiredBindings.length,
    total: totalBindings,
  };

  return { complete: true, data, progress };
}

// ══════════════════════════════════════════════════════════
// Session Goals Query (for AI tool) — variable-based
// ══════════════════════════════════════════════════════════

export interface SessionGoalState {
  goal_id: string;
  goal_name: string;
  goal_icon: string;
  status: string;
  is_implicit: boolean;
  end_type: 'reset' | 'continue' | null;
  achieved_prompt: string | null;
  persona_weight: number | null;
  variables: Array<{
    variable_id: string;
    variable_name: string;
    variable_type: string;
    required: boolean;
    collected: boolean;
    value: unknown;
    tags: string[];
  }>;
}

/**
 * Get all session goals with variable completion status for the AI.
 * Optionally accepts personaId to sort by persona goal weight.
 */
export async function findSessionGoals(
  sessionId: string,
  _projectId: string,
  personaId?: string | null
): Promise<SessionGoalState[]> {
  const rows = await query<{
    goal_id: string; goal_name: string; goal_icon: string;
    status: string; is_implicit: boolean; end_type: string | null;
    achieved_prompt: string | null;
  }>(`
    SELECT sg.goal_id, g.name AS goal_name, g.icon AS goal_icon,
           sg.status, g.is_implicit, g.end_type, g.achieved_prompt
    FROM mcp_session_goals sg
    JOIN goals g ON g.id = sg.goal_id
    WHERE sg.session_id = $1
    ORDER BY g.sort_order, g.created_at
  `, [sessionId]);

  const goalIds = rows.filter(r => !r.is_implicit).map(r => r.goal_id);

  // Load variable bindings with variable metadata
  const bindings = goalIds.length > 0
    ? await query<GoalVariableBinding & { variable_name: string; variable_type: string; tags: string[] }>(`
        SELECT gvb.*, pv.name AS variable_name, pv.type AS variable_type, pv.tags
        FROM goal_variable_bindings gvb
        JOIN project_variables pv ON pv.id = gvb.variable_id
        WHERE gvb.goal_id = ANY($1)
        ORDER BY gvb.created_at
      `, [goalIds])
    : [];

  // Load session variables
  const sessionVars = await query<{ variable_id: string; value: unknown }>(`
    SELECT variable_id, value FROM mcp_session_variables WHERE session_id = $1
  `, [sessionId]);
  const sessionVarMap = new Map(sessionVars.map(sv => [sv.variable_id, sv.value]));

  // Load persona weights if persona is active
  const personaWeights = new Map<string, number>();
  if (personaId) {
    const weights = await findWeightsByPersona(personaId);
    for (const w of weights) {
      personaWeights.set(w.goal_id, w.weight);
    }
  }

  const bindingsByGoal = new Map<string, typeof bindings>();
  for (const b of bindings) {
    const arr = bindingsByGoal.get(b.goal_id) || [];
    arr.push(b);
    bindingsByGoal.set(b.goal_id, arr);
  }

  const result = rows.map(row => {
    const goalBindings = bindingsByGoal.get(row.goal_id) || [];
    const variables = goalBindings.map(b => {
      const value = sessionVarMap.get(b.variable_id) ?? null;
      return {
        variable_id: b.variable_id,
        variable_name: b.variable_name,
        variable_type: b.variable_type,
        required: b.required,
        collected: value !== undefined && value !== null && value !== '',
        value,
        tags: b.tags || [],
      };
    });

    return {
      goal_id: row.goal_id,
      goal_name: row.goal_name,
      goal_icon: row.goal_icon,
      status: row.status,
      is_implicit: row.is_implicit,
      end_type: (row.end_type as 'reset' | 'continue') || null,
      achieved_prompt: row.achieved_prompt,
      persona_weight: personaWeights.get(row.goal_id) ?? null,
      variables,
    };
  });

  // Sort by persona weight (descending) if persona is active
  if (personaId) {
    result.sort((a, b) => (b.persona_weight ?? 0) - (a.persona_weight ?? 0));
  }

  return result;
}

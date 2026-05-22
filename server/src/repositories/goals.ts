import { query, queryOne } from '../db.js';
import type { Goal, GoalEdge, GoalProperty, PersonaGoalWeight } from '../types/entities.js';

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
  'end_type' | 'achieved_prompt'
>>): Promise<Goal | null> {
  const allowedKeys = [
    'name', 'description', 'icon', 'accent_color', 'sort_order',
    'end_type', 'achieved_prompt',
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

export async function createEdge(
  projectId: string,
  sourceGoalId: string,
  targetGoalId: string
): Promise<GoalEdge> {
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

/** Get or create the implicit goal for a project (Collect mode) */
export async function ensureImplicitGoal(projectId: string): Promise<Goal> {
  const existing = await queryOne<Goal>(
    'SELECT * FROM goals WHERE project_id = $1 AND is_implicit = true',
    [projectId]
  );
  if (existing) return existing;

  return create({
    project_id: projectId,
    name: 'Complete All Required Fields',
    description: 'Automatically tracks all required MCP properties across all nords.',
    icon: 'ClipboardCheck',
    is_implicit: true,
  });
}

// ══════════════════════════════════════════════════════════
// Goal Properties
// ══════════════════════════════════════════════════════════

export async function findPropertiesByGoal(goalId: string): Promise<GoalProperty[]> {
  return query<GoalProperty>(
    'SELECT * FROM goal_properties WHERE goal_id = $1 ORDER BY created_at',
    [goalId]
  );
}

export async function addProperty(goalId: string, nordId: string, propertyName: string): Promise<GoalProperty> {
  return queryOne<GoalProperty>(`
    INSERT INTO goal_properties (goal_id, nord_id, property_name)
    VALUES ($1, $2, $3)
    ON CONFLICT (goal_id, nord_id, property_name) DO NOTHING
    RETURNING *
  `, [goalId, nordId, propertyName]) as Promise<GoalProperty>;
}

export async function removeProperty(propertyId: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    'DELETE FROM goal_properties WHERE id = $1 RETURNING id', [propertyId]
  );
  return result !== null;
}

/** Check if a nord is bound to any goals (for deletion protection) */
export async function findGoalsByNord(nordId: string): Promise<Array<{ goal_name: string; goal_id: string }>> {
  return query<{ goal_name: string; goal_id: string }>(`
    SELECT DISTINCT g.name AS goal_name, g.id AS goal_id
    FROM goal_properties gp
    JOIN goals g ON g.id = gp.goal_id
    WHERE gp.nord_id = $1
  `, [nordId]);
}

// ══════════════════════════════════════════════════════════
// Combined Fetch — Goals + Edges + Properties
// ══════════════════════════════════════════════════════════

export interface GoalWithProperties extends Goal {
  properties: GoalProperty[];
}

export async function findByProjectWithProperties(projectId: string): Promise<GoalWithProperties[]> {
  const goals = await findByProject(projectId);
  if (goals.length === 0) return [];

  const goalIds = goals.map(g => g.id);
  const allProps = await query<GoalProperty>(
    'SELECT * FROM goal_properties WHERE goal_id = ANY($1) ORDER BY created_at',
    [goalIds]
  );

  const propsByGoal = new Map<string, GoalProperty[]>();
  for (const prop of allProps) {
    const arr = propsByGoal.get(prop.goal_id) || [];
    arr.push(prop);
    propsByGoal.set(prop.goal_id, arr);
  }

  return goals.map(g => ({
    ...g,
    properties: propsByGoal.get(g.id) || [],
  }));
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

export async function upsertWeight(personaId: string, goalId: string, weight: number): Promise<PersonaGoalWeight> {
  return queryOne<PersonaGoalWeight>(`
    INSERT INTO persona_goal_weights (persona_id, goal_id, weight)
    VALUES ($1, $2, $3)
    ON CONFLICT (persona_id, goal_id) DO UPDATE SET weight = $3
    RETURNING *
  `, [personaId, goalId, weight]) as Promise<PersonaGoalWeight>;
}

// ══════════════════════════════════════════════════════════
// Session Goal Initialization
// ══════════════════════════════════════════════════════════

/**
 * Initialize session goals when a session is created.
 *
 * - Collect mode: ensure implicit goal, create 1 active session goal
 * - Guided mode: create session goals for all explicit goals
 *   - Root goals (no incoming edges) start as 'active'
 *   - Gated goals (have incoming edges) start as 'pending'
 * - Guided with no goals: falls back to Collect behavior
 */
export async function initializeSessionGoals(
  sessionId: string,
  projectId: string,
  projectMode: string
): Promise<void> {
  if (projectMode === 'explore') return;

  const projectGoals = await findByProject(projectId);
  const explicitGoals = projectGoals.filter(g => !g.is_implicit);

  if (projectMode === 'collect' || explicitGoals.length === 0) {
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
// Goal Evaluation Engine — DAG-based with structural exclusion
// ══════════════════════════════════════════════════════════

export interface GoalEvent {
  type: 'goal_completed' | 'goal_activated' | 'goal_cancelled' | 'session_terminating';
  goal_id: string;
  goal_name: string;
  achieved_prompt?: string | null;
  reason?: string;
  excluded_by_goal?: string;
  end_type?: 'reset' | 'continue' | null;
}

/**
 * Evaluate all session goals after a property save.
 *
 * DAG evaluation with structural exclusion:
 * 1. Check if any active goal's bound properties are all filled → complete it
 * 2. On completion: activate children (targets of outgoing edges)
 * 3. Structural exclusion: cancel sibling goals (other targets of same parent)
 * 4. If completed goal has end_type → fire session_terminating
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

  // Load goal definitions
  const goalIds = sessionGoals.map(sg => sg.goal_id);
  const goals = await query<Goal>(
    'SELECT * FROM goals WHERE id = ANY($1)', [goalIds]
  );
  const goalMap = new Map(goals.map(g => [g.id, g]));

  // Load all edges for the project
  const edges = await findEdgesByProject(projectId);

  // Load session nords for property value lookup
  const sessionNords = await query<{ nord_id: string; properties: Record<string, unknown> }>(`
    SELECT nord_id, properties FROM mcp_session_nords WHERE session_id = $1
  `, [sessionId]);
  const sessionNordProps = new Map(sessionNords.map(sn => [sn.nord_id, sn.properties]));

  // Evaluate each active goal
  for (const sg of sessionGoals) {
    if (sg.status !== 'active') continue;

    const goal = goalMap.get(sg.goal_id);
    if (!goal) continue;

    let isComplete = false;
    let completedData: Record<string, unknown> = {};

    if (goal.is_implicit) {
      isComplete = await evaluateImplicitGoal(sessionId, projectId, completedData);
    } else {
      isComplete = await evaluateExplicitGoal(sg.goal_id, sessionNordProps, completedData);
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
    });

    // ── Structural exclusion: cancel sibling branches ──
    // Find all parents of the completed goal
    const parentsOfCompleted = edges
      .filter(e => e.target_goal_id === goal.id)
      .map(e => e.source_goal_id);

    // For each parent, find sibling targets and cancel them
    for (const parentId of parentsOfCompleted) {
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
        // Add children of this node to the queue (cascade down)
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
      // For join nodes: only activate if ALL parents are complete
      for (const childId of childTargets) {
        const allParents = edges
          .filter(e => e.target_goal_id === childId)
          .map(e => e.source_goal_id);

        // Check if all parents are complete
        const parentStates = await query<{ goal_id: string; status: string }>(`
          SELECT goal_id, status FROM mcp_session_goals
          WHERE session_id = $1 AND goal_id = ANY($2)
        `, [sessionId, allParents]);

        const allParentsComplete = allParents.every(pid =>
          parentStates.some(ps => ps.goal_id === pid && ps.status === 'complete')
        );

        if (allParentsComplete) {
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
          }
        }
      }
    }

    // ── Check end_type ──
    if (goal.end_type) {
      events.push({
        type: 'session_terminating',
        goal_id: goal.id,
        goal_name: goal.name,
        achieved_prompt: goal.achieved_prompt,
        end_type: goal.end_type,
      });
    }
  }

  return events;
}

/** Evaluate an implicit goal: all required MCP properties across all nords */
async function evaluateImplicitGoal(
  sessionId: string,
  _projectId: string,
  completedData: Record<string, unknown>
): Promise<boolean> {
  const incomplete = await query<{ nord_id: string; title: string }>(`
    SELECT sn.nord_id, n.title
    FROM mcp_session_nords sn
    JOIN nords n ON n.id = sn.nord_id
    WHERE sn.session_id = $1
      AND sn.complete = false
      AND sn.required_count > 0
  `, [sessionId]);

  if (incomplete.length > 0) return false;

  completedData.total_nords_completed = await query<{ count: string }>(
    'SELECT COUNT(*) FROM mcp_session_nords WHERE session_id = $1 AND complete = true',
    [sessionId]
  ).then(rows => parseInt(rows[0]?.count || '0', 10));

  return true;
}

/**
 * Evaluate an explicit goal: all bound properties have values.
 *
 * MCP properties are shared globally by key name — if "Name" is collected
 * on ANY session nord, it counts as known for goal bindings on every nord.
 * The bound nord is checked first (direct match), then falls back to global lookup.
 * Filled values always win over empty ones.
 */
async function evaluateExplicitGoal(
  goalId: string,
  sessionNordProps: Map<string, Record<string, unknown>>,
  completedData: Record<string, unknown>
): Promise<boolean> {
  const bindings = await query<GoalProperty>(
    'SELECT * FROM goal_properties WHERE goal_id = $1', [goalId]
  );

  if (bindings.length === 0) return false;

  // Build global property lookup — shared by key name across all session nords
  const globalProps = new Map<string, { value: unknown; source_nord_id: string }>();
  for (const [nordId, props] of sessionNordProps) {
    for (const [key, value] of Object.entries(props)) {
      if (value !== undefined && value !== null && value !== '') {
        if (!globalProps.has(key)) {
          globalProps.set(key, { value, source_nord_id: nordId });
        }
      }
    }
  }

  for (const binding of bindings) {
    // Check the bound nord first (direct match preferred)
    const nordProps = sessionNordProps.get(binding.nord_id);
    const localValue = nordProps?.[binding.property_name];
    if (localValue !== undefined && localValue !== null && localValue !== '') {
      completedData[`${binding.nord_id}.${binding.property_name}`] = localValue;
      continue;
    }

    // Global fallback — any session nord with this property name
    const globalMatch = globalProps.get(binding.property_name);
    if (globalMatch) {
      completedData[`${binding.nord_id}.${binding.property_name}`] = globalMatch.value;
      completedData[`${binding.nord_id}.${binding.property_name}._global_source`] = globalMatch.source_nord_id;
      continue;
    }

    // Not collected anywhere — goal is incomplete
    return false;
  }

  return true;
}

// ══════════════════════════════════════════════════════════
// Session Goals Query (for AI tool)
// ══════════════════════════════════════════════════════════

export interface SessionGoalState {
  goal_id: string;
  goal_name: string;
  goal_icon: string;
  status: string;
  is_implicit: boolean;
  end_type: 'reset' | 'continue' | null;
  achieved_prompt: string | null;
  properties: Array<{
    nord_id: string;
    nord_title: string;
    property_name: string;
    collected: boolean;
    value: unknown;
  }>;
}

/** Get all session goals with property completion status for the AI */
export async function findSessionGoals(
  sessionId: string,
  _projectId: string
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
  const bindings = goalIds.length > 0
    ? await query<GoalProperty & { nord_title: string }>(`
        SELECT gp.*, n.title AS nord_title
        FROM goal_properties gp
        JOIN nords n ON n.id = gp.nord_id
        WHERE gp.goal_id = ANY($1)
        ORDER BY gp.created_at
      `, [goalIds])
    : [];

  const sessionNords = await query<{ nord_id: string; properties: Record<string, unknown> }>(
    'SELECT nord_id, properties FROM mcp_session_nords WHERE session_id = $1',
    [sessionId]
  );
  const sessionNordProps = new Map(sessionNords.map(sn => [sn.nord_id, sn.properties]));

  const bindingsByGoal = new Map<string, typeof bindings>();
  for (const b of bindings) {
    const arr = bindingsByGoal.get(b.goal_id) || [];
    arr.push(b);
    bindingsByGoal.set(b.goal_id, arr);
  }

  // Build global property lookup (same logic as evaluateExplicitGoal)
  const globalProps = new Map<string, unknown>();
  for (const [, props] of sessionNordProps) {
    for (const [key, value] of Object.entries(props)) {
      if (value !== undefined && value !== null && value !== '') {
        if (!globalProps.has(key)) globalProps.set(key, value);
      }
    }
  }

  return rows.map(row => {
    const goalBindings = bindingsByGoal.get(row.goal_id) || [];
    const properties = goalBindings.slice(0, 5).map(b => {
      // Check bound nord first, then global fallback
      const nordProps = sessionNordProps.get(b.nord_id) || {};
      const localValue = nordProps[b.property_name];
      const value = (localValue !== undefined && localValue !== null && localValue !== '')
        ? localValue
        : globalProps.get(b.property_name) ?? null;
      return {
        nord_id: b.nord_id,
        nord_title: b.nord_title,
        property_name: b.property_name,
        collected: value !== undefined && value !== null && value !== '',
        value,
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
      properties,
    };
  });
}

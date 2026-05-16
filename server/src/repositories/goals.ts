import { query, queryOne } from '../db.js';
import type { Goal, GoalProperty, PersonaGoalWeight } from '../types/entities.js';

// ── Goals CRUD ──

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
  is_default?: boolean;
  terminates?: boolean;
  achieved_prompt?: string | null;
  exclusion_group?: string | null;
  requires_goal_id?: string | null;
  is_implicit?: boolean;
}): Promise<Goal> {
  return queryOne<Goal>(`
    INSERT INTO goals (project_id, name, description, icon, accent_color, sort_order, is_default, terminates, achieved_prompt, exclusion_group, requires_goal_id, is_implicit)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    goal.project_id,
    goal.name,
    goal.description ?? '',
    goal.icon ?? '🎯',
    goal.accent_color ?? '#6366f1',
    goal.sort_order ?? 0,
    goal.is_default ?? false,
    goal.terminates ?? false,
    goal.achieved_prompt ?? null,
    goal.exclusion_group ?? null,
    goal.requires_goal_id ?? null,
    goal.is_implicit ?? false,
  ]) as Promise<Goal>;
}

export async function update(id: string, updates: Partial<Pick<Goal,
  'name' | 'description' | 'icon' | 'accent_color' | 'sort_order' |
  'is_default' | 'terminates' | 'achieved_prompt' | 'exclusion_group' |
  'requires_goal_id'
>>): Promise<Goal | null> {
  const allowedKeys = [
    'name', 'description', 'icon', 'accent_color', 'sort_order',
    'is_default', 'terminates', 'achieved_prompt', 'exclusion_group',
    'requires_goal_id',
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

// ── Implicit Goal ──

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
    icon: '📋',
    is_implicit: true,
    is_default: true,
  });
}

// ── Goal Properties ──

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

// ── Goal with properties (combined fetch) ──

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

// ── Persona Goal Weights ──

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

// ── Session Goal Initialization ──

/**
 * Initialize session goals when a session is created.
 * - Collect mode: ensure implicit goal, create 1 active session goal
 * - Guided mode: create session goals for all project goals
 *   - Goals with requires_goal_id start as 'pending'
 *   - Goals without prerequisites start as 'active'
 * - Guided with no goals: falls back to Collect behavior (implicit goal)
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
    // Collect mode or Guided with no goals → use implicit goal
    const implicitGoal = await ensureImplicitGoal(projectId);
    await query(`
      INSERT INTO mcp_session_goals (session_id, goal_id, status)
      VALUES ($1, $2, 'active')
      ON CONFLICT (session_id, goal_id) DO NOTHING
    `, [sessionId, implicitGoal.id]);
    return;
  }

  // Guided mode with explicit goals
  for (const goal of explicitGoals) {
    const status = goal.requires_goal_id ? 'pending' : 'active';
    await query(`
      INSERT INTO mcp_session_goals (session_id, goal_id, status)
      VALUES ($1, $2, $3)
      ON CONFLICT (session_id, goal_id) DO NOTHING
    `, [sessionId, goal.id, status]);
  }
}

// ── Goal Evaluation Engine ──

export interface GoalEvent {
  type: 'goal_completed' | 'goal_activated' | 'goal_cancelled' | 'session_terminating';
  goal_id: string;
  goal_name: string;
  achieved_prompt?: string | null;
  reason?: string;
  excluded_by_goal?: string;
  exclusion_group?: string;
  prerequisite?: string;
}

/**
 * Evaluate all session goals after a property save.
 *
 * For explicit goals: checks if all bound properties have values in session_nords.
 * For implicit goals: checks all required MCP properties across all nords.
 *
 * On completion: snapshots data, cancels exclusion siblings, promotes dependents,
 * fires session_terminating if all goals are done.
 */
export async function evaluateGoals(
  sessionId: string,
  projectId: string
): Promise<GoalEvent[]> {
  const events: GoalEvent[] = [];

  // Get all session goals that are still in play
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

  // Load all session nords for this session
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
      // Implicit goal: check ALL required MCP properties across all nords
      isComplete = await evaluateImplicitGoal(sessionId, projectId, completedData);
    } else {
      // Explicit goal: check bound properties
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

    // ── Cancel exclusion siblings ──
    if (goal.exclusion_group) {
      const cancelledGoals = await query<{ id: string; goal_id: string }>(`
        UPDATE mcp_session_goals SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
        WHERE session_id = $1
          AND goal_id IN (SELECT id FROM goals WHERE exclusion_group = $2 AND id != $3)
          AND status IN ('active', 'pending')
        RETURNING id, goal_id
      `, [sessionId, goal.exclusion_group, goal.id]);

      for (const cancelled of cancelledGoals) {
        const cancelledGoal = goalMap.get(cancelled.goal_id);
        events.push({
          type: 'goal_cancelled',
          goal_id: cancelled.goal_id,
          goal_name: cancelledGoal?.name || 'Unknown',
          reason: 'excluded_by',
          excluded_by_goal: goal.name,
          exclusion_group: goal.exclusion_group,
        });
      }
    }

    // ── Promote dependents ──
    const promoted = await query<{ id: string; goal_id: string }>(`
      UPDATE mcp_session_goals SET status = 'active', updated_at = NOW()
      WHERE goal_id IN (SELECT id FROM goals WHERE requires_goal_id = $1)
        AND session_id = $2
        AND status = 'pending'
      RETURNING id, goal_id
    `, [goal.id, sessionId]);

    for (const p of promoted) {
      const promotedGoal = goalMap.get(p.goal_id);
      events.push({
        type: 'goal_activated',
        goal_id: p.goal_id,
        goal_name: promotedGoal?.name || 'Unknown',
        reason: 'prerequisite_met',
        prerequisite: goal.name,
      });
    }
  }

  // ── Check if ALL goals are resolved (complete or cancelled) ──
  if (events.some(e => e.type === 'goal_completed')) {
    const remaining = await query<{ id: string }>(`
      SELECT id FROM mcp_session_goals
      WHERE session_id = $1 AND status IN ('active', 'pending')
    `, [sessionId]);

    if (remaining.length === 0) {
      // Find the last completed goal that terminates
      const terminatingGoal = events.find(e =>
        e.type === 'goal_completed' && goalMap.get(e.goal_id)?.terminates
      );

      events.push({
        type: 'session_terminating',
        goal_id: terminatingGoal?.goal_id || events[0].goal_id,
        goal_name: terminatingGoal?.goal_name || 'All Goals',
        achieved_prompt: terminatingGoal?.achieved_prompt || null,
      });
    }
  }

  return events;
}

/** Evaluate an implicit goal: all required MCP properties across all nords */
async function evaluateImplicitGoal(
  sessionId: string,
  projectId: string,
  completedData: Record<string, unknown>
): Promise<boolean> {
  // Check if any required MCP field is still unfilled
  const incomplete = await query<{ nord_id: string; title: string }>(`
    SELECT sn.nord_id, n.title
    FROM mcp_session_nords sn
    JOIN nords n ON n.id = sn.nord_id
    WHERE sn.session_id = $1
      AND sn.complete = false
      AND sn.required_count > 0
  `, [sessionId]);

  if (incomplete.length > 0) return false;

  // All complete — snapshot summary
  completedData.total_nords_completed = await query<{ count: string }>(
    'SELECT COUNT(*) FROM mcp_session_nords WHERE session_id = $1 AND complete = true',
    [sessionId]
  ).then(rows => parseInt(rows[0]?.count || '0', 10));

  return true;
}

/** Evaluate an explicit goal: all bound properties have values */
async function evaluateExplicitGoal(
  goalId: string,
  sessionNordProps: Map<string, Record<string, unknown>>,
  completedData: Record<string, unknown>
): Promise<boolean> {
  const bindings = await query<GoalProperty>(
    'SELECT * FROM goal_properties WHERE goal_id = $1', [goalId]
  );

  if (bindings.length === 0) return false; // No bindings = can't complete

  for (const binding of bindings) {
    const nordProps = sessionNordProps.get(binding.nord_id);
    if (!nordProps) return false;

    const value = nordProps[binding.property_name];
    if (value === undefined || value === null || value === '') return false;

    // Snapshot the collected value
    completedData[`${binding.nord_id}.${binding.property_name}`] = value;
  }

  return true; // All bindings satisfied
}

// ── Session Goals Query (for AI tool) ──

export interface SessionGoalState {
  goal_id: string;
  goal_name: string;
  goal_icon: string;
  status: string;
  is_implicit: boolean;
  terminates: boolean;
  exclusion_group: string | null;
  requires_goal_id: string | null;
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
  projectId: string
): Promise<SessionGoalState[]> {
  // Session goals with goal details
  const rows = await query<{
    goal_id: string; goal_name: string; goal_icon: string;
    status: string; is_implicit: boolean; terminates: boolean;
    exclusion_group: string | null; requires_goal_id: string | null;
    achieved_prompt: string | null;
  }>(`
    SELECT sg.goal_id, g.name AS goal_name, g.icon AS goal_icon,
           sg.status, g.is_implicit, g.terminates,
           g.exclusion_group, g.requires_goal_id, g.achieved_prompt
    FROM mcp_session_goals sg
    JOIN goals g ON g.id = sg.goal_id
    WHERE sg.session_id = $1
    ORDER BY g.sort_order, g.created_at
  `, [sessionId]);

  // Get all goal property bindings
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

  // Get session nords for property value lookup
  const sessionNords = await query<{ nord_id: string; properties: Record<string, unknown> }>(
    'SELECT nord_id, properties FROM mcp_session_nords WHERE session_id = $1',
    [sessionId]
  );
  const sessionNordProps = new Map(sessionNords.map(sn => [sn.nord_id, sn.properties]));

  // Group bindings by goal
  const bindingsByGoal = new Map<string, typeof bindings>();
  for (const b of bindings) {
    const arr = bindingsByGoal.get(b.goal_id) || [];
    arr.push(b);
    bindingsByGoal.set(b.goal_id, arr);
  }

  return rows.map(row => {
    const goalBindings = bindingsByGoal.get(row.goal_id) || [];
    // Cap properties at 5 for token budget
    const properties = goalBindings.slice(0, 5).map(b => {
      const nordProps = sessionNordProps.get(b.nord_id) || {};
      const value = nordProps[b.property_name];
      return {
        nord_id: b.nord_id,
        nord_title: b.nord_title,
        property_name: b.property_name,
        collected: value !== undefined && value !== null && value !== '',
        value: value ?? null,
      };
    });

    return {
      goal_id: row.goal_id,
      goal_name: row.goal_name,
      goal_icon: row.goal_icon,
      status: row.status,
      is_implicit: row.is_implicit,
      terminates: row.terminates,
      exclusion_group: row.exclusion_group,
      requires_goal_id: row.requires_goal_id,
      achieved_prompt: row.achieved_prompt,
      properties,
    };
  });
}


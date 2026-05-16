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

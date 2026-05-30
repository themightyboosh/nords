/**
 * useGoals.ts — Fetches and manages goals + edges for a project.
 *
 * Returns the goals list, edges list, loading state, and mutation functions.
 * Goals now use variable bindings, relevant nords/types, and persona weights.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

// ── Types ──

export interface GoalVariableBinding {
  id: string;
  goal_id: string;
  variable_id: string;
  required: boolean;
  created_at: string;
}

export interface GoalRelevantNord {
  id: string;
  goal_id: string;
  nord_id: string;
}

export interface GoalRelevantNordType {
  id: string;
  goal_id: string;
  nord_type_id: string;
}

export interface PersonaGoalWeight {
  id: string;
  persona_id: string;
  goal_id: string;
  weight: number;
}

export interface Goal {
  id: string;
  project_id: string;
  name: string;
  description: string;
  icon: string;
  accent_color: string;
  sort_order: number;
  /** null = does not end session, 'reset' = end & full reset, 'continue' = end & carry over */
  end_type: 'reset' | 'continue' | null;
  achieved_prompt: string | null;
  is_implicit: boolean;
  created_at: string;
  updated_at: string;
  /** Variable bindings (replaces old properties) */
  variable_bindings: GoalVariableBinding[];
  /** Relevant nords linked to this goal */
  relevant_nords: GoalRelevantNord[];
  /** Relevant nord types linked to this goal */
  relevant_nord_types: GoalRelevantNordType[];
}

/** Directed edge in the goal DAG: source → target */
export interface GoalEdge {
  id: string;
  project_id: string;
  source_goal_id: string;
  target_goal_id: string;
  created_at: string;
}

export function useGoals(projectId: string | null) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [edges, setEdges] = useState<GoalEdge[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGoals = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const [goalsData, edgesData] = await Promise.all([
        api.get<Goal[]>(`/api/projects/${projectId}/goals`),
        api.get<GoalEdge[]>(`/api/projects/${projectId}/goal-edges`),
      ]);
      setGoals(goalsData);
      setEdges(edgesData);
    } catch (err) {
      console.error('Failed to fetch goals:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const createGoal = useCallback(async (fields?: Partial<Goal>) => {
    if (!projectId) return null;
    try {
      const data = await api.post<Goal>(`/api/projects/${projectId}/goals`, fields || {});
      await fetchGoals();
      return data;
    } catch (err) { console.error('Failed to create goal:', err); return null; }
  }, [projectId, fetchGoals]);

  const updateGoal = useCallback(async (
    id: string,
    fields: Partial<Pick<Goal,
      'name' | 'description' | 'icon' | 'accent_color' | 'sort_order' |
      'end_type' | 'achieved_prompt'
    >>
  ) => {
    try {
      const data = await api.put<Goal>(`/api/goals/${id}`, fields);
      setGoals(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
      return data;
    } catch (err) { console.error('Failed to update goal:', err); return null; }
  }, []);

  const deleteGoal = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/goals/${id}`);
      setGoals(prev => prev.filter(g => g.id !== id));
      setEdges(prev => prev.filter(e => e.source_goal_id !== id && e.target_goal_id !== id));
    } catch (err) { console.error('Failed to delete goal:', err); }
  }, []);

  // ── Edge mutations ──

  const createEdge = useCallback(async (sourceGoalId: string, targetGoalId: string) => {
    if (!projectId) return null;
    try {
      const edge = await api.post<GoalEdge>(`/api/projects/${projectId}/goal-edges`, {
        source_goal_id: sourceGoalId,
        target_goal_id: targetGoalId,
      });
      setEdges(prev => [...prev, edge]);
      return edge;
    } catch (err) { console.error('Failed to create edge:', err); return null; }
  }, [projectId]);

  const deleteEdge = useCallback(async (edgeId: string) => {
    try {
      await api.delete(`/api/goal-edges/${edgeId}`);
      setEdges(prev => prev.filter(e => e.id !== edgeId));
    } catch (err) { console.error('Failed to delete edge:', err); }
  }, []);

  // ── Variable Binding mutations (replaces old property bindings) ──

  const addVariableBinding = useCallback(async (goalId: string, variableId: string, required: boolean = true) => {
    try {
      const binding = await api.post<GoalVariableBinding>(`/api/goals/${goalId}/variable-bindings`, {
        variable_id: variableId,
        required,
      });
      setGoals(prev => prev.map(g =>
        g.id === goalId ? { ...g, variable_bindings: [...g.variable_bindings, binding] } : g
      ));
      return binding;
    } catch (err) { console.error('Failed to add variable binding:', err); return null; }
  }, []);

  const updateVariableBinding = useCallback(async (goalId: string, bindingId: string, required: boolean) => {
    try {
      const binding = await api.put<GoalVariableBinding>(`/api/goals/${goalId}/variable-bindings/${bindingId}`, { required });
      setGoals(prev => prev.map(g =>
        g.id === goalId ? {
          ...g,
          variable_bindings: g.variable_bindings.map(b => b.id === bindingId ? { ...b, ...binding } : b),
        } : g
      ));
      return binding;
    } catch (err) { console.error('Failed to update variable binding:', err); return null; }
  }, []);

  const removeVariableBinding = useCallback(async (goalId: string, bindingId: string) => {
    try {
      await api.delete(`/api/goals/${goalId}/variable-bindings/${bindingId}`);
      setGoals(prev => prev.map(g =>
        g.id === goalId ? {
          ...g,
          variable_bindings: g.variable_bindings.filter(b => b.id !== bindingId),
        } : g
      ));
    } catch (err) { console.error('Failed to remove variable binding:', err); }
  }, []);

  // ── Relevant Nord mutations ──

  const addRelevantNord = useCallback(async (goalId: string, nordId: string) => {
    try {
      const result = await api.post<GoalRelevantNord>(`/api/goals/${goalId}/relevant-nords`, { nord_id: nordId });
      setGoals(prev => prev.map(g =>
        g.id === goalId ? { ...g, relevant_nords: [...g.relevant_nords, result] } : g
      ));
      return result;
    } catch (err) { console.error('Failed to add relevant nord:', err); return null; }
  }, []);

  const removeRelevantNord = useCallback(async (goalId: string, nordId: string) => {
    try {
      await api.delete(`/api/goals/${goalId}/relevant-nords/${nordId}`);
      setGoals(prev => prev.map(g =>
        g.id === goalId ? {
          ...g,
          relevant_nords: g.relevant_nords.filter(rn => rn.nord_id !== nordId),
        } : g
      ));
    } catch (err) { console.error('Failed to remove relevant nord:', err); }
  }, []);

  // ── Relevant Nord Type mutations ──

  const addRelevantNordType = useCallback(async (goalId: string, nordTypeId: string) => {
    try {
      const result = await api.post<GoalRelevantNordType>(`/api/goals/${goalId}/relevant-types`, { nord_type_id: nordTypeId });
      setGoals(prev => prev.map(g =>
        g.id === goalId ? { ...g, relevant_nord_types: [...g.relevant_nord_types, result] } : g
      ));
      return result;
    } catch (err) { console.error('Failed to add relevant nord type:', err); return null; }
  }, []);

  const removeRelevantNordType = useCallback(async (goalId: string, nordTypeId: string) => {
    try {
      await api.delete(`/api/goals/${goalId}/relevant-types/${nordTypeId}`);
      setGoals(prev => prev.map(g =>
        g.id === goalId ? {
          ...g,
          relevant_nord_types: g.relevant_nord_types.filter(rt => rt.nord_type_id !== nordTypeId),
        } : g
      ));
    } catch (err) { console.error('Failed to remove relevant nord type:', err); }
  }, []);

  // ── Persona Weight mutations ──

  const setPersonaWeight = useCallback(async (goalId: string, personaId: string, weight: number) => {
    try {
      await api.put(`/api/goals/${goalId}/persona-weights/${personaId}`, { weight });
      // No local state to update — weights are fetched separately
    } catch (err) { console.error('Failed to set persona weight:', err); }
  }, []);

  return {
    goals, edges, isLoading, refetch: fetchGoals,
    createGoal, updateGoal, deleteGoal,
    createEdge, deleteEdge,
    // Variable bindings (replaces old addProperty/removeProperty)
    addVariableBinding, updateVariableBinding, removeVariableBinding,
    // Relevant nords
    addRelevantNord, removeRelevantNord,
    // Relevant types
    addRelevantNordType, removeRelevantNordType,
    // Persona weights
    setPersonaWeight,
  };
}

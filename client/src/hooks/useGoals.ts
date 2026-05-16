/**
 * useGoals.ts — Fetches and manages goals + edges for a project.
 *
 * Returns the goals list, edges list, loading state, and mutation functions.
 * Follows the same pattern as usePersonas for consistency.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

// ── Types ──

export interface GoalProperty {
  id: string;
  goal_id: string;
  nord_id: string;
  property_name: string;
  created_at: string;
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
  properties: GoalProperty[];
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
      // Also remove edges involving this goal
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

  // ── Property mutations ──

  const addProperty = useCallback(async (goalId: string, nordId: string, propertyName: string) => {
    try {
      const prop = await api.post<GoalProperty>(`/api/goals/${goalId}/properties`, {
        nord_id: nordId,
        property_name: propertyName,
      });
      setGoals(prev => prev.map(g =>
        g.id === goalId ? { ...g, properties: [...g.properties, prop] } : g
      ));
      return prop;
    } catch (err) { console.error('Failed to add property:', err); return null; }
  }, []);

  const removeProperty = useCallback(async (goalId: string, propId: string) => {
    try {
      await api.delete(`/api/goals/${goalId}/properties/${propId}`);
      setGoals(prev => prev.map(g =>
        g.id === goalId ? { ...g, properties: g.properties.filter(p => p.id !== propId) } : g
      ));
    } catch (err) { console.error('Failed to remove property:', err); }
  }, []);

  return {
    goals, edges, isLoading, refetch: fetchGoals,
    createGoal, updateGoal, deleteGoal,
    createEdge, deleteEdge,
    addProperty, removeProperty,
  };
}

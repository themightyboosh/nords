/**
 * useGoals.ts — Fetches and manages goals for a project.
 *
 * Returns the goals list, loading state, and mutation functions.
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
  is_default: boolean;
  terminates: boolean;
  achieved_prompt: string | null;
  exclusion_group: string | null;
  requires_goal_id: string | null;
  is_implicit: boolean;
  created_at: string;
  updated_at: string;
  properties: GoalProperty[];
}

export function useGoals(projectId: string | null) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGoals = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const data = await api.get<Goal[]>(`/api/projects/${projectId}/goals`);
      setGoals(data);
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
      // Re-fetch to get properties attached
      await fetchGoals();
      return data;
    } catch (err) { console.error('Failed to create goal:', err); return null; }
  }, [projectId, fetchGoals]);

  const updateGoal = useCallback(async (
    id: string,
    fields: Partial<Pick<Goal,
      'name' | 'description' | 'icon' | 'accent_color' | 'sort_order' |
      'is_default' | 'terminates' | 'achieved_prompt' | 'exclusion_group' |
      'requires_goal_id'
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
    } catch (err) { console.error('Failed to delete goal:', err); }
  }, []);

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
    goals, isLoading, refetch: fetchGoals,
    createGoal, updateGoal, deleteGoal,
    addProperty, removeProperty,
  };
}

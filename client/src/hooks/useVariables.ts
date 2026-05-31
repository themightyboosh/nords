/**
 * useVariables.ts — Fetches and manages project-level variables.
 *
 * Variables are the global data points collected during MCP sessions.
 * Follows the same pattern as useGoals/usePersonas for consistency.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { PropertyType } from '@nords/shared/propertyTypes';

// ── Types ──

/** @deprecated Use PropertyType from @nords/shared instead */
export type VariableType = PropertyType;

export interface ProjectVariable {
  id: string;
  project_id: string;
  name: string;
  description: string;
  type: VariableType;
  options: string[] | null;
  required: boolean;
  tags: string[];
  hint: string;
  priority: number;
  depends_on: string | null;
  collection_group_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useVariables(projectId: string | null) {
  const [variables, setVariables] = useState<ProjectVariable[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchVariables = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const data = await api.get<ProjectVariable[]>(`/api/projects/${projectId}/variables`);
      setVariables(data);
    } catch (err) {
      console.error('Failed to fetch variables:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchVariables(); }, [fetchVariables]);

  const createVariable = useCallback(async (fields: Partial<ProjectVariable>) => {
    if (!projectId) return null;
    try {
      const data = await api.post<ProjectVariable>(`/api/projects/${projectId}/variables`, fields);
      setVariables(prev => [...prev, data]);
      return data;
    } catch (err) { console.error('Failed to create variable:', err); return null; }
  }, [projectId]);

  const updateVariable = useCallback(async (
    id: string,
    fields: Partial<Pick<ProjectVariable,
      'name' | 'description' | 'type' | 'options' | 'required' |
      'tags' | 'hint' | 'priority' | 'depends_on' | 'sort_order' | 'collection_group_id'
    >>
  ) => {
    try {
      const data = await api.put<ProjectVariable>(`/api/variables/${id}`, fields);
      setVariables(prev => prev.map(v => v.id === id ? { ...v, ...data } : v));
      return data;
    } catch (err) { console.error('Failed to update variable:', err); return null; }
  }, []);

  const deleteVariable = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/variables/${id}`);
      setVariables(prev => prev.filter(v => v.id !== id));
    } catch (err) { console.error('Failed to delete variable:', err); }
  }, []);

  const reorderVariables = useCallback(async (variableIds: string[]) => {
    if (!projectId) return;
    try {
      await api.put(`/api/projects/${projectId}/variables/reorder`, { variableIds });
      // Re-sort local state to match new order
      setVariables(prev => {
        const indexed = new Map(prev.map(v => [v.id, v]));
        return variableIds
          .map(id => indexed.get(id))
          .filter((v): v is ProjectVariable => !!v);
      });
    } catch (err) { console.error('Failed to reorder variables:', err); }
  }, [projectId]);

  return {
    variables, isLoading, refetch: fetchVariables,
    createVariable, updateVariable, deleteVariable, reorderVariables,
  };
}

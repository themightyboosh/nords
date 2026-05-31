/**
 * useCollectionGroups.ts — Fetches and manages Collection Groups.
 *
 * Collection Groups are organizational containers for project variables,
 * matching the Types/Categories pattern. Each group has a name, icon,
 * color, and contains project variables.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { ProjectVariable } from './useVariables';

// ── Types ──

export interface CollectionGroup {
  id: string;
  project_id: string;
  name: string;
  description: string;
  icon: string;
  accent_color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  variables: ProjectVariable[];
}

export interface CollectionGroupsResponse {
  groups: CollectionGroup[];
  ungrouped: ProjectVariable[];
}

export function useCollectionGroups(projectId: string | null) {
  const [groups, setGroups] = useState<CollectionGroup[]>([]);
  const [ungrouped, setUngrouped] = useState<ProjectVariable[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const data = await api.get<CollectionGroupsResponse>(`/api/projects/${projectId}/collection-groups`);
      setGroups(data.groups);
      setUngrouped(data.ungrouped);
    } catch (err) {
      console.error('Failed to fetch collection groups:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const createGroup = useCallback(async (fields: Partial<CollectionGroup>) => {
    if (!projectId) return null;
    try {
      const data = await api.post<CollectionGroup>(`/api/projects/${projectId}/collection-groups`, fields);
      // New group has no variables yet
      const groupWithVars = { ...data, variables: [] };
      setGroups(prev => [...prev, groupWithVars]);
      return groupWithVars;
    } catch (err) { console.error('Failed to create collection group:', err); return null; }
  }, [projectId]);

  const updateGroup = useCallback(async (
    id: string,
    fields: Partial<Pick<CollectionGroup, 'name' | 'description' | 'icon' | 'accent_color' | 'sort_order'>>
  ) => {
    try {
      const data = await api.put<CollectionGroup>(`/api/collection-groups/${id}`, fields);
      setGroups(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
      return data;
    } catch (err) { console.error('Failed to update collection group:', err); return null; }
  }, []);

  const deleteGroup = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/collection-groups/${id}`);
      // Move group's variables to ungrouped
      const deletedGroup = groups.find(g => g.id === id);
      if (deletedGroup) {
        setUngrouped(prev => [...prev, ...deletedGroup.variables]);
      }
      setGroups(prev => prev.filter(g => g.id !== id));
    } catch (err) { console.error('Failed to delete collection group:', err); }
  }, [groups]);

  const reorderGroups = useCallback(async (groupIds: string[]) => {
    if (!projectId) return;
    try {
      await api.put(`/api/projects/${projectId}/collection-groups/reorder`, { groupIds });
      setGroups(prev => {
        const indexed = new Map(prev.map(g => [g.id, g]));
        return groupIds
          .map(id => indexed.get(id))
          .filter((g): g is CollectionGroup => !!g);
      });
    } catch (err) { console.error('Failed to reorder collection groups:', err); }
  }, [projectId]);

  return {
    groups, ungrouped, isLoading, refetch: fetchGroups,
    createGroup, updateGroup, deleteGroup, reorderGroups,
  };
}

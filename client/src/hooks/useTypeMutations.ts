/**
 * useTypeMutations — CRUD operations for Nord and Connection types.
 *
 * Uses the new /api/projects/:id/types endpoints.
 * All type operations are TYPE-LEVEL — they define schemas
 * (properties, icon, color), not individual nord values.
 */

import { useCallback } from 'react';
import { api } from '../api/client';
import type { StageLabel } from './useProjectGraph';

// ── Types ──

export interface NordTypeData {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  accent_color: string;
  properties_schema: PropertySchema[];
  scale_property: string | null;
  sort_order: number;
}

export interface ConnectionTypeData {
  id: string;
  user_id: string;
  name: string;
  accent_color: string;
  stroke_style: string;
  measurement_mode: 'spectrum' | 'quadrant' | 'none';
  default_direction: string;
  x_stage_labels: StageLabel[];
  y_stage_labels: StageLabel[];
  properties_schema: PropertySchema[];
  verb: string | null;
  direction_filter: 'all' | 'forward' | 'reverse' | 'both' | 'none';
  is_system: boolean;
  sort_order: number;
}

export interface PropertySchema {
  name: string;
  type: 'string' | 'number' | 'select' | 'date' | 'markdown' | 'url' | 'spectrum_1d' | 'tags';
  options?: string[];
  card_row?: number; // 1 or 2 — which row on the collapsed card
}

// ── Hook ──

export function useTypeMutations(projectId: string | null) {

  // ── Nord Types ──

  const createNordType = useCallback(async (data: {
    name: string;
    icon?: string;
    accent_color?: string;
    properties_schema?: PropertySchema[];
    scale_property?: string | null;
  }): Promise<NordTypeData> => {
    if (!projectId) throw new Error('No project selected');
    return api.post<NordTypeData>(`/api/projects/${projectId}/nord-types`, data);
  }, [projectId]);

  const updateNordType = useCallback(async (
    typeId: string,
    updates: Partial<Pick<NordTypeData, 'name' | 'icon' | 'accent_color' | 'properties_schema' | 'scale_property' | 'sort_order'>>
  ): Promise<NordTypeData> => {
    return api.put<NordTypeData>(`/api/nord-types/${typeId}`, updates);
  }, []);

  const deleteNordType = useCallback(async (typeId: string): Promise<void> => {
    return api.delete(`/api/nord-types/${typeId}`);
  }, []);

  // ── Connection Types ──

  const createConnectionType = useCallback(async (data: {
    name: string;
    accent_color?: string;
    stroke_style?: string;
    default_direction?: string;
    x_stage_labels?: string[];
    y_stage_labels?: string[];
    properties_schema?: PropertySchema[];
  }): Promise<ConnectionTypeData> => {
    if (!projectId) throw new Error('No project selected');
    return api.post<ConnectionTypeData>(`/api/projects/${projectId}/connection-types`, data);
  }, [projectId]);

  const updateConnectionType = useCallback(async (
    typeId: string,
    updates: Partial<Pick<ConnectionTypeData, 'name' | 'accent_color' | 'stroke_style' | 'default_direction' | 'x_stage_labels' | 'y_stage_labels' | 'properties_schema' | 'verb' | 'direction_filter' | 'sort_order'>>
  ): Promise<ConnectionTypeData> => {
    return api.put<ConnectionTypeData>(`/api/connection-types/${typeId}`, updates);
  }, []);

  const deleteConnectionType = useCallback(async (typeId: string): Promise<void> => {
    return api.delete(`/api/connection-types/${typeId}`);
  }, []);

  // ── Fetch all types ──

  const fetchTypes = useCallback(async (): Promise<{ nord_types: NordTypeData[]; connection_types: ConnectionTypeData[] }> => {
    if (!projectId) throw new Error('No project selected');
    return api.get(`/api/projects/${projectId}/types`);
  }, [projectId]);

  return {
    // Nord types
    createNordType,
    updateNordType,
    deleteNordType,
    // Connection types
    createConnectionType,
    updateConnectionType,
    deleteConnectionType,
    // Fetch
    fetchTypes,
  };
}

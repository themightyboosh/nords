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
  name: string;
  description: string;
  accent_color: string;
  icon: string;
  properties_schema: PropertySchema[];
  scale_property: string | null;
  sort_order: number;
}

export interface ConnectionTypeData {
  id: string;
  name: string;
  description: string;
  accent_color: string;
  stroke_style: 'solid' | 'dashed' | 'dotted';
  default_direction: 'to' | 'from' | 'both' | 'neither' | 'none';
  direction_filter: 'all' | 'forward' | 'reverse' | 'both' | 'none';
  measurement_mode: 'spectrum' | 'quadrant' | 'none';
  verb: string | null;
  direction_prepositions: { forward: string; reverse: string; both: string };
  x_stage_labels: StageLabel[];
  y_stage_labels: StageLabel[];
  properties_schema: PropertySchema[];
  sort_order: number;
}

export interface PropertySchema {
  name: string;
  type: 'string' | 'number' | 'select' | 'date' | 'markdown' | 'url' | 'tags' | 'computed';
  required?: boolean;
  defaultValue?: string | number | boolean | null;
  options?: string[];
  card_row?: number; // 1 or 2 — which row on the collapsed card
  /** Property source: 'user' (default) or 'mcp' (managed by MCP server) */
  source?: 'user' | 'mcp';
  config?: Record<string, unknown>;
  /** Human-readable description of what this property collects (shown to AI) */
  description?: string;
  /** Conversational prompt hint for the AI (e.g., "What's the annual budget?") */
  hint?: string;
  /** Collection priority (1–5). Higher = ask first. Default 0. */
  priority?: number;
  /** Conditional dependency — only show this property if the controlling property has a matching value */
  depends_on?: { property: string; values: string[] };
}

// ── Hook ──

export function useTypeMutations(projectId: string | null) {

  // ── Nord Types ──

  const createNordType = useCallback(async (data: {
    name: string;
    description?: string;
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
    updates: Partial<Pick<NordTypeData, 'name' | 'description' | 'icon' | 'accent_color' | 'properties_schema' | 'scale_property' | 'sort_order'>>
  ): Promise<NordTypeData> => {
    return api.put<NordTypeData>(`/api/nord-types/${typeId}`, updates);
  }, []);

  const deleteNordType = useCallback(async (typeId: string): Promise<void> => {
    return api.delete(`/api/nord-types/${typeId}`);
  }, []);

  // ── Connection Types ──

  const createConnectionType = useCallback(async (data: {
    name: string;
    description?: string;
    accent_color?: string;
    stroke_style?: string;
    default_direction?: string;
    measurement_mode?: string;
    x_stage_labels?: string[];
    y_stage_labels?: string[];
    properties_schema?: PropertySchema[];
  }): Promise<ConnectionTypeData> => {
    if (!projectId) throw new Error('No project selected');
    return api.post<ConnectionTypeData>(`/api/projects/${projectId}/connection-types`, data);
  }, [projectId]);

  const updateConnectionType = useCallback(async (
    typeId: string,
    updates: Partial<Pick<ConnectionTypeData, 'name' | 'description' | 'verb' | 'accent_color' | 'stroke_style' | 'default_direction' | 'direction_filter' | 'direction_prepositions' | 'measurement_mode' | 'x_stage_labels' | 'y_stage_labels' | 'properties_schema' | 'sort_order'>>
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

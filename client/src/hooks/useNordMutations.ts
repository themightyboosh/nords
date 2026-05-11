/**
 * useNordMutations — CRUD operations for nords and connections.
 *
 * Provides mutation functions that hit the Express API and
 * return the updated entity. These functions are designed to
 * be called from canvas event handlers (drag-drop, add node,
 * delete, etc.)
 */

import { useCallback } from 'react';
import { api } from '../api/client';
import type { Nord, Connection } from './useProjectGraph';

// ── Nord Mutations ──

export function useNordMutations(projectId: string | null) {
  const createNord = useCallback(async (data: {
    type_id: string;
    title?: string;
    description?: string;
    properties?: Record<string, unknown>;
    position_x?: number;
    position_y?: number;
    scale?: number;
  }): Promise<Nord> => {
    if (!projectId) throw new Error('No project selected');
    return api.post<Nord>(`/api/projects/${projectId}/nords`, data);
  }, [projectId]);

  const updateNord = useCallback(async (
    nordId: string,
    updates: Partial<Pick<Nord, 'title' | 'properties' | 'position_x' | 'position_y' | 'scale'>>
  ): Promise<Nord> => {
    return api.put<Nord>(`/api/nords/${nordId}`, updates);
  }, []);

  const deleteNord = useCallback(async (nordId: string): Promise<void> => {
    return api.delete(`/api/nords/${nordId}`);
  }, []);

  const batchUpdatePositions = useCallback(async (
    updates: Array<{ id: string; x: number; y: number }>
  ): Promise<{ updated: number }> => {
    if (!projectId) throw new Error('No project selected');
    return api.put<{ updated: number }>(`/api/projects/${projectId}/positions`, { updates });
  }, [projectId]);

  return { createNord, updateNord, deleteNord, batchUpdatePositions };
}

// ── Connection Mutations ──

export function useConnectionMutations(projectId: string | null) {
  const createConnection = useCallback(async (data: {
    type_id: string;
    source_nord_id: string;
    target_nord_id: string;
    direction?: 'forward' | 'reverse' | 'both' | 'neither' | 'none';
    distance_x?: number;
    distance_y?: number;
    properties?: Record<string, unknown>;
  }): Promise<Connection> => {
    if (!projectId) throw new Error('No project selected');
    return api.post<Connection>(`/api/projects/${projectId}/connections`, data);
  }, [projectId]);

  const updateConnection = useCallback(async (
    connectionId: string,
    updates: Partial<Pick<Connection, 'source_nord_id' | 'target_nord_id' | 'direction' | 'distance_x' | 'distance_y' | 'sort_order' | 'properties'>>
  ): Promise<Connection> => {
    return api.put<Connection>(`/api/connections/${connectionId}`, updates);
  }, []);

  const deleteConnection = useCallback(async (connectionId: string): Promise<void> => {
    return api.delete(`/api/connections/${connectionId}`);
  }, []);

  return { createConnection, updateConnection, deleteConnection };
}

// ── Connection Type Mutations ──

export function useConnectionTypeMutations() {
  const updateConnectionType = useCallback(async (
    typeId: string,
    updates: Partial<{ direction_filter: string; verb: string; name: string; accent_color: string; measurement_mode: string }>
  ): Promise<unknown> => {
    return api.put(`/api/connection-types/${typeId}`, updates);
  }, []);

  return { updateConnectionType };
}

// ── Board Position Mutations ──

export function useBoardPositionMutations(projectId: string | null) {
  const upsertPosition = useCallback(async (data: {
    nord_id: string;
    type_id: string;
    distance_x: number;
    distance_y?: number;
  }): Promise<unknown> => {
    if (!projectId) throw new Error('No project selected');
    return api.put(`/api/projects/${projectId}/board-position`, {
      ...data,
      distance_y: data.distance_y ?? 0.5,
    });
  }, [projectId]);

  const removePosition = useCallback(async (nordId: string, typeId: string): Promise<void> => {
    return api.delete(`/api/board-position/${nordId}/${typeId}`);
  }, []);

  return { upsertPosition, removePosition };
}

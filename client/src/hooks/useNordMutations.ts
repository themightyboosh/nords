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
    updates: Partial<Pick<Nord, 'title' | 'description' | 'properties' | 'position_x' | 'position_y' | 'scale'>>
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
    updates: Partial<Pick<Connection, 'direction' | 'distance_x' | 'distance_y' | 'properties'>>
  ): Promise<Connection> => {
    return api.put<Connection>(`/api/connections/${connectionId}`, updates);
  }, []);

  const deleteConnection = useCallback(async (connectionId: string): Promise<void> => {
    return api.delete(`/api/connections/${connectionId}`);
  }, []);

  return { createConnection, updateConnection, deleteConnection };
}

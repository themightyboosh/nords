/**
 * useProjectGraph — Loads the entire project graph in one call.
 *
 * This hook calls GET /api/projects/:id/graph, which executes
 * fn_load_project_graph() on the database — returning all nords,
 * connections, nord types, and connection types in a single
 * network round trip.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

// ── Types (mirrored from server/src/types/entities.ts) ──

export interface PropertySchema {
  name: string;
  type: string;
  required?: boolean;
  defaultValue?: string | number | boolean | null;
  options?: string[];
  card_row?: number;
  config?: Record<string, unknown>;
}

export interface NordType {
  id: string;
  user_id: string;
  name: string;
  description: string;
  icon: string | null;
  accent_color: string | null;
  properties_schema: PropertySchema[];
  scale_property: string | null;
  sort_order: number;
}

export interface Nord {
  id: string;
  project_id: string;
  type_id: string;
  title: string;
  properties: Record<string, unknown>;
  position_x: number;
  position_y: number;
  scale: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StageLabel {
  label: string;
  position: number; // 0.0–1.0
}

export interface ConnectionType {
  id: string;
  user_id: string;
  name: string;
  description: string;
  accent_color: string | null;
  stroke_style: string;
  measurement_mode: 'spectrum' | 'quadrant' | 'none';
  default_direction: string;
  x_stage_labels: StageLabel[];
  y_stage_labels: StageLabel[];
  properties_schema: PropertySchema[];
  verb: string | null;
  direction_filter: 'all' | 'forward' | 'reverse' | 'both' | 'none';
  direction_prepositions: {
    forward: string;  // default 'from'
    reverse: string;  // default 'to'
    both: string;     // default 'together'
  };
  is_system: boolean;
  sort_order: number;
}

export interface Connection {
  id: string;
  project_id: string;
  type_id: string;
  source_nord_id: string;
  target_nord_id: string;
  direction: 'forward' | 'reverse' | 'both' | 'neither' | 'none';
  distance_x: number;
  distance_y: number;
  sort_order: number;
  properties: Record<string, unknown>;
  created_at: string;
}

export interface NordBoardPosition {
  id: string;
  nord_id: string;
  type_id: string;
  distance_x: number;
  distance_y: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectGraph {
  nord_types: NordType[];
  nords: Nord[];
  connection_types: ConnectionType[];
  connections: Connection[];
  board_positions: NordBoardPosition[];
}

interface UseProjectGraphResult {
  graph: ProjectGraph | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProjectGraph(projectId: string | null): UseProjectGraphResult {
  const [graph, setGraph] = useState<ProjectGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ProjectGraph>(`/api/projects/${projectId}/graph`);
      setGraph(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { graph, loading, error, refetch };
}

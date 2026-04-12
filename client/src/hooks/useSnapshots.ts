/**
 * useSnapshots — Snapshot capture and listing.
 *
 * Capture calls fn_capture_snapshot() on the database, which
 * assembles and stores the entire graph state in one atomic
 * transaction without any data leaving the database.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export interface SnapshotSummary {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SnapshotFull extends SnapshotSummary {
  snapshot_data: Record<string, unknown>;
}

interface UseSnapshotsResult {
  snapshots: SnapshotSummary[];
  loading: boolean;
  error: string | null;
  captureSnapshot: (name: string, description?: string) => Promise<SnapshotFull>;
  loadSnapshot: (snapshotId: string) => Promise<SnapshotFull>;
  refetch: () => Promise<void>;
}

export function useSnapshots(projectId: string | null): UseSnapshotsResult {
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<SnapshotSummary[]>(`/api/projects/${projectId}/snapshots`);
      setSnapshots(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load snapshots');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const captureSnapshot = useCallback(async (name: string, description?: string): Promise<SnapshotFull> => {
    if (!projectId) throw new Error('No project selected');
    const snapshot = await api.post<SnapshotFull>(`/api/projects/${projectId}/snapshots`, {
      name,
      description: description || null,
    });
    // Refresh list after capturing
    await refetch();
    return snapshot;
  }, [projectId, refetch]);

  const loadSnapshot = useCallback(async (snapshotId: string): Promise<SnapshotFull> => {
    return api.get<SnapshotFull>(`/api/snapshots/${snapshotId}`);
  }, []);

  return { snapshots, loading, error, captureSnapshot, loadSnapshot, refetch };
}

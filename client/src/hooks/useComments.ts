/**
 * useComments — CRUD hook for threaded comments on Nords and Connections.
 *
 * Comments are scoped to a project and targeted at either a Nord or a Connection.
 * The hook provides listing, creation, resolution, and deletion.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export interface Comment {
  id: string;
  project_id: string;
  target_type: 'nord' | 'connection';
  target_id: string;
  author_id: string | null;
  author_name: string | null;
  body: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

interface UseCommentsResult {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  addComment: (body: string) => Promise<Comment>;
  resolveComment: (commentId: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useComments(
  projectId: string | null,
  targetType: 'nord' | 'connection',
  targetId: string | null
): UseCommentsResult {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!projectId || !targetId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Comment[]>(
        `/api/projects/${projectId}/comments?target_type=${targetType}&target_id=${targetId}`
      );
      setComments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [projectId, targetType, targetId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addComment = useCallback(async (body: string): Promise<Comment> => {
    if (!projectId || !targetId) throw new Error('No project/target selected');
    const comment = await api.post<Comment>(`/api/projects/${projectId}/comments`, {
      target_type: targetType,
      target_id: targetId,
      body,
    });
    // Optimistic: prepend to local list immediately
    setComments(prev => [comment, ...prev]);
    return comment;
  }, [projectId, targetType, targetId]);

  const resolveComment = useCallback(async (commentId: string): Promise<void> => {
    // Optimistic toggle
    setComments(prev => prev.map(c =>
      c.id === commentId ? { ...c, resolved: true } : c
    ));
    try {
      await api.put(`/api/comments/${commentId}`, { resolved: true });
    } catch (err) {
      // Revert on failure
      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, resolved: false } : c
      ));
      console.error('Failed to resolve comment:', err);
    }
  }, []);

  const deleteComment = useCallback(async (commentId: string): Promise<void> => {
    const prev = comments;
    // Optimistic remove
    setComments(cs => cs.filter(c => c.id !== commentId));
    try {
      await api.delete(`/api/comments/${commentId}`);
    } catch (err) {
      // Revert on failure
      setComments(prev);
      console.error('Failed to delete comment:', err);
    }
  }, [comments]);

  return { comments, loading, error, addComment, resolveComment, deleteComment, refetch };
}

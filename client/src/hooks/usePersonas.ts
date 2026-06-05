/**
 * usePersonas.ts — Fetches and manages personas for a project.
 *
 * Returns the persona list, loading state, and mutation functions.
 * Follows the same pattern as useTypeMutations for auto-save on blur.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

// ── Types ──

export interface MentalModel {
  id: string;
  persona_id: string;
  name: string;
  body: string;
  sort_order: number;
}

export interface CategoryWeight {
  id: string;
  persona_id: string;
  connection_type_id: string;
  weight: number;
}

export interface Persona {
  id: string;
  project_id: string;
  name: string;
  avatar_seed: string;
  accent_color: string;
  background: string;
  primary_motivation: string;
  voice_and_tone: string;
  guardrails: Array<{ mode: 'always' | 'never'; text: string }>;

  behavioral_nudge_threshold: number;
  behavioral_nudge_window: number;
  exchange_style?: 'free_form' | 'bi_directional' | 'interrogate';
  sort_order: number;
  created_at: string;
  updated_at: string;
  mental_models: MentalModel[];
  category_weights: CategoryWeight[];
}

export function usePersonas(projectId: string | null) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPersonas = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const data = await api.get<Persona[]>(`/api/projects/${projectId}/personas`);
      setPersonas(data);
    } catch (err) {
      console.error('Failed to fetch personas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchPersonas(); }, [fetchPersonas]);

  const createPersona = useCallback(async () => {
    if (!projectId) return null;
    try {
      const data = await api.post<Persona>(`/api/projects/${projectId}/personas`, {});
      setPersonas(prev => [...prev, data]);
      return data;
    } catch (err) { console.error('Failed to create persona:', err); return null; }
  }, [projectId]);

  const updatePersona = useCallback(async (
    id: string,
    fields: Partial<Pick<Persona, 'name' | 'avatar_seed' | 'accent_color' | 'background' | 'primary_motivation' | 'voice_and_tone' | 'guardrails' | 'behavioral_nudge_threshold' | 'behavioral_nudge_window' | 'exchange_style' | 'sort_order'>>
  ) => {
    try {
      const data = await api.put<Persona>(`/api/personas/${id}`, fields);
      setPersonas(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
      return data;
    } catch (err) { console.error('Failed to update persona:', err); return null; }
  }, []);

  const deletePersona = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/personas/${id}`);
      setPersonas(prev => prev.filter(p => p.id !== id));
    } catch (err) { console.error('Failed to delete persona:', err); }
  }, []);

  const addMentalModel = useCallback(async (personaId: string, payload?: { name?: string; body?: string }) => {
    try {
      const model = await api.post<MentalModel>(`/api/personas/${personaId}/mental-models`, payload || {});
      setPersonas(prev => prev.map(p =>
        p.id === personaId ? { ...p, mental_models: [...(p.mental_models || []), model] } : p
      ));
      return model;
    } catch (err) { console.error('Failed to add mental model:', err); return null; }
  }, []);

  const updateMentalModel = useCallback(async (id: string, personaId: string, fields: Partial<Pick<MentalModel, 'name' | 'body'>>) => {
    try {
      const model = await api.put<MentalModel>(`/api/mental-models/${id}`, fields);
      setPersonas(prev => prev.map(p =>
        p.id === personaId ? { ...p, mental_models: p.mental_models.map(m => m.id === id ? { ...m, ...model } : m) } : p
      ));
      return model;
    } catch (err) { console.error('Failed to update mental model:', err); return null; }
  }, []);

  const deleteMentalModel = useCallback(async (id: string, personaId: string) => {
    try {
      await api.delete(`/api/mental-models/${id}`);
      setPersonas(prev => prev.map(p =>
        p.id === personaId ? { ...p, mental_models: p.mental_models.filter(m => m.id !== id) } : p
      ));
    } catch (err) { console.error('Failed to delete mental model:', err); }
  }, []);

  const reorderMentalModels = useCallback(async (personaId: string, orderedIds: string[]) => {
    try {
      await api.put(`/api/personas/${personaId}/mental-models/reorder`, { orderedIds });
      setPersonas(prev => prev.map(p => {
        if (p.id !== personaId) return p;
        const modelMap = new Map(p.mental_models.map(m => [m.id, m]));
        const reordered = orderedIds
          .map((mid, i) => { const m = modelMap.get(mid); return m ? { ...m, sort_order: i } : null; })
          .filter(Boolean) as MentalModel[];
        return { ...p, mental_models: reordered };
      }));
    } catch (err) { console.error('Failed to reorder mental models:', err); }
  }, []);

  const updateCategoryWeight = useCallback(async (personaId: string, connectionTypeId: string, weight: number) => {
    try {
      const result = await api.put<CategoryWeight>(`/api/personas/${personaId}/weights/${connectionTypeId}`, { weight });
      setPersonas(prev => prev.map(p => {
        if (p.id !== personaId) return p;
        const existing = p.category_weights.find(w => w.connection_type_id === connectionTypeId);
        if (existing) {
          return { ...p, category_weights: p.category_weights.map(w => w.connection_type_id === connectionTypeId ? { ...w, weight } : w) };
        }
        return { ...p, category_weights: [...p.category_weights, result] };
      }));
    } catch (err) { console.error('Failed to update category weight:', err); }
  }, []);

  return {
    personas, isLoading, refetch: fetchPersonas,
    createPersona, updatePersona, deletePersona,
    addMentalModel, updateMentalModel, deleteMentalModel, reorderMentalModels,
    updateCategoryWeight,
  };
}

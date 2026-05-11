/**
 * LensContext.tsx — Spatial Lens Mode State
 *
 * Provides the active lens mode (Canvas/Board/Persona) and related
 * state to the entire app tree. Written to by GlobalDock, read by
 * the canvas engine and any lens-aware component.
 *
 * activeConnectionTypeId: The connection type currently selected for
 * the lens. Determines which edges are highlighted and which labels
 * are shown. Persisted to localStorage per project.
 *
 * activePersonaId: The persona currently selected for the Persona Lens.
 * When set, the graph shows weighted-average positions based on
 * the persona's category weights. Persisted to localStorage per project.
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import logger from '../lib/logger';

export type LensMode = 'canvas' | 'board' | 'persona';

/** 3-state visibility for persona view: show (default) → dim → hide → show */
export type PersonaTypeVisibility = 'show' | 'dim' | 'hide';

interface LensContextValue {
  lens: LensMode;
  setLens: (lens: LensMode) => void;
  /** ID of the active connection type for the single-type lens */
  activeConnectionTypeId: string | null;
  setActiveConnectionTypeId: (id: string | null) => void;
  /** ID of the active persona for the Persona Lens */
  activePersonaId: string | null;
  setActivePersonaId: (id: string | null) => void;
  /** Legacy activeLine for backward compat */
  activeLine: string;
  setActiveLine: (line: string) => void;
  showContext: boolean;
  setShowContext: (show: boolean) => void;
  hiddenTypes: Set<string>;
  toggleTypeVisibility: (typeName: string) => void;
  /** Persona mode: per-type 3-state visibility (show/dim/hide) */
  personaTypeFilter: Map<string, PersonaTypeVisibility>;
  /** Cycle a type's persona visibility: show → dim → hide → show */
  cyclePersonaTypeFilter: (typeName: string) => void;
}

const LensContext = createContext<LensContextValue | null>(null);

function getStoredTypeId(projectId: string): string | null {
  try {
    return localStorage.getItem(`nords-lens-type-${projectId}`);
  } catch {
    return null;
  }
}

function storeTypeId(projectId: string, typeId: string | null) {
  try {
    if (typeId) {
      localStorage.setItem(`nords-lens-type-${projectId}`, typeId);
    } else {
      localStorage.removeItem(`nords-lens-type-${projectId}`);
    }
  } catch {
    // localStorage not available
  }
}

function getStoredPersonaId(projectId: string): string | null {
  try {
    return localStorage.getItem(`nords-lens-persona-${projectId}`);
  } catch {
    return null;
  }
}

function storePersonaId(projectId: string, personaId: string | null) {
  try {
    if (personaId) {
      localStorage.setItem(`nords-lens-persona-${projectId}`, personaId);
    } else {
      localStorage.removeItem(`nords-lens-persona-${projectId}`);
    }
  } catch {
    // localStorage not available
  }
}

function getStoredLens(projectId: string): LensMode {
  try {
    const v = localStorage.getItem(`nords-lens-mode-${projectId}`);
    if (v === 'canvas' || v === 'board' || v === 'persona') return v;
  } catch { /* noop */ }
  return 'canvas';
}

function storeLens(projectId: string, mode: LensMode) {
  try {
    localStorage.setItem(`nords-lens-mode-${projectId}`, mode);
  } catch { /* noop */ }
}

interface LensProviderProps {
  children: ReactNode;
  projectId?: string;
}

export function LensProvider({ children, projectId }: LensProviderProps) {
  const [lens, setLensState] = useState<LensMode>(
    () => projectId ? getStoredLens(projectId) : 'canvas'
  );
  const [activeLine, setActiveLine] = useState('Blocks');
  const [showContext, setShowContext] = useState(true);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [personaTypeFilter, setPersonaTypeFilter] = useState<Map<string, PersonaTypeVisibility>>(new Map());
  const [activeConnectionTypeId, setActiveConnectionTypeIdState] = useState<string | null>(
    () => projectId ? getStoredTypeId(projectId) : null
  );
  const [activePersonaId, setActivePersonaIdState] = useState<string | null>(
    () => projectId ? getStoredPersonaId(projectId) : null
  );

  // Persist active type to localStorage when it changes
  const setActiveConnectionTypeId = useCallback((id: string | null) => {
    setActiveConnectionTypeIdState(id);
    if (projectId) storeTypeId(projectId, id);
  }, [projectId]);

  // Persist active persona to localStorage when it changes
  const setActivePersonaId = useCallback((id: string | null) => {
    setActivePersonaIdState(id);
    if (projectId) storePersonaId(projectId, id);
  }, [projectId]);

  // Persist lens mode to localStorage when it changes
  const setLens = useCallback((mode: LensMode) => {
    setLensState(mode);
    if (projectId) storeLens(projectId, mode);
  }, [projectId]);

  // When projectId changes, reload from localStorage
  useEffect(() => {
    if (projectId) {
      setActiveConnectionTypeIdState(getStoredTypeId(projectId));
      setActivePersonaIdState(getStoredPersonaId(projectId));
      setLensState(getStoredLens(projectId));
    }
  }, [projectId]);

  const toggleTypeVisibility = (typeName: string) => {
    setHiddenTypes(prev => {
      const next = new Set(prev);
      if (next.has(typeName)) {
        next.delete(typeName);
      } else {
        next.add(typeName);
      }
      return next;
    });
  };

  const cyclePersonaTypeFilter = useCallback((typeName: string) => {
    setPersonaTypeFilter(prev => {
      const next = new Map(prev);
      const current = next.get(typeName) || 'show';
      const cycle: Record<PersonaTypeVisibility, PersonaTypeVisibility> = {
        show: 'dim',
        dim: 'hide',
        hide: 'show',
      };
      next.set(typeName, cycle[current]);
      return next;
    });
  }, []);

  return (
    <LensContext.Provider value={{ 
      lens, setLens, 
      activeConnectionTypeId, setActiveConnectionTypeId,
      activePersonaId, setActivePersonaId,
      activeLine, setActiveLine, 
      showContext, setShowContext,
      hiddenTypes, toggleTypeVisibility,
      personaTypeFilter, cyclePersonaTypeFilter
    }}>
      {children}
    </LensContext.Provider>
  );
}

export function useLens(): LensContextValue {
  const ctx = useContext(LensContext);
  if (!ctx) {
    const error = new Error('useLens must be used within a LensProvider');
    logger.error('Context violation: useLens outside LensProvider', error);
    throw error;
  }
  return ctx;
}

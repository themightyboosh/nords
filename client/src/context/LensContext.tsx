/**
 * LensContext.tsx — Spatial Lens Mode State
 *
 * Provides the active lens mode (Canvas/Link/Matrix) and related
 * state to the entire app tree. Written to by GlobalDock, read by
 * the canvas engine and any lens-aware component.
 *
 * activeConnectionTypeId: The connection type currently selected for
 * the lens. Determines which edges are highlighted and which labels
 * are shown. Persisted to localStorage per project.
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import logger from '../lib/logger';

export type LensMode = 'canvas' | 'link' | 'matrix';

interface LensContextValue {
  lens: LensMode;
  setLens: (lens: LensMode) => void;
  /** ID of the active connection type for the single-type lens */
  activeConnectionTypeId: string | null;
  setActiveConnectionTypeId: (id: string | null) => void;
  /** Legacy activeLine for backward compat */
  activeLine: string;
  setActiveLine: (line: string) => void;
  showContext: boolean;
  setShowContext: (show: boolean) => void;
  hiddenTypes: Set<string>;
  toggleTypeVisibility: (typeName: string) => void;
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

interface LensProviderProps {
  children: ReactNode;
  projectId?: string;
}

export function LensProvider({ children, projectId }: LensProviderProps) {
  const [lens, setLens] = useState<LensMode>('canvas');
  const [activeLine, setActiveLine] = useState('Blocks');
  const [showContext, setShowContext] = useState(true);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [activeConnectionTypeId, setActiveConnectionTypeIdState] = useState<string | null>(
    () => projectId ? getStoredTypeId(projectId) : null
  );

  // Persist active type to localStorage when it changes
  const setActiveConnectionTypeId = useCallback((id: string | null) => {
    setActiveConnectionTypeIdState(id);
    if (projectId) storeTypeId(projectId, id);
  }, [projectId]);

  // When projectId changes, reload from localStorage
  useEffect(() => {
    if (projectId) {
      setActiveConnectionTypeIdState(getStoredTypeId(projectId));
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

  return (
    <LensContext.Provider value={{ 
      lens, setLens, 
      activeConnectionTypeId, setActiveConnectionTypeId,
      activeLine, setActiveLine, 
      showContext, setShowContext,
      hiddenTypes, toggleTypeVisibility
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

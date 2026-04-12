/**
 * LensContext.tsx — Spatial Lens Mode State
 *
 * Provides the active lens mode (Canvas/Link/Matrix) and related
 * state to the entire app tree. Written to by GlobalDock, read by
 * the canvas engine and any lens-aware component.
 */

import { createContext, useContext, useState, type ReactNode } from 'react';
import logger from '../lib/logger';

export type LensMode = 'canvas' | 'link' | 'matrix';

interface LensContextValue {
  lens: LensMode;
  setLens: (lens: LensMode) => void;
  activeLine: string;
  setActiveLine: (line: string) => void;
  showContext: boolean;
  setShowContext: (show: boolean) => void;
  hiddenTypes: Set<string>;
  toggleTypeVisibility: (typeName: string) => void;
}

const LensContext = createContext<LensContextValue | null>(null);

export function LensProvider({ children }: { children: ReactNode }) {
  const [lens, setLens] = useState<LensMode>('canvas');
  const [activeLine, setActiveLine] = useState('Blocks');
  const [showContext, setShowContext] = useState(true);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());

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

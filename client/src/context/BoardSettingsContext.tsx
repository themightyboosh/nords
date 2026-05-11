/**
 * BoardSettingsContext.tsx — Shared board settings provider.
 *
 * Wraps useBoardSettings into a React Context so that both GlobalDock
 * and MatrixView (and any other consumer) share the same live state
 * for per-nord and per-type board visibility filters.
 */

import React, { createContext, useContext } from 'react';
import { useBoardSettings } from '../hooks/useBoardSettings';

type BoardSettingsValue = ReturnType<typeof useBoardSettings>;

const BoardSettingsContext = createContext<BoardSettingsValue | null>(null);

interface BoardSettingsProviderProps {
  projectId: string | null;
  children: React.ReactNode;
}

export function BoardSettingsProvider({ projectId, children }: BoardSettingsProviderProps) {
  const value = useBoardSettings(projectId);
  return (
    <BoardSettingsContext.Provider value={value}>
      {children}
    </BoardSettingsContext.Provider>
  );
}

export function useBoardSettingsContext(): BoardSettingsValue {
  const ctx = useContext(BoardSettingsContext);
  if (!ctx) {
    throw new Error('useBoardSettingsContext must be used within a BoardSettingsProvider');
  }
  return ctx;
}

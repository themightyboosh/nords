/**
 * useBoardSettings.ts — Per-user board view settings persisted to localStorage.
 *
 * Stores per-connection-type preferences:
 *   - Nord type visibility filters (which nord types show on each board)
 *   - Orphans column visibility
 *
 * Key: nords-board-settings-${projectId}
 *
 * New nord types that didn't exist when settings were saved default to visible.
 */

import { useState, useCallback, useEffect } from 'react';

interface PerBoardSettings {
  nordTypeFilters: Record<string, boolean>;
  showOrphans: boolean;
}

export interface BoardSettings {
  boards: Record<string, PerBoardSettings>;
}

const STORAGE_PREFIX = 'nords-board-settings-';

function loadSettings(projectId: string): BoardSettings {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupt data — start fresh
  }
  return { boards: {} };
}

function saveSettings(projectId: string, settings: BoardSettings) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${projectId}`, JSON.stringify(settings));
  } catch {
    // localStorage full or unavailable
  }
}

export function useBoardSettings(projectId: string | null) {
  const [settings, setSettings] = useState<BoardSettings>(() =>
    projectId ? loadSettings(projectId) : { boards: {} }
  );

  // Re-load when projectId changes
  useEffect(() => {
    if (projectId) {
      setSettings(loadSettings(projectId));
    }
  }, [projectId]);

  // Persist on every change
  useEffect(() => {
    if (projectId) {
      saveSettings(projectId, settings);
    }
  }, [projectId, settings]);

  /** Get settings for a specific connection type, with defaults */
  const getBoard = useCallback((connectionTypeId: string): PerBoardSettings => {
    return settings.boards[connectionTypeId] || {
      nordTypeFilters: {},
      showOrphans: false,
    };
  }, [settings]);

  /** Check if a specific nord type is visible on a board (defaults to true if unset) */
  const isNordTypeVisible = useCallback((connectionTypeId: string, nordTypeId: string): boolean => {
    const board = settings.boards[connectionTypeId];
    if (!board || !(nordTypeId in board.nordTypeFilters)) return true; // default visible
    return board.nordTypeFilters[nordTypeId];
  }, [settings]);

  /** Toggle a nord type's visibility on a specific board */
  const toggleNordTypeFilter = useCallback((connectionTypeId: string, nordTypeId: string) => {
    setSettings(prev => {
      const board = prev.boards[connectionTypeId] || { nordTypeFilters: {}, showOrphans: false };
      const current = board.nordTypeFilters[nordTypeId] ?? true;
      return {
        ...prev,
        boards: {
          ...prev.boards,
          [connectionTypeId]: {
            ...board,
            nordTypeFilters: {
              ...board.nordTypeFilters,
              [nordTypeId]: !current,
            },
          },
        },
      };
    });
  }, []);

  /** Toggle orphans column for a specific board */
  const toggleOrphans = useCallback((connectionTypeId: string) => {
    setSettings(prev => {
      const board = prev.boards[connectionTypeId] || { nordTypeFilters: {}, showOrphans: false };
      return {
        ...prev,
        boards: {
          ...prev.boards,
          [connectionTypeId]: {
            ...board,
            showOrphans: !board.showOrphans,
          },
        },
      };
    });
  }, []);

  return {
    settings,
    getBoard,
    isNordTypeVisible,
    toggleNordTypeFilter,
    toggleOrphans,
  };
}

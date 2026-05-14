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
  hiddenNordIds: string[];
  showOrphans: boolean;
  collapsedLanes: Record<string, boolean>;
}

export interface BoardSettings {
  boards: Record<string, PerBoardSettings>;
}

// v3: added collapsedLanes for swimlane board
const STORAGE_PREFIX = 'nords-board-settings-v3-';


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
      hiddenNordIds: [],
      showOrphans: false,
      collapsedLanes: {},
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
      const board = prev.boards[connectionTypeId] || { nordTypeFilters: {}, hiddenNordIds: [], showOrphans: false };
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
      const board = prev.boards[connectionTypeId] || { nordTypeFilters: {}, hiddenNordIds: [], showOrphans: false };
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

  /** Force a nord type to be visible on a board (for auto-show on drag/create) */
  const ensureNordTypeVisible = useCallback((connectionTypeId: string, nordTypeId: string) => {
    setSettings(prev => {
      const board = prev.boards[connectionTypeId] || { nordTypeFilters: {}, hiddenNordIds: [], showOrphans: false };
      if (board.nordTypeFilters[nordTypeId] === false) {
        return {
          ...prev,
          boards: {
            ...prev.boards,
            [connectionTypeId]: {
              ...board,
              nordTypeFilters: {
                ...board.nordTypeFilters,
                [nordTypeId]: true,
              },
            },
          },
        };
      }
      return prev; // already visible or unset (defaults to visible)
    });
  }, []);

  /** Check if a specific nord is hidden on this board */
  const isNordHidden = useCallback((connectionTypeId: string, nordId: string): boolean => {
    const board = settings.boards[connectionTypeId];
    if (!board) return false;
    return (board.hiddenNordIds || []).includes(nordId);
  }, [settings]);

  /** Toggle a specific nord's visibility on a board */
  const toggleNordFilter = useCallback((connectionTypeId: string, nordId: string) => {
    setSettings(prev => {
      const board = prev.boards[connectionTypeId] || { nordTypeFilters: {}, hiddenNordIds: [], showOrphans: false };
      const hiddenIds = board.hiddenNordIds || [];
      const isHidden = hiddenIds.includes(nordId);
      return {
        ...prev,
        boards: {
          ...prev.boards,
          [connectionTypeId]: {
            ...board,
            hiddenNordIds: isHidden
              ? hiddenIds.filter(id => id !== nordId)
              : [...hiddenIds, nordId],
          },
        },
      };
    });
  }, []);

  /** Check if a swimlane (connection type) is collapsed */
  const isLaneCollapsed = useCallback((connectionTypeId: string): boolean => {
    // Lane collapse is stored at the top-level boards key using a special 'global' board entry
    const globalBoard = settings.boards['__lanes__'];
    if (!globalBoard) return false;
    return globalBoard.collapsedLanes?.[connectionTypeId] ?? false;
  }, [settings]);

  /** Toggle a swimlane's collapsed state */
  const toggleLaneCollapse = useCallback((connectionTypeId: string) => {
    setSettings(prev => {
      const globalBoard = prev.boards['__lanes__'] || { nordTypeFilters: {}, hiddenNordIds: [], showOrphans: false, collapsedLanes: {} };
      const current = globalBoard.collapsedLanes?.[connectionTypeId] ?? false;
      return {
        ...prev,
        boards: {
          ...prev.boards,
          ['__lanes__']: {
            ...globalBoard,
            collapsedLanes: {
              ...globalBoard.collapsedLanes,
              [connectionTypeId]: !current,
            },
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
    ensureNordTypeVisible,
    toggleOrphans,
    isNordHidden,
    toggleNordFilter,
    isLaneCollapsed,
    toggleLaneCollapse,
  };
}

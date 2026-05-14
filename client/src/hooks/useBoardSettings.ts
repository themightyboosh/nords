/**
 * useBoardSettings.ts — Per-user board view settings persisted to localStorage.
 *
 * Stores per-connection-type preferences:
 *   - Nord type visibility filters (3-state: show/dim/hide)
 *   - Direction filters (per-direction toggles)
 *   - Lane collapse state
 *
 * Key: nords-board-settings-${projectId}
 *
 * New nord types that didn't exist when settings were saved default to visible.
 */

import { useState, useCallback, useEffect } from 'react';

export type NordVisibility = 'show' | 'dim' | 'hide';

// Direction filter keys: which connection directions to display
export type DirectionKey = 'forward' | 'reverse' | 'both' | 'none' | 'unconnected';

interface PerBoardSettings {
  nordTypeFilters: Record<string, NordVisibility | boolean>; // boolean for backward compat
  hiddenNordIds: string[];
  showOrphans: boolean;        // Legacy — now controlled by directionFilters.unconnected
  collapsedLanes: Record<string, boolean>;
  directionFilters: Record<DirectionKey, boolean>;
}

export interface BoardSettings {
  boards: Record<string, PerBoardSettings>;
}

// Default direction filters: all directions shown, unconnected hidden
const DEFAULT_DIRECTION_FILTERS: Record<DirectionKey, boolean> = {
  forward: true,
  reverse: true,
  both: true,
  none: true,        // undirected connections (—)
  unconnected: false, // orphans (no connection) — defaults OFF in board mode
};

// v4: added directionFilters, 3-state nord visibility
const STORAGE_PREFIX = 'nords-board-settings-v4-';

function loadSettings(projectId: string): BoardSettings {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);
    if (raw) return JSON.parse(raw);
    // Try migrating from v3
    const v3 = localStorage.getItem(`nords-board-settings-v3-${projectId}`);
    if (v3) return JSON.parse(v3);
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

function defaultBoard(): PerBoardSettings {
  return {
    nordTypeFilters: {},
    hiddenNordIds: [],
    showOrphans: false,
    collapsedLanes: {},
    directionFilters: { ...DEFAULT_DIRECTION_FILTERS },
  };
}

/** Normalize old boolean filters to 3-state */
function resolveVisibility(val: NordVisibility | boolean | undefined): NordVisibility {
  if (val === undefined) return 'show';
  if (val === true) return 'show';
  if (val === false) return 'hide';
  return val;
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
    return settings.boards[connectionTypeId] || defaultBoard();
  }, [settings]);

  /** Get the 3-state visibility for a nord type (show/dim/hide) */
  const getNordTypeVisibility = useCallback((connectionTypeId: string, nordTypeId: string): NordVisibility => {
    const board = settings.boards[connectionTypeId];
    if (!board) return 'show';
    return resolveVisibility(board.nordTypeFilters[nordTypeId]);
  }, [settings]);

  /** Check if a specific nord type is visible (not hidden) on a board */
  const isNordTypeVisible = useCallback((connectionTypeId: string, nordTypeId: string): boolean => {
    return getNordTypeVisibility(connectionTypeId, nordTypeId) !== 'hide';
  }, [getNordTypeVisibility]);

  /** Check if a specific nord type is dimmed */
  const isNordTypeDimmed = useCallback((connectionTypeId: string, nordTypeId: string): boolean => {
    return getNordTypeVisibility(connectionTypeId, nordTypeId) === 'dim';
  }, [getNordTypeVisibility]);

  /** Cycle a nord type's visibility: show → dim → hide → show */
  const cycleNordTypeVisibility = useCallback((connectionTypeId: string, nordTypeId: string) => {
    setSettings(prev => {
      const board = prev.boards[connectionTypeId] || defaultBoard();
      const current = resolveVisibility(board.nordTypeFilters[nordTypeId]);
      const next: NordVisibility = current === 'show' ? 'dim' : current === 'dim' ? 'hide' : 'show';
      return {
        ...prev,
        boards: {
          ...prev.boards,
          [connectionTypeId]: {
            ...board,
            nordTypeFilters: {
              ...board.nordTypeFilters,
              [nordTypeId]: next,
            },
          },
        },
      };
    });
  }, []);

  /** Toggle a nord type's visibility on a specific board (legacy 2-state: show/hide) */
  const toggleNordTypeFilter = useCallback((connectionTypeId: string, nordTypeId: string) => {
    setSettings(prev => {
      const board = prev.boards[connectionTypeId] || defaultBoard();
      const current = resolveVisibility(board.nordTypeFilters[nordTypeId]);
      const next: NordVisibility = current === 'hide' ? 'show' : 'hide';
      return {
        ...prev,
        boards: {
          ...prev.boards,
          [connectionTypeId]: {
            ...board,
            nordTypeFilters: {
              ...board.nordTypeFilters,
              [nordTypeId]: next,
            },
          },
        },
      };
    });
  }, []);

  /** Toggle orphans column for a specific board (legacy) */
  const toggleOrphans = useCallback((connectionTypeId: string) => {
    setSettings(prev => {
      const board = prev.boards[connectionTypeId] || defaultBoard();
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
      const board = prev.boards[connectionTypeId] || defaultBoard();
      const current = resolveVisibility(board.nordTypeFilters[nordTypeId]);
      if (current === 'hide') {
        return {
          ...prev,
          boards: {
            ...prev.boards,
            [connectionTypeId]: {
              ...board,
              nordTypeFilters: {
                ...board.nordTypeFilters,
                [nordTypeId]: 'show',
              },
            },
          },
        };
      }
      return prev;
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
      const board = prev.boards[connectionTypeId] || defaultBoard();
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
    const globalBoard = settings.boards['__lanes__'];
    if (!globalBoard) return false;
    return globalBoard.collapsedLanes?.[connectionTypeId] ?? false;
  }, [settings]);

  /** Toggle a swimlane's collapsed state */
  const toggleLaneCollapse = useCallback((connectionTypeId: string) => {
    setSettings(prev => {
      const globalBoard = prev.boards['__lanes__'] || defaultBoard();
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

  /** Get direction filter state for a board (all default to true except unconnected) */
  const getDirectionFilter = useCallback((connectionTypeId: string, direction: DirectionKey): boolean => {
    const board = settings.boards[connectionTypeId];
    if (!board?.directionFilters) {
      // Legacy: if no directionFilters, use showOrphans for 'unconnected'
      if (direction === 'unconnected') return board?.showOrphans ?? false;
      return true;
    }
    return board.directionFilters[direction] ?? DEFAULT_DIRECTION_FILTERS[direction];
  }, [settings]);

  /** Toggle a direction filter for a board */
  const toggleDirectionFilter = useCallback((connectionTypeId: string, direction: DirectionKey) => {
    setSettings(prev => {
      const board = prev.boards[connectionTypeId] || defaultBoard();
      const filters = board.directionFilters || { ...DEFAULT_DIRECTION_FILTERS };
      const current = filters[direction] ?? DEFAULT_DIRECTION_FILTERS[direction];
      return {
        ...prev,
        boards: {
          ...prev.boards,
          [connectionTypeId]: {
            ...board,
            directionFilters: {
              ...filters,
              [direction]: !current,
            },
            // Sync legacy showOrphans
            ...(direction === 'unconnected' ? { showOrphans: !current } : {}),
          },
        },
      };
    });
  }, []);

  return {
    settings,
    getBoard,
    isNordTypeVisible,
    isNordTypeDimmed,
    getNordTypeVisibility,
    cycleNordTypeVisibility,
    toggleNordTypeFilter,
    ensureNordTypeVisible,
    toggleOrphans,
    isNordHidden,
    toggleNordFilter,
    isLaneCollapsed,
    toggleLaneCollapse,
    getDirectionFilter,
    toggleDirectionFilter,
  };
}

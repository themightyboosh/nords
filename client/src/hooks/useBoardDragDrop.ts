/**
 * useBoardDragDrop.ts — HTML5 Drag and Drop for the board view.
 *
 * Handles:
 *   - Card drag between columns (updates distance_x)
 *   - Card drag between swimlane rows (updates distance_y, quadrant mode)
 *   - Card drag onto 🔗 connection type entry (re-link or add-link)
 *   - Card drag from orphans column into a column (creates connection)
 *
 * Uses a JSON-serialized drag payload in dataTransfer so the drop
 * target knows the source nord, connection, and direction.
 */

export interface BoardDragData {
  nordId: string;
  nordTitle: string;
  /** null when dragging from orphans (no existing connection) */
  sourceConnectionId: string | null;
  sourceConnectionTypeId: string;
  sourceDirection: string;
}

const DRAG_TYPE = 'application/x-nords-board-drag';

/** Set drag data on a dragstart event */
export function setDragData(e: React.DragEvent, data: BoardDragData) {
  e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(data));
  e.dataTransfer.effectAllowed = 'move';
}

/** Read drag data from a drop event. Returns null if not a board drag. */
export function getDragData(e: React.DragEvent): BoardDragData | null {
  try {
    const raw = e.dataTransfer.getData(DRAG_TYPE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Check if the Option/Alt key is held (add-link mode vs move mode) */
export function isAddLinkMode(e: React.DragEvent | DragEvent): boolean {
  return e.altKey;
}

/**
 * React import needed for the type annotations on DragEvent.
 * The actual hook logic lives in Board.tsx where it has access
 * to the mutation functions. This file provides the serialization
 * helpers and type definitions.
 */
import React from 'react';

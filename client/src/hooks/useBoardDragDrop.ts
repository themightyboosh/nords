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
 *
 * NOTE: We use 'text/plain' as the MIME type instead of a custom type
 * because Safari on macOS silently drops custom MIME types, causing
 * getData() to return empty on drop events.
 */

import React from 'react';

export interface BoardDragData {
  nordId: string;
  nordTitle: string;
  /** empty when dragging from orphans (no existing connections) */
  sourceConnectionIds: string[];
  sourceConnectionTypeId: string;
  sourceDirection: string;
}

const DRAG_TYPE = 'text/plain';
const DRAG_PREFIX = '__nords_board__';

/** Set drag data on a dragstart event */
export function setDragData(e: React.DragEvent, data: BoardDragData) {
  // Prefix the JSON so we can identify nords board drags vs other text drops
  e.dataTransfer.setData(DRAG_TYPE, DRAG_PREFIX + JSON.stringify(data));
  e.dataTransfer.effectAllowed = 'move';
}

/** Read drag data from a drop event. Returns null if not a board drag. */
export function getDragData(e: React.DragEvent): BoardDragData | null {
  try {
    const raw = e.dataTransfer.getData(DRAG_TYPE);
    if (!raw || !raw.startsWith(DRAG_PREFIX)) return null;
    return JSON.parse(raw.slice(DRAG_PREFIX.length));
  } catch {
    return null;
  }
}

/** Check if the Option/Alt key is held (add-link mode vs move mode) */
export function isAddLinkMode(e: React.DragEvent | DragEvent): boolean {
  return e.altKey;
}

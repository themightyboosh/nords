/**
 * boardRenormalize.ts — Post-drop grid stabilization.
 *
 * After a board card drop, the micro-spread can push existing cards' distance
 * values across Voronoi column/row boundaries, causing them to visually jump
 * to adjacent swimlanes. This happens because connections are shared between
 * two nords — writing a new distance to a connection affects BOTH endpoints.
 *
 * THE GRID CELL IS THE SOURCE OF TRUTH, NOT THE RAW COORDINATE.
 *
 * This utility uses a PRE-DROP SNAPSHOT to detect and correct drift:
 *   1. Before the drop, capture every card's cell assignment
 *   2. After the micro-spread writes, re-derive each card's cell
 *   3. If an unmoved card changed cells → restore it to its original cell center
 *   4. Re-spread all cells so cards are evenly distributed within bounds
 */

import type { ProjectGraph, Connection } from '../hooks/useProjectGraph';
import type { StageLabel } from '../hooks/useProjectGraph';
import { resolveStageLabel, getColumnBounds } from './stageLabels';

/** Minimum delta before we bother writing a correction */
const EPSILON = 0.001;

/** Pre-drop cell snapshot for a single nord */
export interface CellSnapshot {
  col: string;
  row: string | null;
}

/**
 * Capture a snapshot of every card's cell assignment for the active board.
 * Call this BEFORE the micro-spread writes.
 */
export function captureGridSnapshot(
  graph: ProjectGraph,
  typeId: string,
  xLabels: StageLabel[],
  yLabels: StageLabel[],
  directionFilter: string,
): Map<string, CellSnapshot> {
  const snapshot = new Map<string, CellSnapshot>();
  if (xLabels.length === 0) return snapshot;

  const isQuadrant = yLabels.length > 0;

  // Derive average distance per nord from connections
  const accX = new Map<string, { sum: number; count: number }>();
  const accY = new Map<string, { sum: number; count: number }>();

  for (const conn of graph.connections) {
    if (conn.type_id !== typeId) continue;
    if (directionFilter !== 'all' && conn.direction !== directionFilter) continue;

    for (const nordId of [conn.source_nord_id, conn.target_nord_id]) {
      const ax = accX.get(nordId) || { sum: 0, count: 0 };
      ax.sum += conn.distance_x ?? 0.5;
      ax.count++;
      accX.set(nordId, ax);

      const ay = accY.get(nordId) || { sum: 0, count: 0 };
      ay.sum += conn.distance_y ?? 0.5;
      ay.count++;
      accY.set(nordId, ay);
    }
  }

  for (const [nordId, ax] of accX) {
    const distX = ax.sum / ax.count;
    const ay = accY.get(nordId) || { sum: 0.5, count: 1 };
    const distY = ay.sum / ay.count;
    const col = resolveStageLabel(distX, xLabels);
    if (!col) continue;
    const row = isQuadrant ? (resolveStageLabel(distY, yLabels) || yLabels[0].label) : null;
    snapshot.set(nordId, { col, row });
  }

  return snapshot;
}

interface NordPosition {
  nordId: string;
  connectionIds: string[];
  distanceX: number;
  distanceY: number;
  sortOrder: number;
}

/**
 * Renormalize all card positions for the active connection type's board.
 *
 * Uses the pre-drop snapshot to detect and correct drift caused by shared
 * connections. Cards that weren't the moved card are forced back to their
 * original cell, then all cells are re-spread evenly.
 *
 * @param graph           Fresh graph data (post micro-spread)
 * @param typeId          Active connection type ID
 * @param xLabels         X-axis stage labels (columns)
 * @param yLabels         Y-axis stage labels (swimlane rows; empty = spectrum mode)
 * @param directionFilter Current direction filter on this board
 * @param movedNordId     The nord that was intentionally moved (skip drift check)
 * @param preDropSnapshot Snapshot from captureGridSnapshot() taken before the drop
 * @param updateConnection Mutation function: (connectionId, patch) => Promise
 */
export async function renormalizeGridPositions(
  graph: ProjectGraph,
  typeId: string,
  xLabels: StageLabel[],
  yLabels: StageLabel[],
  directionFilter: string,
  movedNordId: string | null,
  preDropSnapshot: Map<string, CellSnapshot> | null,
  updateConnection: (id: string, patch: Partial<Pick<Connection, 'distance_x' | 'distance_y'>>) => Promise<unknown>,
): Promise<number> {
  if (xLabels.length === 0) return 0;

  const isQuadrant = yLabels.length > 0;

  // ── Step 1: Build per-nord positions from post-spread connections ──
  const nordMap = new Map<string, NordPosition>();

  for (const conn of graph.connections) {
    if (conn.type_id !== typeId) continue;
    if (directionFilter !== 'all' && conn.direction !== directionFilter) continue;

    for (const nordId of [conn.source_nord_id, conn.target_nord_id]) {
      let entry = nordMap.get(nordId);
      if (!entry) {
        entry = { nordId, connectionIds: [], distanceX: 0, distanceY: 0, sortOrder: 0 };
        nordMap.set(nordId, entry);
      }
      if (!entry.connectionIds.includes(conn.id)) {
        entry.connectionIds.push(conn.id);
      }
    }
  }

  // Average distances
  for (const entry of nordMap.values()) {
    let sumX = 0, sumY = 0, count = 0;
    for (const connId of entry.connectionIds) {
      const conn = graph.connections.find(c => c.id === connId);
      if (!conn) continue;
      sumX += conn.distance_x ?? 0.5;
      sumY += conn.distance_y ?? 0.5;
      count++;
    }
    if (count > 0) {
      entry.distanceX = sumX / count;
      entry.distanceY = sumY / count;
    }
    const orders = entry.connectionIds.map(cid => {
      const c = graph.connections.find(cc => cc.id === cid);
      return c?.sort_order ?? 0;
    });
    entry.sortOrder = Math.min(...orders);
  }

  // Collect the mover's connection IDs — these must NEVER be overwritten by
  // drift correction or re-spread. They were correctly set by handleCellDrop.
  const movedConnIds = new Set<string>();
  if (movedNordId) {
    const movedEntry = nordMap.get(movedNordId);
    if (movedEntry) {
      for (const cid of movedEntry.connectionIds) movedConnIds.add(cid);
    }
  }

  // ── Step 2: Drift correction — force drifted cards back to original cell ──
  const driftCorrections: Array<{ connectionId: string; patch: { distance_x?: number; distance_y?: number } }> = [];

  if (preDropSnapshot && movedNordId) {
    for (const entry of nordMap.values()) {
      if (entry.nordId === movedNordId) continue; // skip the intentionally moved card

      const originalCell = preDropSnapshot.get(entry.nordId);
      if (!originalCell) continue;

      const currentCol = resolveStageLabel(entry.distanceX, xLabels);
      const currentRow = isQuadrant ? (resolveStageLabel(entry.distanceY, yLabels) || yLabels[0].label) : null;

      const colDrifted = currentCol !== originalCell.col;
      const rowDrifted = isQuadrant && currentRow !== originalCell.row;

      if (colDrifted || rowDrifted) {
        // Force this card back to its original cell center
        const xBounds = getColumnBounds(originalCell.col, xLabels);
        const yBounds = originalCell.row ? getColumnBounds(originalCell.row, yLabels) : null;

        const patch: { distance_x?: number; distance_y?: number } = {};
        if (colDrifted) patch.distance_x = xBounds.center;
        if (rowDrifted && yBounds) patch.distance_y = yBounds.center;

        // Update the in-memory entry so Step 3 groups it correctly
        if (patch.distance_x !== undefined) entry.distanceX = patch.distance_x;
        if (patch.distance_y !== undefined) entry.distanceY = patch.distance_y;

        for (const connId of entry.connectionIds) {
          // Don't overwrite the mover's connections — they were set by the drop
          if (movedConnIds.has(connId)) continue;
          driftCorrections.push({ connectionId: connId, patch });
        }
      }
    }
  }

  // Write drift corrections immediately
  if (driftCorrections.length > 0) {
    await Promise.all(
      driftCorrections.map(w => updateConnection(w.connectionId, w.patch))
    );
  }

  // ── Step 3: Group by cell and re-spread within bounds ──
  const cells = new Map<string, NordPosition[]>();

  for (const entry of nordMap.values()) {
    const colLabel = resolveStageLabel(entry.distanceX, xLabels);
    if (!colLabel) continue;

    let cellKey: string;
    if (isQuadrant) {
      const rowLabel = resolveStageLabel(entry.distanceY, yLabels) || yLabels[0].label;
      cellKey = `${colLabel}|${rowLabel}`;
    } else {
      cellKey = colLabel;
    }

    let bucket = cells.get(cellKey);
    if (!bucket) {
      bucket = [];
      cells.set(cellKey, bucket);
    }
    bucket.push(entry);
  }


  // Re-spread
  const spreadWrites: Array<{ connectionId: string; patch: { distance_x?: number; distance_y?: number } }> = [];

  for (const [cellKey, cards] of cells) {
    const sorted = cards.sort((a, b) => a.sortOrder - b.sortOrder);
    const n = sorted.length;

    const parts = cellKey.split('|');
    const colLabel = parts[0];
    const rowLabel = parts[1] || null;

    const xBounds = getColumnBounds(colLabel, xLabels);
    const yBounds = rowLabel ? getColumnBounds(rowLabel, yLabels) : null;

    for (let i = 0; i < n; i++) {
      const card = sorted[i];

      const idealX = n === 1
        ? xBounds.center
        : xBounds.min + ((i + 1) / (n + 1)) * (xBounds.max - xBounds.min);

      const idealY = yBounds
        ? (n === 1
          ? yBounds.center
          : yBounds.min + ((i + 1) / (n + 1)) * (yBounds.max - yBounds.min))
        : card.distanceY;

      const dxChanged = Math.abs(card.distanceX - idealX) > EPSILON;
      const dyChanged = yBounds ? Math.abs(card.distanceY - idealY) > EPSILON : false;

      if (dxChanged || dyChanged) {
        const patch: { distance_x?: number; distance_y?: number } = {};
        if (dxChanged) patch.distance_x = idealX;
        if (dyChanged) patch.distance_y = idealY;

        for (const connId of card.connectionIds) {
          // Don't overwrite the mover's connections — they were set by the drop
          if (movedConnIds.has(connId)) continue;
          spreadWrites.push({ connectionId: connId, patch });
        }
      }
    }
  }

  if (spreadWrites.length > 0) {
    await Promise.all(
      spreadWrites.map(w => updateConnection(w.connectionId, w.patch))
    );
  }

  return driftCorrections.length + spreadWrites.length;
}

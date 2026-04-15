/**
 * boardPositions.ts — Repository for nord_board_positions.
 *
 * Board positions are INDEPENDENT of connections. A nord appears on a board
 * when it has a record here. Orphans (nords with zero connections anywhere)
 * appear in the orphan column on every board regardless of this table.
 */

import { query, queryOne } from '../db.js';

export interface NordBoardPosition {
  id: string;
  nord_id: string;
  type_id: string;
  distance_x: number;
  distance_y: number;
  created_at: string;
  updated_at: string;
}

/** Get all board positions for a project (via nords join) */
export async function findByProject(projectId: string): Promise<NordBoardPosition[]> {
  return query<NordBoardPosition>(
    `SELECT nbp.*
     FROM nord_board_positions nbp
     JOIN nords n ON n.id = nbp.nord_id
     WHERE n.project_id = $1
       AND n.deleted_at IS NULL`,
    [projectId]
  );
}

/** Upsert a single nord's position on a board */
export async function upsert(data: {
  nord_id: string;
  type_id: string;
  distance_x: number;
  distance_y: number;
}): Promise<NordBoardPosition> {
  return queryOne<NordBoardPosition>(
    `INSERT INTO nord_board_positions (nord_id, type_id, distance_x, distance_y)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (nord_id, type_id)
     DO UPDATE SET
       distance_x = EXCLUDED.distance_x,
       distance_y = EXCLUDED.distance_y,
       updated_at = NOW()
     RETURNING *`,
    [data.nord_id, data.type_id, data.distance_x, data.distance_y]
  ) as Promise<NordBoardPosition>;
}

/** Batch upsert — used when dragging multiple nords */
export async function batchUpsert(positions: Array<{
  nord_id: string;
  type_id: string;
  distance_x: number;
  distance_y: number;
}>): Promise<NordBoardPosition[]> {
  if (positions.length === 0) return [];
  const results: NordBoardPosition[] = [];
  for (const pos of positions) {
    const r = await upsert(pos);
    results.push(r);
  }
  return results;
}

/** Remove a nord's position from a board (it becomes hidden on that board) */
export async function remove(nordId: string, typeId: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    'DELETE FROM nord_board_positions WHERE nord_id = $1 AND type_id = $2 RETURNING id',
    [nordId, typeId]
  );
  return result !== null;
}

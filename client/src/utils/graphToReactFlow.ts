/**
 * graphToReactFlow.ts — Transforms API graph data into React Flow format.
 *
 * This is the bridge between the PostgreSQL stored procedure's output
 * and what React Flow needs to render nodes and edges on the canvas.
 */

import { MarkerType } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import type { ProjectGraph, Nord, Connection, NordType, ConnectionType } from '../hooks/useProjectGraph';
import { resolveIcon } from './iconRegistry';

// ── Transformers ──

export function graphToNodes(
  nords: Nord[],
  nordTypes: NordType[]
): Node[] {
  const typeMap = new Map(nordTypes.map(t => [t.id, t]));

  return nords.map(nord => {
    const type = typeMap.get(nord.type_id);
    const typeColor = type?.accent_color || '#4da6ff';
    const typeName = type?.name || 'Unknown';
    const typeIcon = resolveIcon(type?.icon || null);

    // Convert 0-1 normalized positions to canvas pixel coordinates
    // Using a 2000x2000 canvas space (plenty of room)
    const canvasX = nord.position_x * 2000 - 1000;
    const canvasY = nord.position_y * 2000 - 1000;

    // Build properties array from JSONB, ordered by card_row
    // Only include properties with card_row 1 or 2 on the card face
    const schema = type?.properties_schema || [];
    const propsEntries = Object.entries(nord.properties || {});
    
    const properties = propsEntries
      .map(([key, value]) => {
        const schemaDef = schema.find((s: any) => s.name === key);
        return {
          key,
          value: String(value),
          cardRow: (schemaDef as any)?.card_row as number | undefined,
        };
      })
      .filter(p => p.cardRow === 1 || p.cardRow === 2)
      .sort((a, b) => (a.cardRow || 999) - (b.cardRow || 999))
      .map(({ key, value, cardRow }) => ({ key, value, cardRow }));

    return {
      id: nord.id,
      type: 'nordNode',
      position: { x: canvasX, y: canvasY },
      data: {
        title: nord.title || 'Untitled',
        type: typeName,
        typeIcon,
        typeColor,
        properties,
        isGhosted: false,
        _typeId: nord.type_id,
      },
    };
  });
}

export function graphToEdges(
  connections: Connection[],
  connectionTypes: ConnectionType[]
): Edge[] {
  const typeMap = new Map(connectionTypes.map(t => [t.id, t]));

  return connections.map(conn => {
    const type = typeMap.get(conn.type_id);
    const typeName = type?.name || 'Unknown';
    const typeColor = type?.accent_color || '#a78bfa';

    // Arrowhead markers based on direction (4-state model)
    const arrowMarker = { type: MarkerType.ArrowClosed, color: typeColor, width: 16, height: 16 };
    const isForward = conn.direction === 'forward';
    const isReverse = conn.direction === 'reverse';
    const isBoth = conn.direction === 'both';
    const isNeither = conn.direction === 'neither';

    // Direction for visual rendering: to/from/both/none
    const visualDirection = isForward ? 'to'
      : isReverse ? 'from'
      : isBoth ? 'both'
      : 'none'; // 'neither' and 'none' both render without chevrons

    return {
      id: conn.id,
      source: conn.source_nord_id,
      target: conn.target_nord_id,
      type: 'euclidean',
      reconnectable: true,
      ...(isForward || isBoth ? { markerEnd: arrowMarker } : {}),
      ...(isReverse || isBoth ? { markerStart: arrowMarker } : {}),
      data: {
        type: typeName,
        color: typeColor,
        direction: visualDirection,
        _typeId: conn.type_id,
        _distanceX: conn.distance_x,
        _distanceY: conn.distance_y,
      },
    };
  });
}

/**
 * Convert a single API Nord into a React Flow Node.
 * Used when creating a new nord (we get one Nord back from the API).
 */
export function nordToNode(nord: Nord, nordTypes: NordType[]): Node {
  return graphToNodes([nord], nordTypes)[0];
}

/**
 * Convert React Flow pixel position back to normalized 0-1 for database storage.
 */
export function pixelToNormalized(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(1, (x + 1000) / 2000)),
    y: Math.max(0, Math.min(1, (y + 1000) / 2000)),
  };
}

/**
 * Compute normalized distance (0–1) from pixel positions of two connected nodes.
 * Reverses the layout model: targetDist = 150 + distance * 550
 * So distance = clamp((euclidean - 150) / 550, 0, 1)
 */
export function computeNormalizedDistance(
  srcPos: { x: number; y: number },
  tgtPos: { x: number; y: number },
): number {
  const dx = tgtPos.x - srcPos.x;
  const dy = tgtPos.y - srcPos.y;
  const euclidean = Math.sqrt(dx * dx + dy * dy);
  return Math.max(0, Math.min(1, (euclidean - 150) / 550));
}


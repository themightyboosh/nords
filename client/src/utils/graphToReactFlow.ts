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
    const canvasX = nord.position_x * 2000 - 1000;
    const canvasY = nord.position_y * 2000 - 1000;

    const schema = type?.properties_schema || [];
    const propsObj = nord.properties || {};

    // All properties as {key, value} — used by the Detail Drawer forms
    const allProperties = Object.entries(propsObj).map(([key, value]) => ({
      key,
      value: String(value ?? ''),
    }));

    // Card-face properties: only schema entries with card_row 1 or 2,
    // sorted by row then schema order, value resolved from the properties JSONB.
    const cardProperties = schema
      .filter((s: any) => s.card_row === 1 || s.card_row === 2)
      .sort((a: any, b: any) => (a.card_row || 999) - (b.card_row || 999))
      .map((s: any) => ({
        key: s.name,
        value: String((propsObj as any)[s.name] ?? ''),
      }))
      .filter(p => p.value !== '');

    return {
      id: nord.id,
      type: 'nordNode',
      position: { x: canvasX, y: canvasY },
      data: {
        title: nord.title || 'Untitled',
        type: typeName,
        typeIcon,
        typeColor,
        properties: cardProperties,    // card face preview
        _allProperties: allProperties, // full set for the drawer
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

    const arrowMarker = { type: MarkerType.ArrowClosed, color: typeColor, width: 16, height: 16 };
    const isForward = conn.direction === 'forward';
    const isReverse = conn.direction === 'reverse';
    const isBoth = conn.direction === 'both';

    const visualDirection = isForward ? 'to'
      : isReverse ? 'from'
      : isBoth ? 'both'
      : 'none';

    // Connection properties as {key, value} array for the Detail Drawer
    const connProperties = Object.entries(conn.properties || {}).map(([key, value]) => ({
      key,
      value: String(value ?? ''),
    }));

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
        _verb: type?.verb ?? null,
        _prepositions: type?.direction_prepositions ?? { forward: 'from', reverse: 'to', both: 'together' },
        _typeId: conn.type_id,
        _distanceX: conn.distance_x,
        _distanceY: conn.distance_y,
        _xStageLabels: type?.x_stage_labels ?? [],
        _properties: connProperties,
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


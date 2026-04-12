/**
 * graphToReactFlow.ts — Transforms API graph data into React Flow format.
 *
 * This is the bridge between the PostgreSQL stored procedure's output
 * and what React Flow needs to render nodes and edges on the canvas.
 */

import type { Node, Edge } from '@xyflow/react';
import type { ProjectGraph, Nord, Connection, NordType, ConnectionType } from '../hooks/useProjectGraph';
import { resolveIcon } from './iconRegistry';

// ── Transformers ──

export function graphToNodes(
  nords: Nord[],
  nordTypes: NordType[]
): Node[] {
  const typeMap = new Map(nordTypes.map(t => [t.id, t]));

  // ── Per-type scale normalization ──
  // Group nords by type, find min/max scale within each group
  const scaleRanges = new Map<string, { min: number; max: number }>();
  for (const nord of nords) {
    const existing = scaleRanges.get(nord.type_id);
    const s = nord.scale ?? 0.5;
    if (!existing) {
      scaleRanges.set(nord.type_id, { min: s, max: s });
    } else {
      existing.min = Math.min(existing.min, s);
      existing.max = Math.max(existing.max, s);
    }
  }

  return nords.map(nord => {
    const type = typeMap.get(nord.type_id);
    const typeColor = type?.accent_color || '#4da6ff';
    const typeName = type?.name || 'Unknown';
    const typeIcon = resolveIcon(type?.icon || null);

    // Convert 0-1 normalized positions to canvas pixel coordinates
    // Using a 2000x2000 canvas space (plenty of room)
    const canvasX = nord.position_x * 2000 - 1000;
    const canvasY = nord.position_y * 2000 - 1000;

    // Normalize scale within type: lowest-of-type → 0.0, highest → 1.0
    const rawScale = nord.scale ?? 0.5;
    const range = scaleRanges.get(nord.type_id);
    let normalizedScale = 0.5; // default for single-node types
    if (range && range.max !== range.min) {
      normalizedScale = (rawScale - range.min) / (range.max - range.min);
    }

    // Build properties array from JSONB
    const properties = Object.entries(nord.properties || {}).map(([key, value]) => ({
      key,
      value: String(value),
    }));

    return {
      id: nord.id,
      type: 'nordNode',
      position: { x: canvasX, y: canvasY },
      data: {
        title: nord.title || 'Untitled',
        type: typeName,
        typeIcon,
        typeColor,
        size: normalizedScale,
        hasScale: !!type?.scale_property,
        properties,
        isGhosted: false,
        // Preserve raw values for write-back
        _rawScale: rawScale,
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

    return {
      id: conn.id,
      source: conn.source_nord_id,
      target: conn.target_nord_id,
      type: 'euclidean',
      data: {
        type: typeName,
        color: typeColor,
        direction: conn.direction === 'forward' ? 'to' : conn.direction === 'reverse' ? 'from' : 'none',
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

/**
 * graphToReactFlow.ts — Transforms API graph data into React Flow format.
 *
 * This is the bridge between the PostgreSQL stored procedure's output
 * and what React Flow needs to render nodes and edges on the canvas.
 */

import {
  Square, User, FileText, Bug, Target, Lightbulb, Layers,
  AlertTriangle, CheckSquare, CircleDot, Hexagon, Star,
  Zap, Heart, Bookmark, Flag, Clock, Shield, Globe,
  Code, Database, Cloud, Settings, Package, Puzzle
} from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';
import type { ProjectGraph, Nord, Connection, NordType, ConnectionType } from '../hooks/useProjectGraph';

// ── Icon Registry ──
// Maps icon string names (stored in DB) to Lucide React components.

const ICON_MAP: Record<string, React.ElementType> = {
  Square, User, FileText, Bug, Target, Lightbulb, Layers,
  AlertTriangle, CheckSquare, CircleDot, Hexagon, Star,
  Zap, Heart, Bookmark, Flag, Clock, Shield, Globe,
  Code, Database, Cloud, Settings, Package, Puzzle,
};

const DEFAULT_ICON = Square;

function resolveIcon(iconName: string | null): React.ElementType {
  if (!iconName) return DEFAULT_ICON;
  return ICON_MAP[iconName] || DEFAULT_ICON;
}

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
        size: nord.scale ?? 0.5,
        hasScale: true,
        properties,
        isGhosted: false,
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
      },
    };
  });
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

/**
 * types/canvas.ts — Shared type definitions for React Flow node/edge data.
 *
 * This is the single source of truth for the shape of data attached to
 * React Flow nodes and edges. Using these types with generics
 * (Edge<NordEdgeData>, Node<NordNodeData>) eliminates `as any` casts.
 */

import type { LucideIcon } from 'lucide-react';

/** Data bag attached to every NordNode in React Flow */
export interface NordNodeData {
  title: string;
  type: string;
  typeIcon: LucideIcon;
  typeColor: string;
  commentCount?: number;
  isGhosted?: boolean;
  properties: Array<{ key: string; value: string; color?: string; cardRow?: number }>;
  /** Internal: the nord_type UUID for filtering */
  _typeId: string;
  /** Internal: the raw 0-1 scale value */
  _rawScale?: number;
  [key: string]: unknown; // React Flow requires index signature
}

/** Data bag attached to every EuclideanEdge in React Flow */
export interface NordEdgeData {
  type: string;
  color: string;
  direction: 'to' | 'from' | 'both' | 'none';
  /** The verb for this connection type (e.g. 'blocks') */
  _verb: string | null;
  /** Per-direction preposition words */
  _prepositions: {
    forward: string;  // e.g. 'from'
    reverse: string;  // e.g. 'to'
    both: string;     // e.g. 'together'
  };
  /** Internal: connection_type UUID */
  _typeId: string;
  /** Internal: normalized 0-1 distance on X axis */
  _distanceX: number;
  /** Internal: normalized 0-1 distance on Y axis */
  _distanceY: number;
  /** Set by lens dimming when edge is non-active type */
  dimmed?: boolean;
  /** Set when edge should be invisible (ghosted/hidden) */
  ghost?: boolean;
  /** Set when edge is connected to the focused (selected/dragged) node */
  _highlighted?: boolean;
  [key: string]: unknown;
}

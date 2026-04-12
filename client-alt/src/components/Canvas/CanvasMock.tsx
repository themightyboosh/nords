/**
 * CanvasMock.tsx — Spatial Canvas & Matrix View
 *
 * Renders the two primary visual representations of the Nords graph:
 *
 *   1. **Canvas / Link Lens** (spatial graph)
 *      - Dot grid + major grid lines as canvas background
 *      - SVG connection layer with ribboning for parallel connections
 *      - Angle-matched connection labels in colored pills
 *      - Nord cards with type icon, title, 2 properties, scale value
 *      - Comment badges on nords with comments
 *      - Zoom controls (bottom-right)
 *
 *   2. **Matrix Lens** (spatial pivot table / kanban bridge)
 *      - Column headers derived from stage labels
 *      - Cards sorted into columns by their stage index
 *      - Left-border accent colored by nord type
 *
 * Link Mode Behaviors:
 *   - Only the active connection type renders at full opacity
 *   - Other connection types render as context ghosts (8% opacity) or hidden
 *   - Unconnected nords render as ghosts (20% opacity) or hidden per `showContext`
 *
 * This is a STATIC MOCKUP — positions are hardcoded percentages, not physics-driven.
 * In production, positions would come from the force-directed physics engine.
 *
 * @see docs/frontend/04_ui_and_interactions.md §1.4 Nord Card Anatomy
 * @see docs/frontend/05_spatial_lenses_and_animation.md §1 Canvas Lens, §2 Link Lens, §5 Matrix
 */

import React, { useState } from 'react';
import {
  Square, User, FileText, Plus, Minus, Maximize, Maximize2, MessageSquare,
  Bug, Target, Lightbulb, Layers, AlertTriangle, X, Pencil, Trash2,
} from 'lucide-react';
import type { LensMode } from '../../App';
import Spectrum from '../Spectrum/Spectrum';
import './CanvasMock.css';

/* ═══════════════════════════════════════════════════════════════════ */
/* DATA TYPES                                                         */
/* ═══════════════════════════════════════════════════════════════════ */

/** A single key:value property displayed on a Nord card */
interface NordProperty {
  key: string;
  value: string;
  /** Optional semantic color (e.g., green for "Done", red for "Critical") */
  color?: string;
}

/** Complete data shape for a single Nord (node card) */
interface NordData {
  id: string;
  title: string;
  /** The user-defined type name (e.g., "Task", "Bug", "Person") */
  type: string;
  /** Lucide icon component for this type */
  typeIcon: React.ElementType;
  /** Accent color for this type (hex) */
  typeColor: string;
  /** All properties on this nord — first 2 render in collapsed state */
  properties: NordProperty[];
  /** Canvas position as percentage (0–100) of container width */
  x: number;
  /** Canvas position as percentage (0–100) of container height */
  y: number;
  /** Number of comments on this nord (0 = no badge shown) */
  commentCount: number;
  /**
   * Scale value (0.0–1.0) controlling the card's rendered width.
   * Per PRD §1.4: 25% to 200% of base width = 0.25x to 2.0x.
   * Formula: width = 200px * (0.75 + size * 1.25)
   */
  size: number;
  /**
   * Whether this nord's type has a scale property configured.
   * When true, the resize handle appears on the card.
   * When false, the card renders at a uniform base width.
   * Scale config is set per-type in Manage Types.
   */
  hasScale: boolean;
  /**
   * Mock stage bucket index for Matrix view columns.
   * Maps to STAGE_LABELS array (0 = "To Do", 1 = "In Progress", 2 = "Done").
   * Undefined = nord excluded from Matrix view.
   */
  stageIndex?: number;
}

/** A connection (relationship) linking two nords */
interface ConnectionData {
  /** Source nord ID */
  from: string;
  /** Target nord ID */
  to: string;
  /** Connection type name (must match CONNECTION_TYPES in GlobalDock) */
  type: string;
  /** Line color (hex, matches the connection type accent) */
  color: string;
  /**
   * Connection distance (0.0–1.0) (0.0–1.0).
   * Per Invariant 1: this IS the data — closer = stronger relationship.
   */
  value: number;
  /**
   * Arrow direction for this connection.
   * 'to' = arrow at target (A→B), 'from' = arrow at source (A←B), 'none' = undirected.
   * Defaults are set at the line type level but can be overridden per instance.
   */
  direction: 'to' | 'from' | 'none';
  /**
   * If true, renders at reduced opacity (ghost line).
   * Used in Canvas mode to show background connection context.
   */
  ghost?: boolean;
}

/* ═══════════════════════════════════════════════════════════════════ */
/* DEMO DATA                                                          */
/*                                                                    */
/* Sample graph representing a "Product Launch Q3" project workspace.  */
/* 10 nords across 8 types, 14 connections across 4 connection types.     */
/* ═══════════════════════════════════════════════════════════════════ */

const NORDS: NordData[] = [
  {
    id: 'n1', title: 'Auth & SSO Integration', type: 'Task', typeIcon: Square, typeColor: '#4da6ff',
    properties: [
      { key: 'Status', value: 'Done', color: 'var(--nords-color-success)' },
      { key: 'Assignee', value: 'Daniel' },
      { key: 'Sprint', value: 'Sprint 3' },
      { key: 'Estimate', value: '8pt' },
    ],
    x: 14, y: 28, commentCount: 0, size: 0.5, hasScale: true, stageIndex: 2,
  },
  {
    id: 'n2', title: 'Physics Engine Spike', type: 'Task', typeIcon: Square, typeColor: '#4da6ff',
    properties: [
      { key: 'Status', value: 'In Progress', color: 'var(--nords-color-info)' },
      { key: 'Assignee', value: 'Sarah' },
      { key: 'Sprint', value: 'Sprint 4' },
      { key: 'Complexity', value: 'High' },
    ],
    x: 38, y: 42, commentCount: 2, size: 0.85, hasScale: true, stageIndex: 1,
  },
  {
    id: 'n3', title: 'Canvas Renderer', type: 'Task', typeIcon: Square, typeColor: '#4da6ff',
    properties: [
      { key: 'Status', value: 'To Do', color: 'var(--nords-color-danger)' },
      { key: 'Estimate', value: '13pt' },
    ],
    x: 62, y: 22, commentCount: 0, size: 0.6, hasScale: true, stageIndex: 0,
  },
  {
    id: 'n4', title: 'Sarah Chen', type: 'Person', typeIcon: User, typeColor: '#34d399',
    properties: [
      { key: 'Role', value: 'Lead Engineer' },
      { key: 'Team', value: 'Platform' },
    ],
    x: 16, y: 62, commentCount: 0, size: 0.5, hasScale: false,
  },
  {
    id: 'n5', title: 'API Design Doc', type: 'Artifact', typeIcon: FileText, typeColor: '#fbbf24',
    properties: [
      { key: 'Status', value: 'Review', color: 'var(--nords-color-warning)' },
      { key: 'Owner', value: 'Daniel' },
      { key: 'Pages', value: '12' },
    ],
    x: 72, y: 54, commentCount: 1, size: 0.5, hasScale: false, stageIndex: 1,
  },
  {
    id: 'n6', title: 'Login timeout on Safari', type: 'Bug', typeIcon: Bug, typeColor: '#f87171',
    properties: [
      { key: 'Severity', value: 'Critical', color: 'var(--nords-color-danger)' },
      { key: 'Browser', value: 'Safari 17' },
      { key: 'Sprint', value: 'Sprint 4' },
    ],
    x: 44, y: 72, commentCount: 0, size: 0.55, hasScale: true, stageIndex: 0,
  },
  {
    id: 'n7', title: 'Beta Launch', type: 'Milestone', typeIcon: Target, typeColor: '#a78bfa',
    properties: [
      { key: 'Date', value: 'May 15' },
      { key: 'Progress', value: '62%' },
    ],
    x: 82, y: 34, commentCount: 0, size: 0.9, hasScale: true, stageIndex: 1,
  },
  {
    id: 'n8', title: 'Auto-layout Algorithm', type: 'Idea', typeIcon: Lightbulb, typeColor: '#fb923c',
    properties: [
      { key: 'Priority', value: 'Medium' },
      { key: 'Votes', value: '7' },
    ],
    x: 86, y: 68, commentCount: 0, size: 0.5, hasScale: false, stageIndex: 0,
  },
  {
    id: 'n9', title: 'User Onboarding', type: 'Epic', typeIcon: Layers, typeColor: '#f472b6',
    properties: [
      { key: 'Status', value: 'In Progress', color: 'var(--nords-color-info)' },
      { key: 'Stories', value: '14' },
      { key: 'Completion', value: '40%' },
    ],
    x: 28, y: 86, commentCount: 0, size: 0.75, hasScale: true, stageIndex: 1,
  },
  {
    id: 'n10', title: 'Vendor Lock-in', type: 'Risk', typeIcon: AlertTriangle, typeColor: '#ef4444',
    properties: [
      { key: 'Likelihood', value: 'High', color: 'var(--nords-color-danger)' },
      { key: 'Impact', value: 'Severe' },
      { key: 'Mitigation', value: 'Multi-cloud' },
    ],
    x: 56, y: 88, commentCount: 1, size: 0.65, hasScale: true,
  },
];

/**
 * Connections between nords.
 * - Non-ghost connections render with arrows + labels in Canvas mode
 * - Ghost connections render at 15% opacity as ambient context
 * - In Link mode, only the active type renders fully
 */
const CONNECTIONS: ConnectionData[] = [
  // Blocks connections (blue) — default: 'to' (A blocks B)
  { from: 'n1', to: 'n2', type: 'Blocks', color: '#4da6ff', value: 0.72, direction: 'to' },
  { from: 'n2', to: 'n3', type: 'Blocks', color: '#4da6ff', value: 0.91, direction: 'to' },
  { from: 'n5', to: 'n6', type: 'Blocks', color: '#4da6ff', value: 0.88, direction: 'to', ghost: true },
  { from: 'n10', to: 'n7', type: 'Blocks', color: '#4da6ff', value: 0.70, direction: 'to', ghost: true },

  // Depends connections (amber) — default: 'from' (B depends on A)
  { from: 'n2', to: 'n3', type: 'Depends', color: '#fbbf24', value: 0.55, direction: 'from' },
  { from: 'n3', to: 'n5', type: 'Depends', color: '#fbbf24', value: 0.45, direction: 'from', ghost: true },
  { from: 'n6', to: 'n2', type: 'Depends', color: '#fbbf24', value: 0.65, direction: 'from', ghost: true },
  { from: 'n7', to: 'n3', type: 'Depends', color: '#fbbf24', value: 0.80, direction: 'from' },

  // Relates connections (violet) — default: 'none' (undirected)
  { from: 'n1', to: 'n2', type: 'Relates', color: '#a78bfa', value: 0.30, direction: 'none' },
  { from: 'n2', to: 'n3', type: 'Relates', color: '#a78bfa', value: 0.20, direction: 'none', ghost: true },
  { from: 'n9', to: 'n1', type: 'Relates', color: '#a78bfa', value: 0.40, direction: 'none', ghost: true },
  { from: 'n8', to: 'n2', type: 'Relates', color: '#a78bfa', value: 0.55, direction: 'none', ghost: true },

  // Assigned connections (green) — default: 'to' (person assigned to task)
  { from: 'n4', to: 'n2', type: 'Assigned', color: '#34d399', value: 0.15, direction: 'to' },
  { from: 'n4', to: 'n6', type: 'Assigned', color: '#34d399', value: 0.32, direction: 'to', ghost: true },
];

/**
 * Matrix column headers — mock stage labels for the active connection type.
 * In production, these come from the connection type's Semantic Stage config.
 * @see docs/architecture/02_data_model_and_physics.md §1.4 The Semantic Stage
 */
const STAGE_LABELS = ['To Do', 'In Progress', 'Done'];

/* ═══════════════════════════════════════════════════════════════════ */
/* GEOMETRY HELPERS                                                   */
/* ═══════════════════════════════════════════════════════════════════ */

/**
 * Calculate the perpendicular offset for a connection in a ribbon.
 *
 * When two nords share multiple connection types (e.g., "Blocks" AND "Depends"),
 * the lines must bow outward like a ribbon cable to remain individually visible
 * and selectable. This function computes each line's offset from center.
 *
 * @see docs/frontend/04_ui_and_interactions.md §1.6 Line Spreading (Ribboning)
 */
function getRibbonOffset(connection: ConnectionData, allConnections: ConnectionData[]): number {
  // Create a direction-agnostic key for the node pair
  const pairKey = [connection.from, connection.to].sort().join('-');
  const siblings = allConnections.filter(t => [t.from, t.to].sort().join('-') === pairKey);
  if (siblings.length <= 1) return 0;

  const myIndex = siblings.indexOf(connection);
  const spread = 1.2; // Perpendicular distance between parallel lines (in SVG units)
  const totalWidth = (siblings.length - 1) * spread;
  return (myIndex * spread) - (totalWidth / 2);
}

/**
 * Get the set of nord IDs that participate in a given connection type.
 * Used in Link mode to determine which nords should be ghosted vs. active.
 */
function getConnectedNordIds(lineType: string): Set<string> {
  const ids = new Set<string>();
  CONNECTIONS.forEach(t => {
    if (t.type === lineType) {
      ids.add(t.from);
      ids.add(t.to);
    }
  });
  return ids;
}

/**
 * Get the card dimensions for a nord (in viewBox units).
 * The SVG viewBox is 0-100, but card widths are in px.
 * We approximate the card rect in viewBox units using a conversion factor.
 * Container width ≈ 1400px → 100 viewBox units → 1 unit ≈ 14px.
 */
function getCardRect(id: string): { cx: number; cy: number; hw: number; hh: number } {
  const nord = NORDS.find(n => n.id === id);
  if (!nord) return { cx: 0, cy: 0, hw: 5, hh: 4 };
  const pxToVB = 100 / 1400; // approximate conversion
  const cardWidthPx = 200 * (0.75 + nord.size * 1.25);
  const cardHeightPx = 110; // approximate rendered height
  return {
    cx: nord.x,
    cy: nord.y,
    hw: (cardWidthPx / 2) * pxToVB, // half-width in viewBox units
    hh: (cardHeightPx / 2) * pxToVB, // half-height in viewBox units
  };
}

/**
 * Clip a line endpoint to the edge of a card's bounding rectangle.
 * Given a ray from (cx, cy) toward (tx, ty), find where it exits the rect.
 * Returns the intersection point on the card edge — this is where the arrow appears.
 */
function clipToCardEdge(
  cx: number, cy: number, hw: number, hh: number,
  tx: number, ty: number
): { x: number; y: number } {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  // Scale factors to reach each edge
  const sx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy); // Whichever edge is hit first

  return { x: cx + dx * s, y: cy + dy * s };
}

/* ═══════════════════════════════════════════════════════════════════ */
/* COMPONENT                                                          */
/* ═══════════════════════════════════════════════════════════════════ */

interface CanvasMockProps {
  /** Callback when a nord is clicked — opens the Detail Drawer */
  onNordClick: (id: string) => void;
  /** Callback when a connection line is clicked — opens Line Detail */
  onLineClick?: () => void;
  /** Currently selected nord ID (null = none selected) */
  selectedNord: string | null;
  /** Active lens mode: canvas | link | matrix */
  lens: LensMode;
  /** Name of the currently active connection type (for Link + Matrix) */
  activeLine: string;
  /** Link mode: whether to show unconnected nords as 20% ghosts */
  showContext: boolean;
}

const CanvasMock: React.FC<CanvasMockProps> = ({
  onNordClick, onLineClick, selectedNord, lens, activeLine, showContext,
}) => {
  const [zoom, setZoom] = useState(100);
  /** Pan offset in pixels (translated before zoom) */
  const [pan, setPan] = useState({ x: 0, y: 0 });
  /** Ref for tracking drag-to-pan state without re-renders */
  const panRef = React.useRef({ dragging: false, startX: 0, startY: 0, panStartX: 0, panStartY: 0 });

  /* ── Zoom controls ── */
  const zoomIn = () => setZoom(z => Math.min(200, z + 10));
  const zoomOut = () => setZoom(z => Math.max(25, z - 10));
  const resetZoom = () => { setZoom(100); setPan({ x: 0, y: 0 }); };

  /** Mousewheel zoom — 5% per tick, clamped [25, 200] */
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(200, Math.max(25, z + (e.deltaY < 0 ? 5 : -5))));
  };

  /** Canvas drag-to-pan — middle click or spacebar held */
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan when clicking empty canvas (not a nord card)
    if ((e.target as HTMLElement).closest('.nords-node')) return;
    panRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, panStartX: pan.x, panStartY: pan.y };
    (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!panRef.current.dragging) return;
    setPan({
      x: panRef.current.panStartX + (e.clientX - panRef.current.startX),
      y: panRef.current.panStartY + (e.clientY - panRef.current.startY),
    });
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    panRef.current.dragging = false;
    (e.currentTarget as HTMLElement).style.cursor = '';
  };

  /**
   * Inverse scale factor for zoom-independent elements.
   * Per PRD §1.10: "Line labels and sticky notes do NOT scale —
   * they remain at a fixed readable size regardless of zoom level."
   */
  const inverseScale = 100 / zoom;

  /** Look up a nord's canvas position by ID */
  const getNordPos = (id: string) => {
    const n = NORDS.find(n => n.id === id);
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
  };

  // In Link mode: compute which nords participate in the active connection type
  const connectedIds = lens === 'link' ? getConnectedNordIds(activeLine) : null;

  /* ── Compute connection label positions ──
   *
   * Each visible connection gets a label placed at its midpoint, with:
   *   - Angle matching the line direction (CSS rotate)
   *   - Auto-correction for angles beyond ±90° to stay readable
   *   - Stagger offset when multiple labels share the same node pair
   */
  const visibleConnections = lens === 'link'
    ? CONNECTIONS.filter(t => t.type === activeLine)
    : CONNECTIONS;

  // Only non-ghost connections get labels (in Canvas mode); all active connections get labels in Link mode
  const labelConnections = visibleConnections.filter(t =>
    lens === 'link' ? true : !t.ghost
  );

  const connectionLabels = labelConnections.map((t, _i, arr) => {
    const from = getNordPos(t.from);
    const to = getNordPos(t.to);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    // Ribbon offset (perpendicular displacement for parallel lines)
    const offset = getRibbonOffset(t, CONNECTIONS);
    const perpX = (-dy / len) * offset;
    const perpY = (dx / len) * offset;

    // Angle of the line — corrected so text never renders upside-down
    let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angleDeg > 90) angleDeg -= 180;
    if (angleDeg < -90) angleDeg += 180;

    // Stagger labels along the line axis when multiple connections share a node pair
    const pairKey = [t.from, t.to].sort().join('-');
    const siblings = arr.filter(s => [s.from, s.to].sort().join('-') === pairKey);
    const sibIdx = siblings.indexOf(t);
    const stagger = siblings.length > 1 ? (sibIdx - (siblings.length - 1) / 2) * 2 : 0;
    const staggerX = (dx / len) * stagger;
    const staggerY = (dy / len) * stagger;

    // Final midpoint position
    const midX = (from.x + to.x) / 2 + perpX + staggerX;
    const midY = (from.y + to.y) / 2 + perpY + staggerY;

    return { x: midX, y: midY, type: t.type, color: t.color, angleDeg };
  });

  /* ═══════════════════════════════════════════════════════════════ */
  /* MATRIX VIEW                                                    */
  /*                                                                */
  /* Spatial Pivot Table: nords sorted into columns by their        */
  /* quantized stage index for the active connection type.        */
  /* @see docs/frontend/05_spatial_lenses_and_animation.md §5       */
  /* ═══════════════════════════════════════════════════════════════ */

  if (lens === 'matrix') {
    const matrixNords = NORDS.filter(n => n.stageIndex !== undefined);
    return (
      <div className="nords-canvas nords-matrix-view">
        <div className="nords-matrix">
          {/* Column headers — derived from stage labels */}
          <div className="nords-matrix__header">
            {STAGE_LABELS.map((col, i) => (
              <div key={i} className="nords-matrix__col-header">
                <span className="nords-matrix__col-label">{col}</span>
                <span className="nords-matrix__col-count">
                  {matrixNords.filter(n => n.stageIndex === i).length}
                </span>
              </div>
            ))}
          </div>

          {/* Column bodies — cards sorted by stage bucket */}
          <div className="nords-matrix__body">
            {STAGE_LABELS.map((_, colIdx) => (
              <div key={colIdx} className="nords-matrix__column">
                {matrixNords
                  .filter(n => n.stageIndex === colIdx)
                  .map(nord => {
                    const Icon = nord.typeIcon;
                    return (
                      <div
                        key={nord.id}
                        className={`nords-matrix__card ${selectedNord === nord.id ? 'is-selected' : ''}`}
                        style={{ borderLeftColor: nord.typeColor }}
                        onClick={() => onNordClick(nord.id)}
                      >
                        <div className="nords-matrix__card-header">
                          <Icon size={12} strokeWidth={2} color={nord.typeColor} />
                          <span className="nords-matrix__card-type" style={{ color: nord.typeColor }}>
                            {nord.type}
                          </span>
                        </div>
                        <h4 className="nords-matrix__card-title">{nord.title}</h4>
                        {nord.properties[0] && (
                          <span
                            className="nords-matrix__card-prop"
                            style={nord.properties[0].color ? { color: nord.properties[0].color } : undefined}
                          >
                            {nord.properties[0].value}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /* CANVAS + LINK VIEWS (spatial graph)                            */
  /*                                                                */
  /* Renders the force-directed graph layout with:                  */
  /*   - Background grid (dots + major lines)                       */
  /*   - SVG connection layer with arrows + ribboning                   */
  /*   - Angle-matched connection labels                                */
  /*   - Nord cards with type tinting via color-mix()               */
  /*   - Comment badges (top-right of card)                         */
  /*   - Zoom controls (bottom-right)                               */
  /* ═══════════════════════════════════════════════════════════════ */

  return (
    <div
      className="nords-canvas"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >

      {/* Zoomable + pannable content wrapper */}
      <div
        className="nords-canvas__content"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})` }}
      >
        {/* Background grid: dot pattern + major lines */}
        <div className="nords-canvas__grid" />
        <div className="nords-canvas__grid-lines" />

        {/* ── SVG Connection Layer ──
         *
         * Uses a 0-100 viewBox matching the percentage-based nord positions.
         * Lines use quadratic Bézier curves when ribboned (offset > 0)
         * and straight lines when solo (offset === 0).
         */}
        <svg className="nords-canvas__connections" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Arrow markers for each connection type color */}
          <defs>
            <marker id="arrow-blue" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6Z" fill="#4da6ff" />
            </marker>
            <marker id="arrow-green" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6Z" fill="#34d399" />
            </marker>
            <marker id="arrow-amber" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6Z" fill="#fbbf24" />
            </marker>
            <marker id="arrow-violet" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6Z" fill="#a78bfa" />
            </marker>
            <marker id="arrow-red" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6Z" fill="#f87171" />
            </marker>
            {/* Start markers — for 'from' direction (arrow at source end) */}
            <marker id="arrow-blue-start" markerWidth="8" markerHeight="6" refX="1" refY="3" orient="auto-start-reverse">
              <path d="M8,0 L0,3 L8,6Z" fill="#4da6ff" />
            </marker>
            <marker id="arrow-green-start" markerWidth="8" markerHeight="6" refX="1" refY="3" orient="auto-start-reverse">
              <path d="M8,0 L0,3 L8,6Z" fill="#34d399" />
            </marker>
            <marker id="arrow-amber-start" markerWidth="8" markerHeight="6" refX="1" refY="3" orient="auto-start-reverse">
              <path d="M8,0 L0,3 L8,6Z" fill="#fbbf24" />
            </marker>
            <marker id="arrow-violet-start" markerWidth="8" markerHeight="6" refX="1" refY="3" orient="auto-start-reverse">
              <path d="M8,0 L0,3 L8,6Z" fill="#a78bfa" />
            </marker>
            <marker id="arrow-red-start" markerWidth="8" markerHeight="6" refX="1" refY="3" orient="auto-start-reverse">
              <path d="M8,0 L0,3 L8,6Z" fill="#f87171" />
            </marker>
          </defs>

          {/* Render each connection as an SVG path */}
          {CONNECTIONS.map((t, i) => {
            const from = getNordPos(t.from);
            const to = getNordPos(t.to);

            // Clip endpoints to card edges so arrows appear at the card lip
            const fromRect = getCardRect(t.from);
            const toRect = getCardRect(t.to);
            const clippedFrom = clipToCardEdge(fromRect.cx, fromRect.cy, fromRect.hw, fromRect.hh, to.x, to.y);
            const clippedTo = clipToCardEdge(toRect.cx, toRect.cy, toRect.hw, toRect.hh, from.x, from.y);

            const midX = (clippedFrom.x + clippedTo.x) / 2;
            const midY = (clippedFrom.y + clippedTo.y) / 2;

            // Ribbon offset — perpendicular displacement for parallel lines
            const offset = getRibbonOffset(t, CONNECTIONS);
            const dx = clippedTo.x - clippedFrom.x;
            const dy = clippedTo.y - clippedFrom.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const perpX = (-dy / len) * offset;
            const perpY = (dx / len) * offset;

            // Control point for quadratic Bézier (only for ribboned lines)
            const cpX = midX + perpX * 2;
            const cpY = midY + perpY * 2;
            const pathD = offset === 0
              ? `M ${clippedFrom.x} ${clippedFrom.y} L ${clippedTo.x} ${clippedTo.y}`
              : `M ${clippedFrom.x} ${clippedFrom.y} Q ${cpX} ${cpY} ${clippedTo.x} ${clippedTo.y}`;

            // Map line color to arrow marker ID
            const arrowId = t.color === '#4da6ff' ? 'arrow-blue'
              : t.color === '#34d399' ? 'arrow-green'
              : t.color === '#fbbf24' ? 'arrow-amber'
              : t.color === '#f87171' ? 'arrow-red'
              : 'arrow-violet';

            // Determine connection rendering class based on mode
            //   Canvas mode: active (full) vs ghost (ambient)
            //   Link mode: active type = full, others = context ghost or hidden
            let connectionClass = t.ghost ? 'nords-connection--ghost' : 'nords-connection--active';
            if (lens === 'link') {
              if (t.type === activeLine) {
                connectionClass = 'nords-connection--active';
              } else if (showContext) {
                connectionClass = 'nords-connection--context';
              } else {
                return null; // Completely hidden when context is off
              }
            }

            return (
              <g key={i}>
                {/* Invisible fat hit-area for click detection */}
                <path
                  d={pathD}
                  stroke="transparent"
                  strokeWidth="1.5"
                  fill="none"
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); onLineClick?.(); }}
                />
                {/* Visible line with arrow markers */}
                <path
                  d={pathD}
                  className={connectionClass}
                  stroke={t.color}
                  fill="none"
                  markerEnd={connectionClass === 'nords-connection--active' && t.direction === 'to' ? `url(#${arrowId})` : undefined}
                  markerStart={connectionClass === 'nords-connection--active' && t.direction === 'from' ? `url(#${arrowId}-start)` : undefined}
                />
              </g>
            );
          })}
        </svg>

        {/* ── Connection Labels ──
         *
         * Positioned at each connection's midpoint inside a colored pill.
         * Label text angle matches the parent line via CSS rotate().
         * Labels are zoom-independent (inverse-scaled).
         *
         * @see docs/frontend/04_ui_and_interactions.md §1.6 Line Label Positioning
         */}
        {connectionLabels.map((label, i) => (
          <div
            key={`label-${i}`}
            className="nords-connection-label"
            style={{
              left: `${label.x}%`,
              top: `${label.y}%`,
              transform: `translate(-50%, -50%) rotate(${label.angleDeg}deg) scale(${inverseScale})`,
              backgroundColor: label.color,
            }}
          >
            <span className="nords-connection-label__type">
              {label.type}
            </span>
          </div>
        ))}

        {/* ── Nord Cards ──
         *
         * Each nord renders as a positioned card with:
         *   - Type badge (icon + label, colored by type accent)
         *   - Title (2-line clamp)
         *   - First 2 properties as key:value rows
         *   - Spectrum widget showing scale value
         *   - Resize handle (bottom-right diagonal arrow)
         *   - Comment badge (outside top-right, zoom-independent)
         *
         * Card background uses color-mix() to tint 10% with type accent.
         * Border uses 20% tint. This creates subtle type differentiation.
         *
         * @see docs/frontend/04_ui_and_interactions.md §1.4 Nord Card Anatomy
         */}
        {NORDS.map((nord) => {
          const Icon = nord.typeIcon;
          const visibleProps = nord.properties.slice(0, 3);

          // Link mode: ghost nords not connected by the active type
          const isGhosted = lens === 'link' && connectedIds && !connectedIds.has(nord.id);
          if (isGhosted && !showContext) return null; // Hidden entirely when context is off

          return (
            <React.Fragment key={nord.id}>
              <div
                className={`nords-node ${selectedNord === nord.id ? 'is-selected' : ''} ${isGhosted ? 'nords-node--ghosted' : ''}`}
                style={{
                  left: `${nord.x}%`,
                  top: `${nord.y}%`,
                  width: `${200 * (0.75 + nord.size * 1.25)}px`,
                  backgroundColor: `color-mix(in srgb, ${nord.typeColor} 10%, var(--nords-color-bg-surface))`,
                  borderColor: `color-mix(in srgb, ${nord.typeColor} 20%, var(--nords-color-border-default))`,
                }}
                onClick={() => onNordClick(nord.id)}
              >
                {/* Type badge — icon + uppercase type label */}
                <div className="nords-node__titlebar">
                  <div className="nords-node__header">
                    <Icon size={14} strokeWidth={2} color={nord.typeColor} />
                    <span className="nords-node__type-label" style={{ color: nord.typeColor }}>
                      {nord.type}
                    </span>
                  </div>
                </div>

                {/* Title — 2-line clamp, soft 40 char limit */}
                <h3 className="nords-node__title">{nord.title}</h3>

                {/* Properties — first 2 configurable key:value rows */}
                {visibleProps.length > 0 && (
                  <div className="nords-node__props">
                    {visibleProps.map((p) => (
                      <div key={p.key} className="nords-node__prop">
                        <span className="nords-node__prop-key">{p.key}</span>
                        <span
                          className="nords-node__prop-value"
                          style={p.color ? { color: p.color } : undefined}
                        >
                          {p.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer — Scale indicator + overflow count */}
                <div className="nords-node__footer">
                  {nord.properties.length > 3 && (
                    <span className="nords-node__more">+{nord.properties.length - 3} more</span>
                  )}
                </div>

                {/* Resize handle — conditional based on type scale config */}
                {nord.hasScale && (
                  <div className="nords-node__resize-handle" title={`Scale: ${Math.round(nord.size * 175 + 25)}% — Drag to resize`}>
                    <Maximize2 size={14} strokeWidth={2} />
                  </div>
                )}
              </div>

              {/* Comment badge — positioned outside top-right of the card
               * Only shown when commentCount > 0 and nord is not ghosted.
               * Zoom-independent via inverse scale.
               * @see docs/frontend/04_ui_and_interactions.md §1.8 Comment Badge
               */}
              {nord.commentCount > 0 && !isGhosted && (
                <div
                  className="nords-comment-badge"
                  style={{
                    left: `calc(${nord.x}% + ${(200 * (0.75 + nord.size * 1.25)) / 2 + 8}px)`,
                    top: `calc(${nord.y}% - 20px)`,
                    transform: `scale(${inverseScale})`,
                  }}
                  title={`${nord.commentCount} comment${nord.commentCount > 1 ? 's' : ''}`}
                >
                  <MessageSquare size={14} strokeWidth={1.5} />
                  <span className="nords-comment-badge__count">{nord.commentCount}</span>
                </div>
              )}

              {/* Link mode: edge connector nodes (T/B/L/R).
               * Semi-transparent ports on each edge for drag-to-connect.
               * Only visible when the nord is selected or hovered in Link mode.
               * @see docs/frontend/04_ui_and_interactions.md §1.2 Spatial Method
               */}
              {lens === 'link' && !isGhosted && (
                <>
                  {(['top', 'bottom', 'left', 'right'] as const).map(pos => {
                    const cardW = 200 * (0.75 + nord.size * 1.25);
                    // Estimated card height (type badge + title + 3 props + footer ≈ 90px)
                    const cardH = 90;
                    const offsets: Record<string, { left: string; top: string }> = {
                      top:    { left: `${nord.x}%`, top: `calc(${nord.y}% - ${cardH / 2 + 10}px)` },
                      bottom: { left: `${nord.x}%`, top: `calc(${nord.y}% + ${cardH / 2 + 10}px)` },
                      left:   { left: `calc(${nord.x}% - ${cardW / 2 + 10}px)`, top: `${nord.y}%` },
                      right:  { left: `calc(${nord.x}% + ${cardW / 2 + 10}px)`, top: `${nord.y}%` },
                    };
                    return (
                      <div
                        key={`${nord.id}-connector-${pos}`}
                        className={`nords-connector-node nords-connector-node--${pos}`}
                        style={{
                          ...offsets[pos],
                          borderColor: CONNECTIONS.find(t => t.type === activeLine)?.color || 'var(--nords-color-accent)',
                          transform: `translate(-50%, -50%) scale(${inverseScale})`,
                        }}
                        title={`Connect from ${pos}`}
                      />
                    );
                  })}
                </>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Zoom Controls ──
       *
       * Persistent bottom-right widget with +/- buttons, percentage display,
       * and fit-to-view button. Percentage resets to 100% on click.
       *
       * @see docs/frontend/04_ui_and_interactions.md §1.10 Zoom & Pan Controls
       */}
      <div className="nords-zoom-controls nords-glass">
        <button className="nords-zoom-controls__btn" onClick={zoomOut} aria-label="Zoom out">
          <Minus size={14} strokeWidth={1.8} />
        </button>
        <button className="nords-zoom-controls__level" onClick={resetZoom} title="Reset to 100%">
          {zoom}%
        </button>
        <button className="nords-zoom-controls__btn" onClick={zoomIn} aria-label="Zoom in">
          <Plus size={14} strokeWidth={1.8} />
        </button>
        <div className="nords-zoom-controls__separator" />
        <button className="nords-zoom-controls__btn" onClick={resetZoom} aria-label="Fit to view" title="Fit to view">
          <Maximize size={13} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
};

export default CanvasMock;

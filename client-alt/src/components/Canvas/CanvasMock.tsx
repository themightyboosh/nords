import React, { useState } from 'react';
import {
  Square, User, FileText, Plus, Minus, Maximize, StickyNote, GripVertical,
  Bug, Target, Lightbulb, Layers, AlertTriangle,
} from 'lucide-react';
import type { LensMode } from '../../App';
import Spectrum from '../Spectrum/Spectrum';
import './CanvasMock.css';

/* ═══════════════════════════════════════════════ */
/* DATA TYPES                                      */
/* ═══════════════════════════════════════════════ */

interface NardProperty {
  key: string;
  value: string;
  color?: string;
}

interface NardData {
  id: string;
  title: string;
  type: string;
  typeIcon: React.ElementType;
  typeColor: string;
  properties: NardProperty[];
  x: number;
  y: number;
  stickyCount: number;
  size: number;
  /** Mock stepper value for Matrix columns (0–2 maps to To Do/Doing/Done) */
  stepperValue?: number;
}

interface TetherData {
  from: string;
  to: string;
  type: string;
  color: string;
  value: number;
  ghost?: boolean;
}

/* ═══════════════════════════════════════════════ */
/* DEMO DATA                                       */
/* ═══════════════════════════════════════════════ */

const NARDS: NardData[] = [
  {
    id: 'n1', title: 'Auth & SSO Integration', type: 'Task', typeIcon: Square, typeColor: '#4da6ff',
    properties: [
      { key: 'Status', value: 'Done', color: 'var(--nards-color-success)' },
      { key: 'Assignee', value: 'Daniel' },
      { key: 'Sprint', value: 'Sprint 3' },
      { key: 'Estimate', value: '8pt' },
    ],
    x: 14, y: 28, stickyCount: 0, size: 0.5, stepperValue: 2,
  },
  {
    id: 'n2', title: 'Physics Engine Spike', type: 'Task', typeIcon: Square, typeColor: '#4da6ff',
    properties: [
      { key: 'Status', value: 'In Progress', color: 'var(--nards-color-info)' },
      { key: 'Assignee', value: 'Sarah' },
      { key: 'Sprint', value: 'Sprint 4' },
      { key: 'Complexity', value: 'High' },
    ],
    x: 38, y: 42, stickyCount: 2, size: 0.85, stepperValue: 1,
  },
  {
    id: 'n3', title: 'Canvas Renderer', type: 'Task', typeIcon: Square, typeColor: '#4da6ff',
    properties: [
      { key: 'Status', value: 'To Do', color: 'var(--nards-color-danger)' },
      { key: 'Estimate', value: '13pt' },
    ],
    x: 62, y: 22, stickyCount: 0, size: 0.6, stepperValue: 0,
  },
  {
    id: 'n4', title: 'Sarah Chen', type: 'Person', typeIcon: User, typeColor: '#34d399',
    properties: [
      { key: 'Role', value: 'Lead Engineer' },
      { key: 'Team', value: 'Platform' },
    ],
    x: 16, y: 62, stickyCount: 0, size: 0.35,
  },
  {
    id: 'n5', title: 'API Design Doc', type: 'Artifact', typeIcon: FileText, typeColor: '#fbbf24',
    properties: [
      { key: 'Status', value: 'Review', color: 'var(--nards-color-warning)' },
      { key: 'Owner', value: 'Daniel' },
      { key: 'Pages', value: '12' },
    ],
    x: 72, y: 54, stickyCount: 1, size: 0.7, stepperValue: 1,
  },
  {
    id: 'n6', title: 'Login timeout on Safari', type: 'Bug', typeIcon: Bug, typeColor: '#f87171',
    properties: [
      { key: 'Severity', value: 'Critical', color: 'var(--nards-color-danger)' },
      { key: 'Browser', value: 'Safari 17' },
      { key: 'Sprint', value: 'Sprint 4' },
    ],
    x: 44, y: 72, stickyCount: 0, size: 0.55, stepperValue: 0,
  },
  {
    id: 'n7', title: 'Beta Launch', type: 'Milestone', typeIcon: Target, typeColor: '#a78bfa',
    properties: [
      { key: 'Date', value: 'May 15' },
      { key: 'Progress', value: '62%' },
    ],
    x: 82, y: 34, stickyCount: 0, size: 0.9, stepperValue: 1,
  },
  {
    id: 'n8', title: 'Auto-layout Algorithm', type: 'Idea', typeIcon: Lightbulb, typeColor: '#fb923c',
    properties: [
      { key: 'Priority', value: 'Medium' },
      { key: 'Votes', value: '7' },
    ],
    x: 86, y: 68, stickyCount: 0, size: 0.3, stepperValue: 0,
  },
  {
    id: 'n9', title: 'User Onboarding', type: 'Epic', typeIcon: Layers, typeColor: '#f472b6',
    properties: [
      { key: 'Status', value: 'In Progress', color: 'var(--nards-color-info)' },
      { key: 'Stories', value: '14' },
      { key: 'Completion', value: '40%' },
    ],
    x: 28, y: 86, stickyCount: 0, size: 0.75, stepperValue: 1,
  },
  {
    id: 'n10', title: 'Vendor Lock-in', type: 'Risk', typeIcon: AlertTriangle, typeColor: '#ef4444',
    properties: [
      { key: 'Likelihood', value: 'High', color: 'var(--nards-color-danger)' },
      { key: 'Impact', value: 'Severe' },
      { key: 'Mitigation', value: 'Multi-cloud' },
    ],
    x: 56, y: 88, stickyCount: 1, size: 0.65,
  },
];

const TETHERS: TetherData[] = [
  { from: 'n1', to: 'n2', type: 'Blocks', color: '#4da6ff', value: 0.72 },
  { from: 'n1', to: 'n2', type: 'Relates', color: '#a78bfa', value: 0.30 },
  { from: 'n2', to: 'n3', type: 'Blocks', color: '#4da6ff', value: 0.91 },
  { from: 'n2', to: 'n3', type: 'Depends', color: '#fbbf24', value: 0.55 },
  { from: 'n2', to: 'n3', type: 'Relates', color: '#a78bfa', value: 0.20, ghost: true },
  { from: 'n4', to: 'n2', type: 'Assigned', color: '#34d399', value: 0.15 },
  { from: 'n4', to: 'n6', type: 'Assigned', color: '#34d399', value: 0.32, ghost: true },
  { from: 'n3', to: 'n5', type: 'Depends', color: '#fbbf24', value: 0.45, ghost: true },
  { from: 'n5', to: 'n6', type: 'Blocks', color: '#4da6ff', value: 0.88, ghost: true },
  { from: 'n6', to: 'n2', type: 'Depends', color: '#fbbf24', value: 0.65, ghost: true },
  { from: 'n7', to: 'n3', type: 'Depends', color: '#fbbf24', value: 0.80 },
  { from: 'n9', to: 'n1', type: 'Relates', color: '#a78bfa', value: 0.40, ghost: true },
  { from: 'n8', to: 'n2', type: 'Relates', color: '#a78bfa', value: 0.55, ghost: true },
  { from: 'n10', to: 'n7', type: 'Blocks', color: '#4da6ff', value: 0.70, ghost: true },
];

const UNANCHORED_STICKIES = [
  'Sprint 4 retro scheduled for Fri',
  'Waiting on design review from Sandra',
  'MCP endpoint schema TBD',
];

/* Matrix column headers (mock stepper labels for "Blocks" line type) */
const MATRIX_COLUMNS = ['To Do', 'In Progress', 'Done'];

/* ═══════════════════════════════════════════════ */
/* HELPERS                                         */
/* ═══════════════════════════════════════════════ */

function getRibbonOffset(tether: TetherData, allTethers: TetherData[]): number {
  const pairKey = [tether.from, tether.to].sort().join('-');
  const siblings = allTethers.filter(t => [t.from, t.to].sort().join('-') === pairKey);
  if (siblings.length <= 1) return 0;
  const myIndex = siblings.indexOf(tether);
  const spread = 1.2;
  const totalWidth = (siblings.length - 1) * spread;
  return (myIndex * spread) - (totalWidth / 2);
}

/** Get set of nard IDs connected by a given line type */
function getConnectedNardIds(lineType: string): Set<string> {
  const ids = new Set<string>();
  TETHERS.forEach(t => {
    if (t.type === lineType) {
      ids.add(t.from);
      ids.add(t.to);
    }
  });
  return ids;
}

/* ═══════════════════════════════════════════════ */
/* COMPONENT                                       */
/* ═══════════════════════════════════════════════ */

interface CanvasMockProps {
  onNardClick: (id: string) => void;
  selectedNard: string | null;
  lens: LensMode;
  activeLine: string;
  showContext: boolean;
}

const CanvasMock: React.FC<CanvasMockProps> = ({
  onNardClick, selectedNard, lens, activeLine, showContext,
}) => {
  const [zoom, setZoom] = useState(100);

  const zoomIn = () => setZoom(z => Math.min(200, z + 10));
  const zoomOut = () => setZoom(z => Math.max(25, z - 10));
  const resetZoom = () => setZoom(100);
  const inverseScale = 100 / zoom;

  const getNardPos = (id: string) => {
    const n = NARDS.find(n => n.id === id);
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
  };

  // In Link mode: which nards are connected by the active line type?
  const connectedIds = lens === 'link' ? getConnectedNardIds(activeLine) : null;

  /* ── Compute label positions with angle + stagger ── */
  const visibleTethers = lens === 'link'
    ? TETHERS.filter(t => t.type === activeLine)
    : TETHERS;

  const labelTethers = visibleTethers.filter(t =>
    lens === 'link' ? true : !t.ghost
  );

  const tetherLabels = labelTethers.map((t, _i, arr) => {
    const from = getNardPos(t.from);
    const to = getNardPos(t.to);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const offset = getRibbonOffset(t, TETHERS);
    const perpX = (-dy / len) * offset;
    const perpY = (dx / len) * offset;

    let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angleDeg > 90) angleDeg -= 180;
    if (angleDeg < -90) angleDeg += 180;

    const pairKey = [t.from, t.to].sort().join('-');
    const siblings = arr.filter(s => [s.from, s.to].sort().join('-') === pairKey);
    const sibIdx = siblings.indexOf(t);
    const stagger = siblings.length > 1 ? (sibIdx - (siblings.length - 1) / 2) * 2 : 0;
    const staggerX = (dx / len) * stagger;
    const staggerY = (dy / len) * stagger;

    const midX = (from.x + to.x) / 2 + perpX + staggerX;
    const midY = (from.y + to.y) / 2 + perpY + staggerY;

    return { x: midX, y: midY, type: t.type, color: t.color, angleDeg };
  });

  /* ═══ MATRIX VIEW ═══ */
  if (lens === 'matrix') {
    const matrixNards = NARDS.filter(n => n.stepperValue !== undefined);
    return (
      <div className="nards-canvas nards-matrix-view">
        <div className="nards-matrix">
          <div className="nards-matrix__header">
            {MATRIX_COLUMNS.map((col, i) => (
              <div key={i} className="nards-matrix__col-header">
                <span className="nards-matrix__col-label">{col}</span>
                <span className="nards-matrix__col-count">
                  {matrixNards.filter(n => n.stepperValue === i).length}
                </span>
              </div>
            ))}
          </div>
          <div className="nards-matrix__body">
            {MATRIX_COLUMNS.map((_, colIdx) => (
              <div key={colIdx} className="nards-matrix__column">
                {matrixNards
                  .filter(n => n.stepperValue === colIdx)
                  .map(nard => {
                    const Icon = nard.typeIcon;
                    return (
                      <div
                        key={nard.id}
                        className={`nards-matrix__card ${selectedNard === nard.id ? 'is-selected' : ''}`}
                        style={{
                          borderLeftColor: nard.typeColor,
                        }}
                        onClick={() => onNardClick(nard.id)}
                      >
                        <div className="nards-matrix__card-header">
                          <Icon size={12} strokeWidth={2} color={nard.typeColor} />
                          <span className="nards-matrix__card-type" style={{ color: nard.typeColor }}>
                            {nard.type}
                          </span>
                        </div>
                        <h4 className="nards-matrix__card-title">{nard.title}</h4>
                        {nard.properties[0] && (
                          <span
                            className="nards-matrix__card-prop"
                            style={nard.properties[0].color ? { color: nard.properties[0].color } : undefined}
                          >
                            {nard.properties[0].value}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>

        {/* Zoom Controls (still visible) */}
        <div className="nards-zoom-controls nards-glass">
          <button className="nards-zoom-controls__btn" onClick={zoomOut}><Minus size={14} strokeWidth={1.8} /></button>
          <button className="nards-zoom-controls__level" onClick={resetZoom}>{zoom}%</button>
          <button className="nards-zoom-controls__btn" onClick={zoomIn}><Plus size={14} strokeWidth={1.8} /></button>
          <div className="nards-zoom-controls__separator" />
          <button className="nards-zoom-controls__btn" onClick={resetZoom}><Maximize size={13} strokeWidth={1.8} /></button>
        </div>
      </div>
    );
  }

  /* ═══ CANVAS + LINK VIEWS (spatial graph) ═══ */
  return (
    <div className="nards-canvas">

      {/* Unanchored stickies */}
      <div className="nards-unanchored-stickies">
        {UNANCHORED_STICKIES.map((text, i) => (
          <div key={i} className="nards-unanchored-sticky" title={text} draggable>
            <StickyNote size={24} fill="currentColor" strokeWidth={1} />
          </div>
        ))}
      </div>

      {/* Zoomable content */}
      <div
        className="nards-canvas__content"
        style={{ transform: `scale(${zoom / 100})` }}
      >
        <div className="nards-canvas__grid" />
        <div className="nards-canvas__grid-lines" />

        {/* SVG tether lines */}
        <svg className="nards-canvas__tethers" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <marker id="arrow-blue" markerWidth="4" markerHeight="3" refX="3.5" refY="1.5" orient="auto">
              <path d="M0,0 L4,1.5 L0,3Z" fill="#4da6ff" />
            </marker>
            <marker id="arrow-green" markerWidth="4" markerHeight="3" refX="3.5" refY="1.5" orient="auto">
              <path d="M0,0 L4,1.5 L0,3Z" fill="#34d399" />
            </marker>
            <marker id="arrow-amber" markerWidth="4" markerHeight="3" refX="3.5" refY="1.5" orient="auto">
              <path d="M0,0 L4,1.5 L0,3Z" fill="#fbbf24" />
            </marker>
            <marker id="arrow-violet" markerWidth="4" markerHeight="3" refX="3.5" refY="1.5" orient="auto">
              <path d="M0,0 L4,1.5 L0,3Z" fill="#a78bfa" />
            </marker>
            <marker id="arrow-red" markerWidth="4" markerHeight="3" refX="3.5" refY="1.5" orient="auto">
              <path d="M0,0 L4,1.5 L0,3Z" fill="#f87171" />
            </marker>
          </defs>
          {TETHERS.map((t, i) => {
            const from = getNardPos(t.from);
            const to = getNardPos(t.to);
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            const offset = getRibbonOffset(t, TETHERS);
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const perpX = (-dy / len) * offset;
            const perpY = (dx / len) * offset;
            const cpX = midX + perpX * 2;
            const cpY = midY + perpY * 2;
            const pathD = offset === 0
              ? `M ${from.x} ${from.y} L ${to.x} ${to.y}`
              : `M ${from.x} ${from.y} Q ${cpX} ${cpY} ${to.x} ${to.y}`;

            const arrowId = t.color === '#4da6ff' ? 'arrow-blue'
              : t.color === '#34d399' ? 'arrow-green'
              : t.color === '#fbbf24' ? 'arrow-amber'
              : t.color === '#f87171' ? 'arrow-red'
              : 'arrow-violet';

            // Link mode: active type = full, others = context ghost
            let tetherClass = t.ghost ? 'nards-tether--ghost' : 'nards-tether--active';
            if (lens === 'link') {
              if (t.type === activeLine) {
                tetherClass = 'nards-tether--active';
              } else if (showContext) {
                tetherClass = 'nards-tether--context';
              } else {
                return null; // hidden
              }
            }

            return (
              <path
                key={i}
                d={pathD}
                className={tetherClass}
                stroke={t.color}
                fill="none"
                markerEnd={tetherClass === 'nards-tether--active' ? `url(#${arrowId})` : undefined}
              />
            );
          })}
        </svg>

        {/* Line labels — angle-matched, boxed in color */}
        {tetherLabels.map((label, i) => (
          <div
            key={`label-${i}`}
            className="nards-tether-label"
            style={{
              left: `${label.x}%`,
              top: `${label.y}%`,
              transform: `translate(-50%, -50%) rotate(${label.angleDeg}deg) scale(${inverseScale})`,
              backgroundColor: label.color,
            }}
          >
            <span className="nards-tether-label__type">
              {label.type}
            </span>
          </div>
        ))}

        {/* Nard nodes */}
        {NARDS.map((nard) => {
          const Icon = nard.typeIcon;
          const visibleProps = nard.properties.slice(0, 2);

          // Link mode ghosting
          const isGhosted = lens === 'link' && connectedIds && !connectedIds.has(nard.id);
          if (isGhosted && !showContext) return null; // hidden entirely

          return (
            <React.Fragment key={nard.id}>
              <div
                className={`nards-node ${selectedNard === nard.id ? 'is-selected' : ''} ${isGhosted ? 'nards-node--ghosted' : ''}`}
                style={{
                  left: `${nard.x}%`,
                  top: `${nard.y}%`,
                  width: `${200 * (0.75 + nard.size * 1.25)}px`,
                  backgroundColor: `color-mix(in srgb, ${nard.typeColor} 10%, var(--nards-color-bg-surface))`,
                  borderColor: `color-mix(in srgb, ${nard.typeColor} 20%, var(--nards-color-border-default))`,
                }}
                onClick={() => onNardClick(nard.id)}
              >
                <div className="nards-node__titlebar">
                  <div className="nards-node__header">
                    <Icon size={14} strokeWidth={2} color={nard.typeColor} />
                    <span className="nards-node__type-label" style={{ color: nard.typeColor }}>
                      {nard.type}
                    </span>
                  </div>
                  <div className="nards-node__resize-handle" title="Drag to resize">
                    <GripVertical size={10} strokeWidth={1.5} />
                  </div>
                </div>

                <h3 className="nards-node__title">{nard.title}</h3>

                {visibleProps.length > 0 && (
                  <div className="nards-node__props">
                    {visibleProps.map((p) => (
                      <div key={p.key} className="nards-node__prop">
                        <span className="nards-node__prop-key">{p.key}</span>
                        <span
                          className="nards-node__prop-value"
                          style={p.color ? { color: p.color } : undefined}
                        >
                          {p.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="nards-node__footer">
                  <Spectrum value={nard.size} color={nard.typeColor} width={40} />
                  {nard.properties.length > 2 && (
                    <span className="nards-node__more">+{nard.properties.length - 2} more</span>
                  )}
                </div>
              </div>

              {/* Anchored stickies — outside top-right of nard */}
              {nard.stickyCount > 0 && !isGhosted && (
                <div
                  className="nards-sticky"
                  style={{
                    left: `calc(${nard.x}% + ${(200 * (0.75 + nard.size * 1.25)) / 2 + 8}px)`,
                    top: `calc(${nard.y}% - 28px)`,
                    transform: `scale(${inverseScale})`,
                  }}
                  title={`${nard.stickyCount} sticky note${nard.stickyCount > 1 ? 's' : ''}`}
                >
                  <StickyNote size={22} fill="currentColor" strokeWidth={1} />
                  {nard.stickyCount > 1 && (
                    <span className="nards-sticky__count">{nard.stickyCount}</span>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Zoom Controls */}
      <div className="nards-zoom-controls nards-glass">
        <button className="nards-zoom-controls__btn" onClick={zoomOut} aria-label="Zoom out">
          <Minus size={14} strokeWidth={1.8} />
        </button>
        <button className="nards-zoom-controls__level" onClick={resetZoom} title="Reset to 100%">
          {zoom}%
        </button>
        <button className="nards-zoom-controls__btn" onClick={zoomIn} aria-label="Zoom in">
          <Plus size={14} strokeWidth={1.8} />
        </button>
        <div className="nards-zoom-controls__separator" />
        <button className="nards-zoom-controls__btn" onClick={resetZoom} aria-label="Fit to view" title="Fit to view">
          <Maximize size={13} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
};

export default CanvasMock;

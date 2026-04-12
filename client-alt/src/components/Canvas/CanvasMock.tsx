import React, { useState } from 'react';
import { Square, User, FileText, Plus, Minus, Maximize, StickyNote } from 'lucide-react';
import './CanvasMock.css';

interface NardData {
  id: string;
  title: string;
  type: string;
  typeIcon: React.ElementType;
  typeColor: string;
  status?: string;
  statusColor?: string;
  assignee?: string;
  assigneeColor?: string;
  x: number;
  y: number;
  note?: string;
}

interface TetherData {
  from: string;
  to: string;
  type: string;
  color: string;
  value: number;
  label: string;
  ghost?: boolean;
}

const NARDS: NardData[] = [
  { id: 'n1', title: 'Auth & SSO Integration', type: 'Task', typeIcon: Square, typeColor: '#4da6ff', status: 'Done', statusColor: 'var(--nards-color-success)', assignee: 'D', assigneeColor: '#2563eb', x: 18, y: 30 },
  { id: 'n2', title: 'Physics Engine Spike', type: 'Task', typeIcon: Square, typeColor: '#4da6ff', status: 'In Progress', statusColor: 'var(--nards-color-info)', assignee: 'S', assigneeColor: '#059669', x: 42, y: 45, note: 'Benchmark at 500+ nodes' },
  { id: 'n3', title: 'Canvas Renderer', type: 'Task', typeIcon: Square, typeColor: '#4da6ff', status: 'To Do', statusColor: 'var(--nards-color-danger)', x: 66, y: 26 },
  { id: 'n4', title: 'Sarah Chen', type: 'Person', typeIcon: User, typeColor: '#34d399', x: 22, y: 65 },
  { id: 'n5', title: 'API Design Doc', type: 'Artifact', typeIcon: FileText, typeColor: '#fbbf24', status: 'Review', statusColor: 'var(--nards-color-warning)', x: 72, y: 58 },
  { id: 'n6', title: 'MCP Server', type: 'Task', typeIcon: Square, typeColor: '#4da6ff', status: 'Blocked', statusColor: 'var(--nards-color-danger)', x: 48, y: 74 },
];

const TETHERS: TetherData[] = [
  { from: 'n1', to: 'n2', type: 'Blocks', color: '#4da6ff', value: 0.72, label: 'Partial Block' },
  { from: 'n1', to: 'n2', type: 'Relates', color: '#a78bfa', value: 0.30, label: 'Weak Relation' },
  { from: 'n2', to: 'n3', type: 'Blocks', color: '#4da6ff', value: 0.91, label: 'Hard Block' },
  { from: 'n2', to: 'n3', type: 'Depends', color: '#fbbf24', value: 0.55, label: 'Medium Dep.' },
  { from: 'n2', to: 'n3', type: 'Relates', color: '#a78bfa', value: 0.20, label: 'Context', ghost: true },
  { from: 'n4', to: 'n2', type: 'Assigned', color: '#34d399', value: 0.15, label: 'Primary' },
  { from: 'n4', to: 'n6', type: 'Assigned', color: '#34d399', value: 0.32, label: 'Secondary', ghost: true },
  { from: 'n3', to: 'n5', type: 'Depends', color: '#fbbf24', value: 0.45, label: 'Moderate', ghost: true },
  { from: 'n3', to: 'n5', type: 'Relates', color: '#a78bfa', value: 0.60, label: 'Strong Ref.', ghost: true },
  { from: 'n5', to: 'n6', type: 'Blocks', color: '#4da6ff', value: 0.88, label: 'Near-Block', ghost: true },
  { from: 'n6', to: 'n2', type: 'Depends', color: '#fbbf24', value: 0.65, label: 'Strong Dep.', ghost: true },
];

/* ── Unanchored notes — pinned to top of viewport ── */
const UNANCHORED_NOTES = [
  'Sprint 4 retro scheduled for Fri',
  'Waiting on design review from Sandra',
  'MCP endpoint schema TBD',
];

interface CanvasMockProps {
  onNardClick: (id: string) => void;
  selectedNard: string | null;
}

function getRibbonOffset(tether: TetherData, allTethers: TetherData[]): number {
  const pairKey = [tether.from, tether.to].sort().join('-');
  const siblings = allTethers.filter(t => [t.from, t.to].sort().join('-') === pairKey);
  if (siblings.length <= 1) return 0;
  const myIndex = siblings.indexOf(tether);
  const spread = 1.2;
  const totalWidth = (siblings.length - 1) * spread;
  return (myIndex * spread) - (totalWidth / 2);
}

const CanvasMock: React.FC<CanvasMockProps> = ({ onNardClick, selectedNard }) => {
  const [zoom, setZoom] = useState(100);

  const zoomIn = () => setZoom(z => Math.min(200, z + 10));
  const zoomOut = () => setZoom(z => Math.max(25, z - 10));
  const resetZoom = () => setZoom(100);
  const inverseScale = 100 / zoom;

  const getNardPos = (id: string) => {
    const n = NARDS.find(n => n.id === id);
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
  };

  const tetherLabels = TETHERS.filter(t => !t.ghost).map((t, _i, arr) => {
    const from = getNardPos(t.from);
    const to = getNardPos(t.to);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const offset = getRibbonOffset(t, TETHERS);
    const perpX = (-dy / len) * offset;
    const perpY = (dx / len) * offset;

    // For Bézier curves, tangent at midpoint = direction from start to end
    // For linear, same thing. Angle in degrees.
    let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
    // Keep text readable — flip if upside down
    if (angleDeg > 90) angleDeg -= 180;
    if (angleDeg < -90) angleDeg += 180;

    // Stagger: shift label along the line direction for parallel siblings
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

  return (
    <div className="nards-canvas">

      {/* ═══ Unanchored notes — icon badges, top-left flow ═══ */}
      <div className="nards-unanchored-notes">
        {UNANCHORED_NOTES.map((note, i) => (
          <div key={i} className="nards-unanchored-note" title={note} draggable>
            <StickyNote size={24} fill="currentColor" strokeWidth={1} />
          </div>
        ))}
      </div>

      {/* ═══ Zoomable content (grid + tethers + nodes) ═══ */}
      <div
        className="nards-canvas__content"
        style={{ transform: `scale(${zoom / 100})` }}
      >
        {/* Grid scales with canvas */}
        <div className="nards-canvas__grid" />
        <div className="nards-canvas__grid-lines" />

        {/* SVG tether lines with directional arrows */}
        <svg className="nards-canvas__tethers" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            {/* Per-color arrow markers for directionality */}
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

            // Pick arrow marker by color
            const arrowId = t.color === '#4da6ff' ? 'arrow-blue'
              : t.color === '#34d399' ? 'arrow-green'
              : t.color === '#fbbf24' ? 'arrow-amber'
              : 'arrow-violet';

            return (
              <path
                key={i}
                d={pathD}
                className={t.ghost ? 'nards-tether--ghost' : 'nards-tether--active'}
                stroke={t.color}
                fill="none"
                markerEnd={!t.ghost ? `url(#${arrowId})` : undefined}
              />
            );
          })}
        </svg>

        {/* Line labels — boxed in line color, angle-matched */}
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
          return (
            <React.Fragment key={nard.id}>
              <div
                className={`nards-node ${selectedNard === nard.id ? 'is-selected' : ''}`}
                style={{
                  left: `${nard.x}%`,
                  top: `${nard.y}%`,
                  backgroundColor: `color-mix(in srgb, ${nard.typeColor} 10%, var(--nards-color-bg-surface))`,
                  borderColor: `color-mix(in srgb, ${nard.typeColor} 20%, var(--nards-color-border-default))`,
                }}
                onClick={() => onNardClick(nard.id)}
              >
                <div className="nards-node__header">
                  <Icon size={14} strokeWidth={2} color={nard.typeColor} />
                  <span className="nards-node__type-label" style={{ color: nard.typeColor }}>
                    {nard.type}
                  </span>
                </div>
                <h3 className="nards-node__title">{nard.title}</h3>
                {(nard.status || nard.assignee) && (
                  <div className="nards-node__meta">
                    {nard.status && (
                      <span
                        className="nards-node__pill"
                        style={{ color: nard.statusColor, background: `color-mix(in srgb, ${nard.statusColor} 12%, transparent)` }}
                      >
                        {nard.status}
                      </span>
                    )}
                    {nard.assignee && (
                      <span className="nards-node__assignee" style={{ backgroundColor: nard.assigneeColor }}>
                        {nard.assignee}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {/* Anchored sticky — icon-only, click to edit */}
              {nard.note && (
                <div
                  className="nards-sticky-note"
                  style={{
                    left: `${nard.x + 6}%`,
                    top: `${nard.y - 6}%`,
                    transform: `translate(-50%, -50%) scale(${inverseScale})`,
                  }}
                  title={nard.note}
                >
                  <div className="nards-sticky-note__connector" />
                  <StickyNote size={24} fill="currentColor" strokeWidth={1} />
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

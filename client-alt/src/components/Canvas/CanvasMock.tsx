import React from 'react';
import './CanvasMock.css';

interface NardData {
  id: string;
  title: string;
  type: string;
  status?: string;
  statusColor?: string;
  assignee?: string;
  x: number;
  y: number;
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
  { id: 'n1', title: 'Auth & SSO Integration', type: 'Task', status: 'Done', statusColor: 'var(--nards-color-success)', assignee: 'D', x: 18, y: 32 },
  { id: 'n2', title: 'Physics Engine Spike', type: 'Task', status: 'In Progress', statusColor: 'var(--nards-color-info)', assignee: 'S', x: 40, y: 48 },
  { id: 'n3', title: 'Canvas Renderer', type: 'Task', status: 'To Do', statusColor: 'var(--nards-color-danger)', x: 62, y: 28 },
  { id: 'n4', title: 'Sarah Chen', type: 'Person', x: 28, y: 68 },
  { id: 'n5', title: 'API Design Doc', type: 'Artifact', status: 'Review', statusColor: 'var(--nards-color-warning)', x: 72, y: 62 },
  { id: 'n6', title: 'MCP Server', type: 'Task', status: 'Blocked', statusColor: 'var(--nards-color-danger)', x: 52, y: 76 },
];

const TETHERS: TetherData[] = [
  { from: 'n1', to: 'n2', type: 'Blocks', color: 'var(--nards-color-accent)', value: 0.72, label: 'Partial Block' },
  { from: 'n2', to: 'n3', type: 'Blocks', color: 'var(--nards-color-accent)', value: 0.91, label: 'Hard Block' },
  { from: 'n4', to: 'n2', type: 'Assigned', color: 'var(--nards-color-success)', value: 0.15, label: 'Primary' },
  { from: 'n3', to: 'n5', type: 'Depends', color: 'var(--nards-color-warning)', value: 0.45, label: 'Moderate', ghost: true },
  { from: 'n5', to: 'n6', type: 'Blocks', color: 'var(--nards-color-accent)', value: 0.88, label: 'Near-Block', ghost: true },
  { from: 'n4', to: 'n6', type: 'Assigned', color: 'var(--nards-color-success)', value: 0.32, label: 'Secondary', ghost: true },
];

interface CanvasMockProps {
  onNardClick: (id: string) => void;
  selectedNard: string | null;
}

const CanvasMock: React.FC<CanvasMockProps> = ({ onNardClick, selectedNard }) => {
  const getNardPos = (id: string) => {
    const n = NARDS.find(n => n.id === id);
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
  };

  return (
    <div className="nards-canvas">
      {/* Grid dots background */}
      <div className="nards-canvas__grid" />

      {/* SVG tether layer */}
      <svg className="nards-canvas__tethers" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L6,2 L0,4" fill="var(--nards-color-accent)" opacity="0.6" />
          </marker>
        </defs>
        {TETHERS.map((t, i) => {
          const from = getNardPos(t.from);
          const to = getNardPos(t.to);
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          return (
            <g key={i} className={`nards-tether ${t.ghost ? 'is-ghost' : ''}`}>
              <line
                x1={`${from.x}%`} y1={`${from.y}%`}
                x2={`${to.x}%`} y2={`${to.y}%`}
                stroke={t.color}
                strokeWidth={t.ghost ? "0.15" : "0.25"}
                strokeDasharray={t.ghost ? "0.5,0.5" : "none"}
                opacity={t.ghost ? 0.3 : 0.7}
                markerEnd={!t.ghost ? "url(#arrow)" : undefined}
              />
              {!t.ghost && (
                <text
                  x={`${midX}%`} y={`${midY - 1.5}%`}
                  className="nards-tether__label"
                  textAnchor="middle"
                >
                  {t.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Nard nodes */}
      {NARDS.map((nard) => (
        <div
          key={nard.id}
          className={`nards-node ${selectedNard === nard.id ? 'is-selected' : ''} nards-node--${nard.type.toLowerCase()}`}
          style={{ left: `${nard.x}%`, top: `${nard.y}%` }}
          onClick={() => onNardClick(nard.id)}
        >
          <div className="nards-node__header">
            <span className="nards-node__type-indicator">{nard.type === 'Person' ? '●' : nard.type === 'Artifact' ? '◆' : '■'}</span>
            <span className="nards-node__type-label">{nard.type}</span>
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
                <span className="nards-node__assignee">{nard.assignee}</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CanvasMock;

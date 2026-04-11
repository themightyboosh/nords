import React from 'react';
import { Square, Bug, User, FileText, Target, Lightbulb } from 'lucide-react';
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
  { id: 'n1', title: 'Auth & SSO Integration', type: 'Task', typeIcon: Square, typeColor: '#4da6ff', status: 'Done', statusColor: 'var(--nards-color-success)', assignee: 'D', assigneeColor: '#2563eb', x: 18, y: 32 },
  { id: 'n2', title: 'Physics Engine Spike', type: 'Task', typeIcon: Square, typeColor: '#4da6ff', status: 'In Progress', statusColor: 'var(--nards-color-info)', assignee: 'S', assigneeColor: '#059669', x: 40, y: 48 },
  { id: 'n3', title: 'Canvas Renderer', type: 'Task', typeIcon: Square, typeColor: '#4da6ff', status: 'To Do', statusColor: 'var(--nards-color-danger)', x: 62, y: 28 },
  { id: 'n4', title: 'Sarah Chen', type: 'Person', typeIcon: User, typeColor: '#34d399', x: 28, y: 68 },
  { id: 'n5', title: 'API Design Doc', type: 'Artifact', typeIcon: FileText, typeColor: '#fbbf24', status: 'Review', statusColor: 'var(--nards-color-warning)', x: 72, y: 62 },
  { id: 'n6', title: 'MCP Server', type: 'Task', typeIcon: Square, typeColor: '#4da6ff', status: 'Blocked', statusColor: 'var(--nards-color-danger)', x: 52, y: 76 },
];

const TETHERS: TetherData[] = [
  { from: 'n1', to: 'n2', type: 'Blocks', color: '#4da6ff', value: 0.72, label: 'Partial Block' },
  { from: 'n2', to: 'n3', type: 'Blocks', color: '#4da6ff', value: 0.91, label: 'Hard Block' },
  { from: 'n4', to: 'n2', type: 'Assigned', color: '#34d399', value: 0.15, label: 'Primary' },
  { from: 'n3', to: 'n5', type: 'Depends', color: '#fbbf24', value: 0.45, label: 'Moderate', ghost: true },
  { from: 'n5', to: 'n6', type: 'Blocks', color: '#4da6ff', value: 0.88, label: 'Near-Block', ghost: true },
  { from: 'n4', to: 'n6', type: 'Assigned', color: '#34d399', value: 0.32, label: 'Secondary', ghost: true },
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
      <div className="nards-canvas__grid" />

      {/* SVG tether layer */}
      <svg className="nards-canvas__tethers" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <marker id="arrow-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6" fill="var(--nards-color-accent)" opacity="0.7" />
          </marker>
        </defs>
        {TETHERS.map((t, i) => {
          const from = getNardPos(t.from);
          const to = getNardPos(t.to);
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          return (
            <g key={i}>
              <line
                x1={`${from.x}%`} y1={`${from.y}%`}
                x2={`${to.x}%`} y2={`${to.y}%`}
                className={t.ghost ? 'nards-tether--ghost' : 'nards-tether--active'}
                stroke={t.color}
                markerEnd={!t.ghost ? "url(#arrow-active)" : undefined}
              />
              {/* Label pill: shows "Type: Value" for active, nothing for ghost */}
              {!t.ghost && (
                <g>
                  <rect
                    x={`${midX - 3.5}%`} y={`${midY - 1.8}%`}
                    width="7%" height="2.2%"
                    rx="0.6"
                    fill="var(--nards-color-bg-surface)"
                    stroke="var(--nards-color-border-subtle)"
                    strokeWidth="0.08"
                    opacity="0.95"
                  />
                  <text x={`${midX}%`} y={`${midY - 0.2}%`} className="nards-tether__label-text" textAnchor="middle">
                    {t.type}: {t.value.toFixed(2)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Nard nodes */}
      {NARDS.map((nard) => {
        const Icon = nard.typeIcon;
        return (
          <div
            key={nard.id}
            className={`nards-node ${selectedNard === nard.id ? 'is-selected' : ''}`}
            style={{ left: `${nard.x}%`, top: `${nard.y}%` }}
            onClick={() => onNardClick(nard.id)}
          >
            <div className="nards-node__header">
              <span className="nards-node__type-badge" style={{ backgroundColor: nard.typeColor }}>
                <Icon size={10} strokeWidth={2.5} color="white" />
              </span>
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
                  <span className="nards-node__assignee" style={{ backgroundColor: nard.assigneeColor }}>
                    {nard.assignee}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CanvasMock;

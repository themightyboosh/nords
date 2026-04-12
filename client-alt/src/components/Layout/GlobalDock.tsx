import React, { useState } from 'react';
import {
  Eye, Link2, LayoutGrid,
  MessageSquare, Plus, Pencil,
  EyeIcon, EyeOff, ChevronDown, ArrowLeftRight, Ghost, Crosshair,
  Bug, User, FileText, Target, Lightbulb, Layers, AlertTriangle,
  Square, Minus as LineIcon, Settings2, Trash2,
} from 'lucide-react';
import type { LensMode } from '../../App';
import Spectrum from '../Spectrum/Spectrum';
import './GlobalDock.css';

/* ── Type registries ── */
const NORD_TYPES = [
  { name: 'Task', icon: Square, color: '#4da6ff', count: 4, visible: true },
  { name: 'Bug', icon: Bug, color: '#f87171', count: 1, visible: true },
  { name: 'Person', icon: User, color: '#34d399', count: 1, visible: true },
  { name: 'Artifact', icon: FileText, color: '#fbbf24', count: 1, visible: true },
  { name: 'Milestone', icon: Target, color: '#a78bfa', count: 1, visible: true },
  { name: 'Idea', icon: Lightbulb, color: '#fb923c', count: 1, visible: true },
  { name: 'Epic', icon: Layers, color: '#f472b6', count: 1, visible: true },
  { name: 'Risk', icon: AlertTriangle, color: '#ef4444', count: 1, visible: false },
];

const CONNECTION_TYPES = [
  { name: 'Blocks', color: '#4da6ff', count: 5, visible: true },
  { name: 'Depends', color: '#fbbf24', count: 4, visible: true },
  { name: 'Relates', color: '#a78bfa', count: 4, visible: false },
  { name: 'Assigned', color: '#34d399', count: 2, visible: true },
];

interface GlobalDockProps {
  lens: LensMode;
  onLensChange: (lens: LensMode) => void;
  activeLine: string;
  onActiveLineChange: (line: string) => void;
  showContext: boolean;
  onShowContextChange: (show: boolean) => void;
  onOpenManageTypes?: () => void;
}

const GlobalDock: React.FC<GlobalDockProps> = ({
  lens, onLensChange,
  activeLine, onActiveLineChange,
  showContext, onShowContextChange,
  onOpenManageTypes,
}) => {
  const [openPanel, setOpenPanel] = useState<string | null>(null);

  const togglePanel = (panel: string) => {
    setOpenPanel(openPanel === panel ? null : panel);
  };

  const activeConnectionType = CONNECTION_TYPES.find(l => l.name === activeLine);

  return (
    <>
      {openPanel && <div className="nords-flyout-scrim" onClick={() => setOpenPanel(null)} />}

      <div className="nords-dock-wrapper">
        <nav className="nords-global-dock nords-glass">

          {/* ═══ Lens Toggle ═══ */}
          <div className="nords-lens-toggle">
            <button
              className={`nords-lens-toggle__btn ${lens === 'canvas' ? 'is-active' : ''}`}
              onClick={() => onLensChange('canvas')}
              title="Canvas — spatial graph view"
            >
              <Eye size={14} strokeWidth={1.6} />
              <span>Canvas</span>
            </button>
            <button
              className={`nords-lens-toggle__btn ${lens === 'link' ? 'is-active' : ''}`}
              onClick={() => onLensChange('link')}
              title="Link — focused relationship editing"
            >
              <Link2 size={14} strokeWidth={1.6} />
              <span>Link</span>
            </button>
            <button
              className={`nords-lens-toggle__btn ${lens === 'matrix' ? 'is-active' : ''}`}
              onClick={() => onLensChange('matrix')}
              title="Matrix — spatial pivot table"
            >
              <LayoutGrid size={14} strokeWidth={1.6} />
              <span>Matrix</span>
            </button>
          </div>

          <div className="nords-dock__separator" />

          {/* ═══ CANVAS TOOLS ═══ */}
          {lens === 'canvas' && (
            <>
              <div className="nords-dock__section">
                <button
                  className={`nords-dock__item ${openPanel === 'display' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('display')}
                >
                  <Eye size={15} strokeWidth={1.6} />
                  <span className="nords-dock__label">Display</span>
                  <ChevronDown size={10} className="nords-dock__chevron" />
                </button>
              </div>

              <div className="nords-dock__separator" />

              <div className="nords-dock__section">
                <button className="nords-dock__item" title="View all comments">
                  <MessageSquare size={15} strokeWidth={1.6} />
                  <span className="nords-dock__label">Comments</span>
                </button>
              </div>

              <div className="nords-dock__separator" />

              <div className="nords-dock__section">
                <button
                  className={`nords-dock__item nords-dock__item--accent ${openPanel === 'add' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('add')}
                >
                  <Plus size={15} strokeWidth={2} />
                  <span className="nords-dock__label">Add</span>
                  <ChevronDown size={10} className="nords-dock__chevron" />
                </button>
              </div>
            </>
          )}

          {/* ═══ LINK TOOLS ═══ */}
          {lens === 'link' && (
            <>
              <div className="nords-dock__section">
                <button
                  className={`nords-dock__item nords-dock__item--relationship ${openPanel === 'relationship' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('relationship')}
                >
                  <ArrowLeftRight size={15} strokeWidth={1.6} />
                  <span className="nords-dock__label">{activeLine}</span>
                  {activeConnectionType && (
                    <span className="nords-dock__rel-swatch" style={{ backgroundColor: activeConnectionType.color }} />
                  )}
                  <ChevronDown size={10} className="nords-dock__chevron" />
                </button>
              </div>

              <div className="nords-dock__separator" />

              <div className="nords-dock__section">
                <button
                  className={`nords-dock__item ${showContext ? 'is-active' : ''}`}
                  onClick={() => onShowContextChange(!showContext)}
                  title={showContext ? 'Context ON — showing unconnected nords at 20%' : 'Context OFF — hiding unconnected nords'}
                >
                  <Ghost size={15} strokeWidth={1.6} />
                  <span className="nords-dock__label">Context</span>
                </button>
              </div>

              <div className="nords-dock__separator" />

              <div className="nords-dock__section">
                <button className="nords-dock__item nords-dock__item--accent" title="Click source nard, then target nord to connect">
                  <Crosshair size={15} strokeWidth={1.6} />
                  <span className="nords-dock__label">Connect</span>
                </button>
              </div>

              <div className="nords-dock__separator" />

              <div className="nords-dock__section">
                <button className="nords-dock__item" title="View all comments">
                  <MessageSquare size={15} strokeWidth={1.6} />
                  <span className="nords-dock__label">Comments</span>
                </button>
              </div>
            </>
          )}

          {/* ═══ MATRIX TOOLS ═══ */}
          {lens === 'matrix' && (
            <>
              <div className="nords-dock__section">
                <button
                  className={`nords-dock__item ${openPanel === 'matrixCols' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('matrixCols')}
                >
                  <span className="nords-dock__label-prefix">Columns:</span>
                  <span className="nords-dock__label nords-dock__label--value">{activeLine}</span>
                  {activeConnectionType && (
                    <span className="nords-dock__rel-swatch" style={{ backgroundColor: activeConnectionType.color }} />
                  )}
                  <ChevronDown size={10} className="nords-dock__chevron" />
                </button>
              </div>

              <div className="nords-dock__separator" />

              <div className="nords-dock__section">
                <button className="nords-dock__item" disabled title="Optional — select a Line Type for rows">
                  <span className="nords-dock__label-prefix">Rows:</span>
                  <span className="nords-dock__label nords-dock__label--empty">None</span>
                </button>
              </div>

              <div className="nords-dock__separator" />

              <div className="nords-dock__section">
                <button className="nords-dock__item" title="View all comments">
                  <MessageSquare size={15} strokeWidth={1.6} />
                  <span className="nords-dock__label">Comments</span>
                </button>
              </div>

              <div className="nords-dock__separator" />

              <div className="nords-dock__section">
                <button
                  className={`nords-dock__item nords-dock__item--accent ${openPanel === 'add' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('add')}
                >
                  <Plus size={15} strokeWidth={2} />
                  <span className="nords-dock__label">Add</span>
                  <ChevronDown size={10} className="nords-dock__chevron" />
                </button>
              </div>
            </>
          )}

        </nav>

        {/* ═══════════ FLYOUT PANELS ═══════════ */}

        {/* Display — unified visibility for Nords + Lines */}
        <div className={`nords-flyout nords-glass ${openPanel === 'display' ? 'is-open' : ''}`}>
          <div className="nords-flyout__header">
            <h3 className="nords-flyout__title">Display</h3>
            <span className="nords-flyout__count">
              {NORD_TYPES.reduce((a, b) => a + b.count, 0)} nords · {CONNECTION_TYPES.reduce((a, b) => a + b.count, 0)} connections
            </span>
          </div>
          <div className="nords-flyout__list">
            <div className="nords-flyout__section-label">Nord Types</div>
            {NORD_TYPES.map((type) => (
              <div key={type.name} className="nords-flyout__row" draggable title={`Drag to create ${type.name}`}>
                <div className="nords-flyout__row-left">
                  <span className="nords-flyout__type-icon" style={{ color: type.color }}>
                    <type.icon size={14} strokeWidth={2} />
                  </span>
                  <span className="nords-flyout__row-name">{type.name}</span>
                  <span className="nords-flyout__row-count">{type.count}</span>
                </div>
                <button className={`nords-flyout__visibility-btn ${type.visible ? 'is-visible' : ''}`} title="Toggle visibility">
                  {type.visible ? <EyeIcon size={13} strokeWidth={1.6} /> : <EyeOff size={13} strokeWidth={1.6} />}
                </button>
              </div>
            ))}
            <div className="nords-flyout__section-divider" />
            <div className="nords-flyout__section-label">Connection Types</div>
            {CONNECTION_TYPES.map((type) => (
              <div key={type.name} className="nords-flyout__row">
                <div className="nords-flyout__row-left">
                  <span className="nords-flyout__line-swatch" style={{ background: type.color }} />
                  <span className="nords-flyout__row-name">{type.name}</span>
                  <span className="nords-flyout__row-count">{type.count}</span>
                </div>
                <button className={`nords-flyout__visibility-btn ${type.visible ? 'is-visible' : ''}`} title="Toggle visibility">
                  {type.visible ? <EyeIcon size={13} strokeWidth={1.6} /> : <EyeOff size={13} strokeWidth={1.6} />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Relationship Selector (Link mode) */}
        <div className={`nords-flyout nords-glass ${openPanel === 'relationship' ? 'is-open' : ''}`}>
          <div className="nords-flyout__header">
            <h3 className="nords-flyout__title">Active Relationship</h3>
          </div>
          <div className="nords-flyout__list">
            {CONNECTION_TYPES.map((type) => (
              <div
                key={type.name}
                className={`nords-flyout__row nords-flyout__row--selectable ${activeLine === type.name ? 'is-active' : ''}`}
                onClick={() => { onActiveLineChange(type.name); setOpenPanel(null); }}
              >
                <div className="nords-flyout__row-left">
                  <span className="nords-flyout__line-swatch" style={{ background: type.color }} />
                  <span className="nords-flyout__row-name">{type.name}</span>
                </div>
                {activeLine === type.name && (
                  <div className="nords-flyout__row-spectrum">
                    <Spectrum value={0.65} color={type.color} width={52} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="nords-flyout__footer">
            <span className="nords-flyout__footer-hint">
              <ArrowLeftRight size={10} />
              Spatial distance = {activeLine.toLowerCase()} strength
            </span>
          </div>
        </div>

        {/* Matrix Column Selector */}
        <div className={`nords-flyout nords-glass ${openPanel === 'matrixCols' ? 'is-open' : ''}`}>
          <div className="nords-flyout__header">
            <h3 className="nords-flyout__title">Column Axis</h3>
          </div>
          <div className="nords-flyout__list">
            {CONNECTION_TYPES.map((type) => (
              <div
                key={type.name}
                className={`nords-flyout__row nords-flyout__row--selectable ${activeLine === type.name ? 'is-active' : ''}`}
                onClick={() => { onActiveLineChange(type.name); setOpenPanel(null); }}
              >
                <div className="nords-flyout__row-left">
                  <span className="nords-flyout__line-swatch" style={{ background: type.color }} />
                  <span className="nords-flyout__row-name">{type.name}</span>
                  <span className="nords-flyout__row-count">{type.count}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="nords-flyout__footer">
            <span className="nords-flyout__footer-hint">
              Stepper labels → column headers
            </span>
          </div>
        </div>

        {/* Add — create instances + manage types */}
        <div className={`nords-flyout nords-glass ${openPanel === 'add' ? 'is-open' : ''}`}>
          <div className="nords-flyout__header">
            <h3 className="nords-flyout__title">Add</h3>
          </div>
          <div className="nords-flyout__list">
            <div className="nords-flyout__create-section">
              <h4 className="nords-flyout__create-label">Add Nard</h4>
              <div className="nords-flyout__create-grid">
                {NORD_TYPES.map((type) => (
                  <button key={type.name} className="nords-flyout__create-btn" title={`Add a ${type.name}`}>
                    <type.icon size={16} strokeWidth={1.8} color={type.color} />
                    <span>{type.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="nords-flyout__create-divider" />
            <div className="nords-flyout__create-section">
              <h4 className="nords-flyout__create-label">Add Connection</h4>
              <div className="nords-flyout__create-grid">
                {CONNECTION_TYPES.map((type) => (
                  <button key={type.name} className="nords-flyout__create-btn" title={`Add a ${type.name} connection`}>
                    <span className="nords-flyout__line-swatch--lg" style={{ background: type.color }} />
                    <span>{type.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="nords-flyout__create-divider" />
            <div className="nords-flyout__create-section">
              <h4 className="nords-flyout__create-label">Manage Types</h4>
              <div className="nords-flyout__manage-actions">
                <button className="nords-flyout__manage-btn" title="Add/remove properties, create new types" onClick={() => { onOpenManageTypes?.(); setOpenPanel(null); }}>
                  <Settings2 size={14} strokeWidth={1.6} />
                  <span>Manage Types</span>
                </button>
              </div>
              <p className="nords-flyout__manage-hint">
                Add properties to types, create new types, or remove unused ones. Changes apply to all nords/connections of that type.
              </p>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default GlobalDock;

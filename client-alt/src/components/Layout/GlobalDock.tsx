import React, { useState } from 'react';
import {
  Eye, Link2, LayoutGrid,
  Square, Minus as LineIcon, StickyNote, Plus,
  EyeIcon, EyeOff, ChevronDown, ArrowLeftRight, Ghost, Crosshair,
  Bug, User, FileText, Target, Lightbulb, Layers, AlertTriangle,
} from 'lucide-react';
import type { LensMode } from '../../App';
import Spectrum from '../Spectrum/Spectrum';
import './GlobalDock.css';

/* ── Type registries ── */
const NARD_TYPES = [
  { name: 'Task', icon: Square, color: '#4da6ff', count: 4, visible: true },
  { name: 'Bug', icon: Bug, color: '#f87171', count: 1, visible: true },
  { name: 'Person', icon: User, color: '#34d399', count: 1, visible: true },
  { name: 'Artifact', icon: FileText, color: '#fbbf24', count: 1, visible: true },
  { name: 'Milestone', icon: Target, color: '#a78bfa', count: 1, visible: true },
  { name: 'Idea', icon: Lightbulb, color: '#fb923c', count: 1, visible: true },
  { name: 'Epic', icon: Layers, color: '#f472b6', count: 1, visible: true },
  { name: 'Risk', icon: AlertTriangle, color: '#ef4444', count: 1, visible: false },
];

const LINE_TYPES = [
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
}

const GlobalDock: React.FC<GlobalDockProps> = ({
  lens, onLensChange,
  activeLine, onActiveLineChange,
  showContext, onShowContextChange,
}) => {
  const [openPanel, setOpenPanel] = useState<string | null>(null);

  const togglePanel = (panel: string) => {
    setOpenPanel(openPanel === panel ? null : panel);
  };

  const activeLineType = LINE_TYPES.find(l => l.name === activeLine);

  return (
    <>
      {openPanel && <div className="nards-flyout-scrim" onClick={() => setOpenPanel(null)} />}

      <div className="nards-dock-wrapper">
        <nav className="nards-global-dock nards-glass">

          {/* ═══ Lens Toggle ═══ */}
          <div className="nards-lens-toggle">
            <button
              className={`nards-lens-toggle__btn ${lens === 'canvas' ? 'is-active' : ''}`}
              onClick={() => onLensChange('canvas')}
              title="Canvas — spatial graph view"
            >
              <Eye size={14} strokeWidth={1.6} />
              <span>Canvas</span>
            </button>
            <button
              className={`nards-lens-toggle__btn ${lens === 'link' ? 'is-active' : ''}`}
              onClick={() => onLensChange('link')}
              title="Link — focused relationship editing"
            >
              <Link2 size={14} strokeWidth={1.6} />
              <span>Link</span>
            </button>
            <button
              className={`nards-lens-toggle__btn ${lens === 'matrix' ? 'is-active' : ''}`}
              onClick={() => onLensChange('matrix')}
              title="Matrix — spatial pivot table"
            >
              <LayoutGrid size={14} strokeWidth={1.6} />
              <span>Matrix</span>
            </button>
          </div>

          <div className="nards-dock__separator" />

          {/* ═══ CANVAS TOOLS ═══ */}
          {lens === 'canvas' && (
            <>
              <div className="nards-dock__section">
                <button
                  className={`nards-dock__item ${openPanel === 'nards' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('nards')}
                >
                  <Square size={15} strokeWidth={1.6} />
                  <span className="nards-dock__label">Nards</span>
                  <ChevronDown size={10} className="nards-dock__chevron" />
                </button>
              </div>

              <div className="nards-dock__separator" />

              <div className="nards-dock__section">
                <button
                  className={`nards-dock__item ${openPanel === 'lines' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('lines')}
                >
                  <LineIcon size={15} strokeWidth={1.6} />
                  <span className="nards-dock__label">Lines</span>
                  <ChevronDown size={10} className="nards-dock__chevron" />
                </button>
              </div>

              <div className="nards-dock__separator" />

              <div className="nards-dock__section">
                <button className="nards-dock__item nards-dock__item--drag" draggable title="Drag to add a sticky">
                  <StickyNote size={15} strokeWidth={1.6} />
                  <span className="nards-dock__label">Sticky</span>
                </button>
              </div>

              <div className="nards-dock__separator" />

              <div className="nards-dock__section">
                <button
                  className={`nards-dock__item nards-dock__item--accent ${openPanel === 'new' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('new')}
                >
                  <Plus size={15} strokeWidth={2} />
                  <span className="nards-dock__label">New</span>
                  <ChevronDown size={10} className="nards-dock__chevron" />
                </button>
              </div>
            </>
          )}

          {/* ═══ LINK TOOLS ═══ */}
          {lens === 'link' && (
            <>
              <div className="nards-dock__section">
                <button
                  className={`nards-dock__item nards-dock__item--relationship ${openPanel === 'relationship' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('relationship')}
                >
                  <ArrowLeftRight size={15} strokeWidth={1.6} />
                  <span className="nards-dock__label">{activeLine}</span>
                  {activeLineType && (
                    <span className="nards-dock__rel-swatch" style={{ backgroundColor: activeLineType.color }} />
                  )}
                  <ChevronDown size={10} className="nards-dock__chevron" />
                </button>
              </div>

              <div className="nards-dock__separator" />

              <div className="nards-dock__section">
                <button
                  className={`nards-dock__item ${showContext ? 'is-active' : ''}`}
                  onClick={() => onShowContextChange(!showContext)}
                  title={showContext ? 'Context ON — showing unconnected nards at 20%' : 'Context OFF — hiding unconnected nards'}
                >
                  <Ghost size={15} strokeWidth={1.6} />
                  <span className="nards-dock__label">Context</span>
                </button>
              </div>

              <div className="nards-dock__separator" />

              <div className="nards-dock__section">
                <button className="nards-dock__item nards-dock__item--accent" title="Click source nard, then target nard to connect">
                  <Crosshair size={15} strokeWidth={1.6} />
                  <span className="nards-dock__label">Add Line</span>
                </button>
              </div>

              <div className="nards-dock__separator" />

              <div className="nards-dock__section">
                <button className="nards-dock__item nards-dock__item--drag" draggable title="Drag to add a sticky">
                  <StickyNote size={15} strokeWidth={1.6} />
                  <span className="nards-dock__label">Sticky</span>
                </button>
              </div>
            </>
          )}

          {/* ═══ MATRIX TOOLS ═══ */}
          {lens === 'matrix' && (
            <>
              <div className="nards-dock__section">
                <button
                  className={`nards-dock__item ${openPanel === 'matrixCols' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('matrixCols')}
                >
                  <span className="nards-dock__label-prefix">Columns:</span>
                  <span className="nards-dock__label nards-dock__label--value">{activeLine}</span>
                  {activeLineType && (
                    <span className="nards-dock__rel-swatch" style={{ backgroundColor: activeLineType.color }} />
                  )}
                  <ChevronDown size={10} className="nards-dock__chevron" />
                </button>
              </div>

              <div className="nards-dock__separator" />

              <div className="nards-dock__section">
                <button className="nards-dock__item" disabled title="Optional — drag a Line Type here for rows">
                  <span className="nards-dock__label-prefix">Rows:</span>
                  <span className="nards-dock__label nards-dock__label--empty">None</span>
                </button>
              </div>

              <div className="nards-dock__separator" />

              <div className="nards-dock__section">
                <button className="nards-dock__item nards-dock__item--drag" draggable title="Drag to add a sticky">
                  <StickyNote size={15} strokeWidth={1.6} />
                  <span className="nards-dock__label">Sticky</span>
                </button>
              </div>

              <div className="nards-dock__separator" />

              <div className="nards-dock__section">
                <button
                  className={`nards-dock__item nards-dock__item--accent ${openPanel === 'new' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('new')}
                >
                  <Plus size={15} strokeWidth={2} />
                  <span className="nards-dock__label">New</span>
                  <ChevronDown size={10} className="nards-dock__chevron" />
                </button>
              </div>
            </>
          )}

        </nav>

        {/* ═══════════ FLYOUT PANELS ═══════════ */}

        {/* Nard Types */}
        <div className={`nards-flyout nards-glass ${openPanel === 'nards' ? 'is-open' : ''}`}>
          <div className="nards-flyout__header">
            <h3 className="nards-flyout__title">Nard Types</h3>
            <span className="nards-flyout__count">{NARD_TYPES.reduce((a, b) => a + b.count, 0)} total</span>
          </div>
          <div className="nards-flyout__list">
            {NARD_TYPES.map((type) => (
              <div key={type.name} className="nards-flyout__row" draggable title={`Drag to create ${type.name}`}>
                <div className="nards-flyout__row-left">
                  <span className="nards-flyout__type-icon" style={{ color: type.color }}>
                    <type.icon size={14} strokeWidth={2} />
                  </span>
                  <span className="nards-flyout__row-name">{type.name}</span>
                  <span className="nards-flyout__row-count">{type.count}</span>
                </div>
                <button className={`nards-flyout__visibility-btn ${type.visible ? 'is-visible' : ''}`} title="Toggle visibility">
                  {type.visible ? <EyeIcon size={13} strokeWidth={1.6} /> : <EyeOff size={13} strokeWidth={1.6} />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Line Types */}
        <div className={`nards-flyout nards-glass ${openPanel === 'lines' ? 'is-open' : ''}`}>
          <div className="nards-flyout__header">
            <h3 className="nards-flyout__title">Line Types</h3>
            <span className="nards-flyout__count">{LINE_TYPES.reduce((a, b) => a + b.count, 0)} connections</span>
          </div>
          <div className="nards-flyout__list">
            {LINE_TYPES.map((type) => (
              <div key={type.name} className="nards-flyout__row">
                <div className="nards-flyout__row-left">
                  <span className="nards-flyout__line-swatch" style={{ background: type.color }} />
                  <span className="nards-flyout__row-name">{type.name}</span>
                  <span className="nards-flyout__row-count">{type.count}</span>
                </div>
                <button className={`nards-flyout__visibility-btn ${type.visible ? 'is-visible' : ''}`} title="Toggle visibility">
                  {type.visible ? <EyeIcon size={13} strokeWidth={1.6} /> : <EyeOff size={13} strokeWidth={1.6} />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Relationship Selector (Link mode) */}
        <div className={`nards-flyout nards-glass ${openPanel === 'relationship' ? 'is-open' : ''}`}>
          <div className="nards-flyout__header">
            <h3 className="nards-flyout__title">Active Relationship</h3>
          </div>
          <div className="nards-flyout__list">
            {LINE_TYPES.map((type) => (
              <div
                key={type.name}
                className={`nards-flyout__row nards-flyout__row--selectable ${activeLine === type.name ? 'is-active' : ''}`}
                onClick={() => { onActiveLineChange(type.name); setOpenPanel(null); }}
              >
                <div className="nards-flyout__row-left">
                  <span className="nards-flyout__line-swatch" style={{ background: type.color }} />
                  <span className="nards-flyout__row-name">{type.name}</span>
                </div>
                {activeLine === type.name && (
                  <div className="nards-flyout__row-spectrum">
                    <Spectrum value={0.65} color={type.color} width={52} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="nards-flyout__footer">
            <span className="nards-flyout__footer-hint">
              <ArrowLeftRight size={10} />
              Spatial distance = {activeLine.toLowerCase()} strength
            </span>
          </div>
        </div>

        {/* Matrix Column Selector */}
        <div className={`nards-flyout nards-glass ${openPanel === 'matrixCols' ? 'is-open' : ''}`}>
          <div className="nards-flyout__header">
            <h3 className="nards-flyout__title">Column Axis</h3>
          </div>
          <div className="nards-flyout__list">
            {LINE_TYPES.map((type) => (
              <div
                key={type.name}
                className={`nards-flyout__row nards-flyout__row--selectable ${activeLine === type.name ? 'is-active' : ''}`}
                onClick={() => { onActiveLineChange(type.name); setOpenPanel(null); }}
              >
                <div className="nards-flyout__row-left">
                  <span className="nards-flyout__line-swatch" style={{ background: type.color }} />
                  <span className="nards-flyout__row-name">{type.name}</span>
                  <span className="nards-flyout__row-count">{type.count}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="nards-flyout__footer">
            <span className="nards-flyout__footer-hint">
              Stepper labels → column headers
            </span>
          </div>
        </div>

        {/* New — create Nard or Line */}
        <div className={`nards-flyout nards-glass ${openPanel === 'new' ? 'is-open' : ''}`}>
          <div className="nards-flyout__header">
            <h3 className="nards-flyout__title">Create New</h3>
          </div>
          <div className="nards-flyout__list">
            <div className="nards-flyout__create-section">
              <h4 className="nards-flyout__create-label">Nard</h4>
              <div className="nards-flyout__create-grid">
                {NARD_TYPES.map((type) => (
                  <button key={type.name} className="nards-flyout__create-btn" title={`Create ${type.name}`}>
                    <type.icon size={18} strokeWidth={1.8} color={type.color} />
                    <span>{type.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="nards-flyout__create-divider" />
            <div className="nards-flyout__create-section">
              <h4 className="nards-flyout__create-label">Line</h4>
              <div className="nards-flyout__create-grid">
                {LINE_TYPES.map((type) => (
                  <button key={type.name} className="nards-flyout__create-btn" title={`Create ${type.name} line`}>
                    <span className="nards-flyout__line-swatch--lg" style={{ background: type.color }} />
                    <span>{type.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="nards-flyout__footer">
            <span className="nards-flyout__footer-hint">
              Select type, then configure properties
            </span>
          </div>
        </div>

      </div>
    </>
  );
};

export default GlobalDock;

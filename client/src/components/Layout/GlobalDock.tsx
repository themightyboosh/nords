/**
 * GlobalDock.tsx — Floating Bottom Navigation Bar
 *
 * The Global Dock is the primary navigation and tool-switching control.
 * Production version: consumes LensContext instead of props.
 *
 * Structure:
 *   ┌───────────────────────────────────────────────────────┐
 *   │ [Canvas] [Link] [Matrix]  │  {Contextual Tools}      │
 *   └───────────────────────────────────────────────────────┘
 */

import { useState } from 'react';
import {
  Eye, Link2, LayoutGrid,
  MessageSquare, Plus, Camera,
  EyeIcon, EyeOff, ChevronDown, ArrowLeftRight,
  Bug, User, FileText, Target, Lightbulb, Layers, AlertTriangle,
  Square, Settings2,
} from 'lucide-react';
import { useLens } from '../../context/LensContext';
import { useReactFlow } from '@xyflow/react';
import { useTypeVisibility } from '../../hooks/useTypeVisibility';
import './GlobalDock.css';

interface GlobalDockProps {
  onOpenManageTypes?: () => void;
  onCreateNord?: (typeId: string, position?: { x: number; y: number }) => void;
}

export default function GlobalDock({ onOpenManageTypes, onCreateNord }: GlobalDockProps) {
  const { lens, setLens, activeConnectionTypeId, setActiveConnectionTypeId, activeLine, setActiveLine } = useLens();
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [snapshotTab, setSnapshotTab] = useState<'take' | 'history'>('take');

  const { visibleNodeTypes, visibleConnectionTypes, toggleNodeType } = useTypeVisibility();

  // React Flow for adding nodes
  const { addNodes, screenToFlowPosition } = useReactFlow();

  const handleAddNord = (typeInfo: any) => {
    // Enter click-to-place mode — no position means the canvas
    // shows a crosshair and waits for the user to click to place
    if (onCreateNord && typeInfo.id) {
      onCreateNord(typeInfo.id);
      setOpenPanel(null);
      return;
    }

    // Fallback: add node locally (for when API is not wired)
    const fallbackPos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const newNode = {
      id: crypto.randomUUID(),
      position: fallbackPos,
      type: 'nordNode',
      data: {
        title: `New ${typeInfo.name}`,
        type: typeInfo.name,
        typeColor: typeInfo.color,
        typeIcon: typeInfo.icon,
        size: 0.5,
        hasScale: true,
        properties: [],
      }
    };
    addNodes(newNode);
    setOpenPanel(null);
  };

  const handleSelectConnectionType = (typeId: string, typeName: string) => {
    setActiveConnectionTypeId(typeId);
    setActiveLine(typeName);
    setOpenPanel(null);
  };

  const togglePanel = (panel: string) => {
    setOpenPanel(openPanel === panel ? null : panel);
  };

  // Find active connection type by ID (preferred) or legacy name
  const activeConnectionType = visibleConnectionTypes.find(l => l.id === activeConnectionTypeId)
    || visibleConnectionTypes.find(l => l.name === activeLine);

  return (
    <>
      {openPanel && <div className="nords-flyout-scrim" onClick={() => setOpenPanel(null)} />}

      <div className="nords-dock-wrapper">
        <nav className="nords-global-dock nords-glass" data-testid="global-dock" data-active-lens={lens}>

          {/* ═══ Lens Toggle ═══ */}
          <div className="nords-lens-toggle">
            <button
              className={`nords-lens-toggle__btn ${lens === 'canvas' ? 'is-active' : ''}`}
              onClick={() => { setLens('canvas'); setOpenPanel(null); }}
              title="Canvas — spatial graph view"
              data-testid="lens-canvas"
            >
              <Eye size={14} strokeWidth={1.6} />
              <span>Canvas</span>
            </button>
            <button
              className={`nords-lens-toggle__btn ${lens === 'matrix' ? 'is-active' : ''}`}
              onClick={() => {
                setLens('matrix');
                setOpenPanel(null);
                if (!activeConnectionTypeId && visibleConnectionTypes.length > 0) {
                  setActiveConnectionTypeId(visibleConnectionTypes[0].id);
                  setActiveLine(visibleConnectionTypes[0].name);
                }
              }}
              title="Matrix — spatial pivot table"
              data-testid="lens-matrix"
            >
              <LayoutGrid size={14} strokeWidth={1.6} />
              <span>Matrix</span>
            </button>
          </div>

          <div className="nords-dock__separator" />

          {/* ═══ SHARED TOOLS (all lens modes) ═══ */}

          {/* + Nord */}
          <div className="nords-dock__section">
            <button className={`nords-dock__item ${openPanel === 'add' ? 'is-active' : ''}`} onClick={() => togglePanel('add')} data-testid="dock-add">
              <Plus size={15} strokeWidth={2} />
              <span className="nords-dock__label">Nord</span>
              <ChevronDown size={10} className="nords-dock__chevron" />
            </button>
          </div>

          <div className="nords-dock__separator" />

          {/* Connection Type Switcher — single dropdown, scales to unlimited types */}
          <div className="nords-dock__section">
            <button
              className={`nords-dock__item ${openPanel === 'relationship' ? 'is-active' : ''}`}
              onClick={() => togglePanel('relationship')}
              data-testid="dock-connection-type"
            >
              {activeConnectionType ? (
                <>
                  <span className="nords-dock__rel-swatch" style={{ backgroundColor: activeConnectionType.color }} />
                  <span className="nords-dock__label">{activeConnectionType.name}</span>
                </>
              ) : (
                <>
                  <Link2 size={14} strokeWidth={1.6} />
                  <span className="nords-dock__label">All Lines (Relevance)</span>
                </>
              )}
              <ChevronDown size={10} className="nords-dock__chevron" />
            </button>
          </div>

          <div className="nords-dock__separator" />

          {/* Display */}
          <div className="nords-dock__section">
            <button className={`nords-dock__item ${openPanel === 'display' ? 'is-active' : ''}`} onClick={() => togglePanel('display')} data-testid="dock-display">
              <Eye size={15} strokeWidth={1.6} />
              <span className="nords-dock__label">Display</span>
              <ChevronDown size={10} className="nords-dock__chevron" />
            </button>
          </div>

        </nav>

        {/* ═══ FLYOUT PANELS ═══ */}

        {/* Display Flyout */}
        <div className={`nords-flyout nords-glass ${openPanel === 'display' ? 'is-open' : ''}`} data-testid="flyout-display">
          <div className="nords-flyout__header">
            <h3 className="nords-flyout__title">Display</h3>
            <span className="nords-flyout__count">
              {visibleNodeTypes.reduce((a, b) => a + b.count, 0)} nords · {visibleConnectionTypes.reduce((a, b) => a + b.count, 0)} connections
            </span>
          </div>
          <div className="nords-flyout__list">
            <div className="nords-flyout__section-label">Nord Types</div>
            {visibleNodeTypes.map((type) => (
              <div key={type.name} className="nords-flyout__row">
                <div className="nords-flyout__row-left">
                  <span className="nords-flyout__type-icon" style={{ color: type.color }}>
                    <type.icon size={14} strokeWidth={2} />
                  </span>
                  <span className="nords-flyout__row-name">{type.name}</span>
                  <span className="nords-flyout__row-count">{type.count}</span>
                </div>
                <button 
                  className={`nords-flyout__visibility-btn ${type.visible ? 'is-visible' : ''}`} 
                  title="Toggle visibility"
                  onClick={() => toggleNodeType(type.name)}
                >
                  {type.visible ? <EyeIcon size={13} strokeWidth={1.6} /> : <EyeOff size={13} strokeWidth={1.6} />}
                </button>
              </div>
            ))}
            <div className="nords-flyout__section-divider" />
            <div className="nords-flyout__section-label">Connection Types</div>
            {visibleConnectionTypes.map((type) => (
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

        {/* Connection Type Switcher Flyout */}
        <div className={`nords-flyout nords-glass ${openPanel === 'relationship' ? 'is-open' : ''}`} data-testid="flyout-connection-type">
          <div className="nords-flyout__header">
            <h3 className="nords-flyout__title">Connection Type</h3>
            <span className="nords-flyout__count">
              {visibleConnectionTypes.filter(t => !t.isSystem).length} types
            </span>
          </div>
          <div className="nords-flyout__list">
            {/* All Lines (Relevance) — the native baseline */}
            <div
              className={`nords-flyout__row nords-flyout__row--selectable ${!activeConnectionTypeId ? 'is-active' : ''}`}
              onClick={() => { setActiveConnectionTypeId(null); setActiveLine('All'); setOpenPanel(null); }}
            >
              <div className="nords-flyout__row-left">
                <Link2 size={14} strokeWidth={1.6} style={{ color: 'var(--nords-color-text-tertiary)', flexShrink: 0 }} />
                <span className="nords-flyout__row-name">All Lines (Relevance)</span>
              </div>
            </div>
            {visibleConnectionTypes.filter(t => !t.isSystem).map((type) => (
              <div
                key={type.id}
                className={`nords-flyout__row nords-flyout__row--selectable ${activeConnectionTypeId === type.id ? 'is-active' : ''}`}
                onClick={() => handleSelectConnectionType(type.id, type.name)}
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
              <ArrowLeftRight size={10} />
              Selecting a type focuses the canvas on that relationship
            </span>
          </div>
        </div>

        {/* Add Nord Flyout */}
        <div className={`nords-flyout nords-glass ${openPanel === 'add' ? 'is-open' : ''}`} data-testid="flyout-add">
          <div className="nords-flyout__header">
            <h3 className="nords-flyout__title">Add Nord</h3>
          </div>
          <div className="nords-flyout__list">
            <div className="nords-flyout__create-grid">
              {visibleNodeTypes.map((type) => (
                <button 
                  key={type.name} 
                  className="nords-flyout__create-btn" 
                  title={`Add a ${type.name}`}
                  onClick={() => handleAddNord(type)}
                >
                  <type.icon size={16} strokeWidth={1.8} color={type.color} />
                  <span>{type.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Snapshot Flyout */}
        <div className={`nords-flyout nords-glass ${openPanel === 'snapshot' ? 'is-open' : ''}`} data-testid="flyout-snapshot">
          <div className="nords-flyout__header">
            <div className="nords-flyout__tabs">
              <button className={`nords-flyout__tab ${snapshotTab === 'take' ? 'is-active' : ''}`} onClick={() => setSnapshotTab('take')}>Take Snapshot</button>
              <button className={`nords-flyout__tab ${snapshotTab === 'history' ? 'is-active' : ''}`} onClick={() => setSnapshotTab('history')}>History</button>
            </div>
          </div>
          {snapshotTab === 'take' && (
            <>
              <div className="nords-flyout__list">
                <div className="nords-flyout__create-section">
                  <h4 className="nords-flyout__create-label">Snapshot Name</h4>
                  <input className="nords-flyout__snapshot-input" placeholder="e.g. Sprint 4 Kickoff" />
                </div>
                <div className="nords-flyout__create-section">
                  <h4 className="nords-flyout__create-label">Description (optional)</h4>
                  <textarea className="nords-flyout__snapshot-textarea" placeholder="Markdown supported..." rows={3} />
                </div>
                <div className="nords-flyout__create-section">
                  <button className="nords-flyout__snapshot-save">
                    <Camera size={13} strokeWidth={2} />
                    Save Snapshot
                  </button>
                </div>
              </div>
              <div className="nords-flyout__footer">
                <span className="nords-flyout__footer-hint">Captures exact positions, values, and metadata at this moment</span>
              </div>
            </>
          )}
          {snapshotTab === 'history' && (
            <div className="nords-flyout__list">
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--nords-color-text-disabled)', fontSize: 'var(--nords-font-size-sm)' }}>
                No snapshots yet. Take your first one above.
              </div>
            </div>
          )}
        </div>

        {/* Comments Flyout — deferred to Epic 12 */}
        <div className={`nords-flyout nords-glass ${openPanel === 'comments' ? 'is-open' : ''}`} data-testid="flyout-comments">
          <div className="nords-flyout__header">
            <h3 className="nords-flyout__title">Comments</h3>
            <span className="nords-flyout__count">0 threads</span>
          </div>
          <div className="nords-flyout__list">
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--nords-color-text-disabled)', fontSize: 'var(--nords-font-size-sm)' }}>
              <MessageSquare size={24} strokeWidth={1} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <p>No comments yet.</p>
              <p style={{ fontSize: 'var(--nords-font-size-xs)', marginTop: '4px' }}>Click a Nord to start a discussion.</p>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

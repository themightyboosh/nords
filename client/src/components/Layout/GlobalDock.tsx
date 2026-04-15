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
  EyeIcon, EyeOff, ChevronDown, ArrowLeftRight, Unlink, Filter,
  Bug, User, FileText, Target, Lightbulb, Layers, AlertTriangle,
  Square, Settings2,
} from 'lucide-react';
import { useLens } from '../../context/LensContext';
import { useReactFlow } from '@xyflow/react';
import { useTypeVisibility } from '../../hooks/useTypeVisibility';
import { useTypeRegistryContext } from '../../context/TypeRegistryContext';
import { useBoardSettings } from '../../hooks/useBoardSettings';
import { useConnectionTypeMutations } from '../../hooks/useNordMutations';
import './GlobalDock.css';

interface GlobalDockProps {
  projectId?: string;
  onOpenManageTypes?: () => void;
  onCreateNord?: (typeId: string, position?: { x: number; y: number }) => void;
}

export default function GlobalDock({ projectId, onOpenManageTypes, onCreateNord }: GlobalDockProps) {
  const { lens, setLens, activeConnectionTypeId, setActiveConnectionTypeId, activeLine, setActiveLine, showContext, setShowContext } = useLens();
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [snapshotTab, setSnapshotTab] = useState<'take' | 'history'>('take');

  const { visibleNodeTypes, visibleConnectionTypes, toggleNodeType } = useTypeVisibility();
  const { nordTypes, connectionTypes } = useTypeRegistryContext();
  const { isNordTypeVisible, toggleNordTypeFilter, getBoard, toggleOrphans } = useBoardSettings(projectId || null);
  const { updateConnectionType } = useConnectionTypeMutations();
  const boardSettings = activeConnectionTypeId ? getBoard(activeConnectionTypeId) : null;

  // Full resolved connection type (has directionFilter)
  const activeFullType = connectionTypes.find(ct => ct.id === activeConnectionTypeId) ?? null;

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
              className={`nords-lens-toggle__btn ${lens === 'board' ? 'is-active' : ''}`}
              onClick={() => {
                setLens('board');
                setOpenPanel(null);
                if (!activeConnectionTypeId && visibleConnectionTypes.length > 0) {
                  setActiveConnectionTypeId(visibleConnectionTypes[0].id);
                  setActiveLine(visibleConnectionTypes[0].name);
                }
              }}
              title="Board — kanban view by connection type"
              data-testid="lens-board"
            >
              <LayoutGrid size={14} strokeWidth={1.6} />
              <span>Board</span>
            </button>
            <button
              className={`nords-lens-toggle__btn ${lens === 'canvas' ? 'is-active' : ''}`}
              onClick={() => { setLens('canvas'); setOpenPanel(null); }}
              title="Graph — spatial graph view"
              data-testid="lens-canvas"
            >
              <Eye size={14} strokeWidth={1.6} />
              <span>Graph</span>
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

          {/* Show/Hide toggle — graph mode */}
          {lens !== 'board' && (
            <div className="nords-dock__section">
              <button
                className={`nords-dock__item ${showContext ? 'is-active' : ''}`}
                onClick={() => setShowContext(!showContext)}
                data-testid="dock-toggle-context"
                title={activeConnectionTypeId ? 'Show/hide other connection types' : 'Show/hide orphaned nords'}
              >
                {showContext ? <EyeIcon size={15} strokeWidth={1.6} /> : <EyeOff size={15} strokeWidth={1.6} />}
                <span className="nords-dock__label">{activeConnectionTypeId ? 'Others' : 'Orphans'}</span>
              </button>
            </div>
          )}

          {/* Filter button — board mode: opens Nord Viewer flyout */}
          {lens === 'board' && (
            <div className="nords-dock__section">
              <button
                className={`nords-dock__item ${openPanel === 'filter' ? 'is-active' : ''}`}
                onClick={() => togglePanel('filter')}
                data-testid="dock-filter"
                title="Filter visible nord types & orphans"
              >
                <Filter size={15} strokeWidth={1.6} />
                <span className="nords-dock__label">Filter</span>
                <ChevronDown size={10} className="nords-dock__chevron" />
              </button>
            </div>
          )}

          {/* Direction filter — board mode only, inline segmented control */}
          {lens === 'board' && activeConnectionTypeId && (
            <>
              <div className="nords-dock__separator" />
              <div className="nords-dock__direction-filter">
                {(['all', 'forward', 'reverse', 'both', 'none'] as const).map(dir => {
                  const isActive = (activeFullType?.directionFilter ?? 'all') === dir;
                  return (
                    <button
                      key={dir}
                      className={`nords-dock__dir-btn ${isActive ? 'is-active' : ''}`}
                      title={dir === 'all' ? 'Show all directions' : `Show ${dir} connections`}
                      onClick={async () => {
                        if (!activeConnectionTypeId) return;
                        await updateConnectionType(activeConnectionTypeId, { direction_filter: dir });
                        // Trigger a graph reload by dispatching a custom event that MatrixView listens for
                        window.dispatchEvent(new CustomEvent('nords:refetch'));
                      }}
                    >
                      {dir === 'all' ? 'All'
                        : dir === 'forward' ? '→'
                        : dir === 'reverse' ? '←'
                        : dir === 'both' ? '↔'
                        : '⊘'}
                    </button>
                  );
                })}
              </div>
            </>
          )}

        </nav>

        {/* ═══ FLYOUT PANELS ═══ */}


        {/* Connection Type Switcher Flyout */}
        <div className={`nords-flyout nords-glass ${openPanel === 'relationship' ? 'is-open' : ''}`} data-testid="flyout-connection-type">
          <div className="nords-flyout__header">
            <h3 className="nords-flyout__title">Connection Type</h3>
            <span className="nords-flyout__count">
              {visibleConnectionTypes.filter(t => !t.isSystem).length} types
            </span>
          </div>
          <div className="nords-flyout__list">
            {/* All Lines (Relevance) — hidden in board mode, board requires a specific type */}
            {lens !== 'board' && (
              <div
                className={`nords-flyout__row nords-flyout__row--selectable ${!activeConnectionTypeId ? 'is-active' : ''}`}
                onClick={() => { setActiveConnectionTypeId(null); setActiveLine('All'); setOpenPanel(null); }}
              >
                <div className="nords-flyout__row-left">
                  <Link2 size={14} strokeWidth={1.6} style={{ color: 'var(--nords-color-text-tertiary)', flexShrink: 0 }} />
                  <span className="nords-flyout__row-name">All Lines (Relevance)</span>
                </div>
              </div>
            )}
            {visibleConnectionTypes
              .filter(t => !t.isSystem)
              .filter(t => lens !== 'board' || (t.measurementMode !== 'none' && t.xStageLabels.length > 0))
              .map((type) => (
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

        {/* Nord Viewer / Filter Flyout (board mode) */}
        <div className={`nords-flyout nords-glass ${openPanel === 'filter' ? 'is-open' : ''}`} data-testid="flyout-filter">
          <div className="nords-flyout__header">
            <h3 className="nords-flyout__title">Nord Visibility</h3>
            <span className="nords-flyout__count">{nordTypes.length} types</span>
          </div>
          <div className="nords-flyout__list">
            {nordTypes.map(nt => {
              const visible = activeConnectionTypeId ? isNordTypeVisible(activeConnectionTypeId, nt.id) : true;
              return (
                <div
                  key={nt.id}
                  className={`nords-flyout__row nords-flyout__row--selectable ${visible ? 'is-active' : ''}`}
                  onClick={() => activeConnectionTypeId && toggleNordTypeFilter(activeConnectionTypeId, nt.id)}
                >
                  <div className="nords-flyout__row-left">
                    <nt.icon size={14} strokeWidth={1.8} style={{ color: nt.color, flexShrink: 0 }} />
                    <span className="nords-flyout__row-name">{nt.name}</span>
                    <span className="nords-flyout__row-count">{nt.count}</span>
                  </div>
                  <div className="nords-flyout__row-right">
                    {visible ? <EyeIcon size={13} style={{ color: nt.color }} /> : <EyeOff size={13} style={{ opacity: 0.3 }} />}
                  </div>
                </div>
              );
            })}
            {/* Orphans toggle */}
            <div
              className={`nords-flyout__row nords-flyout__row--selectable ${boardSettings?.showOrphans ? 'is-active' : ''}`}
              onClick={() => activeConnectionTypeId && toggleOrphans(activeConnectionTypeId)}
            >
              <div className="nords-flyout__row-left">
                <Unlink size={14} strokeWidth={1.8} style={{ color: 'var(--nords-color-text-tertiary)', flexShrink: 0 }} />
                <span className="nords-flyout__row-name">Orphans</span>
              </div>
              <div className="nords-flyout__row-right">
                {boardSettings?.showOrphans ? <EyeIcon size={13} /> : <EyeOff size={13} style={{ opacity: 0.3 }} />}
              </div>
            </div>
          </div>
          <div className="nords-flyout__footer">
            <span className="nords-flyout__footer-hint">
              Toggle visibility of nord types on this board
            </span>
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

/**
 * GlobalDock.tsx — Floating Bottom Navigation Bar
 *
 * The Global Dock is the primary navigation and tool-switching control.
 * It floats at the bottom center of the viewport as a pill-shaped bar
 * with glassmorphism styling (backdrop-blur + translucent bg).
 *
 * Structure:
 *   ┌───────────────────────────────────────────────────────┐
 *   │ [Canvas] [Link] [Matrix]  │  {Contextual Tools}      │
 *   └───────────────────────────────────────────────────────┘
 *
 * The left segment is always the 3-way Lens Toggle.
 * The right segment shows lens-specific contextual tools:
 *
 *   Canvas mode → Display | Comments | Snapshot | + Add
 *   Link mode   → {LineType} | Context | Connect | Comments | Snapshot
 *   Matrix mode → Columns: {Line} | Rows: {Line} | Comments | Snapshot | + Add
 *
 * Flyout panels open upward from the dock for:
 *   - Display: toggle visibility of nord types + connection types
 *   - Relationship: select the active connection type (Link mode)
 *   - Matrix Columns: select which connection type drives column buckets
 *   - Add: quick-create nords/connections + access to Manage Types modal
 *
 * @see docs/frontend/04_ui_and_interactions.md §1.2 Global Dock
 */

import React, { useState } from 'react';
import {
  Eye, Link2, LayoutGrid,
  MessageSquare, Plus, Pencil, Camera, Play,
  EyeIcon, EyeOff, ChevronDown, ArrowLeftRight, Ghost, Crosshair,
  Bug, User, FileText, Target, Lightbulb, Layers, AlertTriangle,
  Square, Minus as LineIcon, Settings2, Trash2,
} from 'lucide-react';
import type { LensMode } from '../../App';
import Spectrum from '../Spectrum/Spectrum';
import './GlobalDock.css';

/* ═══════════════════════════════════════════════════════════════════ */
/* TYPE REGISTRIES                                                    */
/*                                                                    */
/* These define the available nord and connection types for the       */
/* Display flyout and Add panel. In production, these would come      */
/* from the project's type schema (ManageTypes configuration).        */
/* ═══════════════════════════════════════════════════════════════════ */

/** Available nord types with their accent colors and visibility state */
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

/** Available connection types with colors and visibility */
const CONNECTION_TYPES = [
  { name: 'Blocks', color: '#4da6ff', count: 5, visible: true },
  { name: 'Depends', color: '#fbbf24', count: 4, visible: true },
  { name: 'Relates', color: '#a78bfa', count: 4, visible: false },
  { name: 'Assigned', color: '#34d399', count: 2, visible: true },
];

/* ═══════════════════════════════════════════════════════════════════ */
/* COMPONENT                                                          */
/* ═══════════════════════════════════════════════════════════════════ */

interface GlobalDockProps {
  /** Current lens mode */
  lens: LensMode;
  /** Callback to switch lens mode */
  onLensChange: (lens: LensMode) => void;
  /** Name of the active connection type (drives Link + Matrix behavior) */
  activeLine: string;
  /** Callback to change the active connection type */
  onActiveLineChange: (line: string) => void;
  /** Link mode: whether context ghosts are visible */
  showContext: boolean;
  /** Link mode: toggle context ghost visibility */
  onShowContextChange: (show: boolean) => void;
  /** Opens the Manage Types full-screen modal */
  onOpenManageTypes?: () => void;
}

const GlobalDock: React.FC<GlobalDockProps> = ({
  lens, onLensChange,
  activeLine, onActiveLineChange,
  showContext, onShowContextChange,
  onOpenManageTypes,
}) => {
  /** Tracks which flyout panel is currently open (null = all closed) */
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  /** Snapshot flyout tab: 'take' (create new) or 'history' (view existing) */
  const [snapshotTab, setSnapshotTab] = useState<'take' | 'history'>('take');

  /** Toggle a flyout panel open/closed */
  const togglePanel = (panel: string) => {
    setOpenPanel(openPanel === panel ? null : panel);
  };

  /** Look up the active connection type's metadata (for color swatch) */
  const activeConnectionType = CONNECTION_TYPES.find(l => l.name === activeLine);

  return (
    <>
      {/* Scrim — click-away target to close flyout panels */}
      {openPanel && <div className="nords-flyout-scrim" onClick={() => setOpenPanel(null)} />}

      <div className="nords-dock-wrapper">
        <nav className="nords-global-dock nords-glass">

          {/* ═══ Lens Toggle ═══
           *
           * 3-way segmented control: Canvas / Link / Matrix
           * Always visible regardless of active lens.
           */}
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

          {/* ═══ CANVAS TOOLS ═══
           *
           * Display: toggle visibility of nord/connection types
           * Comments: open the federated comments panel (stub)
           * Add: quick-create nords + connections, access Manage Types
           */}
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
                <button
                  className={`nords-dock__item ${openPanel === 'comments' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('comments')}
                  title="View all comments"
                >
                  <MessageSquare size={15} strokeWidth={1.6} />
                  <span className="nords-dock__label">Comments</span>
                </button>
              </div>

              <div className="nords-dock__separator" />

              <div className="nords-dock__section">
                <button
                  className={`nords-dock__item ${openPanel === 'snapshot' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('snapshot')}
                  title="Take a snapshot of the current state"
                >
                  <Camera size={15} strokeWidth={1.6} />
                  <span className="nords-dock__label">Snapshot</span>
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

          {/* ═══ LINK TOOLS ═══
           *
           * Active relationship type selector (with color swatch)
           * Context toggle (ghost unconnected nords at 20% opacity)
           * Connect mode (click source → click target to create connection)
           * Comments
           */}
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


              <div className="nords-dock__separator" />

              <div className="nords-dock__section">
                <button
                  className={`nords-dock__item ${openPanel === 'comments' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('comments')}
                  title="View all comments"
                >
                  <MessageSquare size={15} strokeWidth={1.6} />
                  <span className="nords-dock__label">Comments</span>
                </button>
              </div>

              <div className="nords-dock__separator" />

              <div className="nords-dock__section">
                <button
                  className={`nords-dock__item ${openPanel === 'snapshot' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('snapshot')}
                  title="Take a snapshot of the current state"
                >
                  <Camera size={15} strokeWidth={1.6} />
                  <span className="nords-dock__label">Snapshot</span>
                </button>
              </div>
            </>
          )}

          {/* ═══ MATRIX TOOLS ═══
           *
           * Columns axis: which connection type drives column buckets
           * Rows axis: optional second connection type for 2D matrix (stubbed)
           * Comments + Add
           */}
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
                <button
                  className={`nords-dock__item ${openPanel === 'comments' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('comments')}
                  title="View all comments"
                >
                  <MessageSquare size={15} strokeWidth={1.6} />
                  <span className="nords-dock__label">Comments</span>
                </button>
              </div>

              <div className="nords-dock__separator" />

              <div className="nords-dock__section">
                <button
                  className={`nords-dock__item ${openPanel === 'snapshot' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('snapshot')}
                  title="Take a snapshot of the current state"
                >
                  <Camera size={15} strokeWidth={1.6} />
                  <span className="nords-dock__label">Snapshot</span>
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

        {/* ═══════════════════════════════════════════════════════════
         * FLYOUT PANELS
         *
         * Open upward from the dock when a tool button is clicked.
         * Only one flyout can be open at a time. Clicking the scrim
         * (transparent overlay) or re-clicking the button closes it.
         * ═══════════════════════════════════════════════════════════ */}

        {/* ── Display Flyout: unified visibility for Nords + Lines ── */}
        <div className={`nords-flyout nords-glass ${openPanel === 'display' ? 'is-open' : ''}`}>
          <div className="nords-flyout__header">
            <h3 className="nords-flyout__title">Display</h3>
            <span className="nords-flyout__count">
              {NORD_TYPES.reduce((a, b) => a + b.count, 0)} nords · {CONNECTION_TYPES.reduce((a, b) => a + b.count, 0)} connections
            </span>
          </div>
          <div className="nords-flyout__list">
            {/* Nord type visibility toggles */}
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

            {/* Connection type visibility toggles */}
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

        {/* ── Relationship Selector Flyout (Link mode) ──
         *
         * Lists all connection types as selectable rows.
         * Clicking one sets it as the active connection type and closes the flyout.
         * The active row shows a Spectrum preview widget.
         */}
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

        {/* ── Matrix Column Selector Flyout ──
         *
         * Lists connection types to use as the column axis.
         * The selected type's Semantic Stage labels become column headers.
         */}
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
              stage labels → column headers
            </span>
          </div>
        </div>

        {/* ── Add Flyout: quick-create nords + connections ──
         *
         * Three sections:
         *   1. Add Nord — grid of type buttons
         *   2. Add Connection — grid of connection type buttons
         *   3. Manage Types — link to the full-screen type schema editor
         */}
        <div className={`nords-flyout nords-glass ${openPanel === 'add' ? 'is-open' : ''}`}>
          <div className="nords-flyout__header">
            <h3 className="nords-flyout__title">Add</h3>
          </div>
          <div className="nords-flyout__list">
            {/* Quick-create nord by type */}
            <div className="nords-flyout__create-section">
              <h4 className="nords-flyout__create-label">Add Nord</h4>
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

            {/* Quick-create connection by type */}
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

            {/* Link to Manage Types modal */}
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

        {/* ── Snapshot Flyout: Take / History tabs ── */}
        <div className={`nords-flyout nords-glass ${openPanel === 'snapshot' ? 'is-open' : ''}`}>
          <div className="nords-flyout__header">
            <div className="nords-flyout__tabs">
              <button
                className={`nords-flyout__tab ${snapshotTab === 'take' ? 'is-active' : ''}`}
                onClick={() => setSnapshotTab('take')}
              >Take Snapshot</button>
              <button
                className={`nords-flyout__tab ${snapshotTab === 'history' ? 'is-active' : ''}`}
                onClick={() => setSnapshotTab('history')}
              >History</button>
            </div>
          </div>

          {/* Tab 1: Take Snapshot */}
          {snapshotTab === 'take' && (
            <>
              <div className="nords-flyout__list">
                <div className="nords-flyout__create-section">
                  <h4 className="nords-flyout__create-label">Snapshot Name</h4>
                  <input className="nords-flyout__snapshot-input" placeholder="e.g. Sprint 4 Kickoff" autoFocus />
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

          {/* Tab 2: History — list of existing snapshots */}
          {snapshotTab === 'history' && (
            <div className="nords-flyout__list">
              {[
                { name: 'Sprint 3 Retro', time: '2026-04-08 14:30', desc: 'All blockers resolved' },
                { name: 'Pre-Launch Review', time: '2026-04-10 09:15', desc: 'Final review before beta' },
                { name: 'Sprint 4 Kickoff', time: '2026-04-11 10:00', desc: 'Initial sprint planning' },
              ].map(snap => (
                <div key={snap.name} className="nords-flyout__snapshot-entry">
                  <div className="nords-flyout__snapshot-entry-header">
                    <Camera size={12} strokeWidth={1.5} />
                    <span className="nords-flyout__snapshot-entry-name">{snap.name}</span>
                    <span className="nords-flyout__snapshot-entry-time">{snap.time}</span>
                  </div>
                  <span className="nords-flyout__snapshot-entry-desc">{snap.desc}</span>
                  <div className="nords-flyout__snapshot-entry-actions">
                    <button className="nords-flyout__snapshot-action">Load</button>
                    <button className="nords-flyout__snapshot-action">
                      <Play size={10} /> Play
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ COMMENTS FLYOUT ═══
         *
         * Federated activity feed showing all comments across all nords.
         * Each entry shows: author avatar, nord name, timestamp, comment text.
         */}
        <div className={`nords-flyout nords-glass ${openPanel === 'comments' ? 'is-open' : ''}`}>
          <div className="nords-flyout__header">
            <h3 className="nords-flyout__title">Comments</h3>
            <span className="nords-flyout__count">4 threads</span>
          </div>
          <div className="nords-flyout__list">
            {/* Mock comment entries */}
            <div className="nords-flyout__comment-entry">
              <div className="nords-flyout__comment-avatar" style={{ backgroundColor: '#2563eb' }}>D</div>
              <div className="nords-flyout__comment-body">
                <div className="nords-flyout__comment-meta">
                  <span className="nords-flyout__comment-author">Daniel</span>
                  <span className="nords-flyout__comment-nord">Physics Engine Spike</span>
                  <span className="nords-flyout__comment-time">2m ago</span>
                </div>
                <p className="nords-flyout__comment-text">The force-directed layout is looking great. Can we benchmark with 500+ nodes?</p>
              </div>
            </div>
            <div className="nords-flyout__comment-entry">
              <div className="nords-flyout__comment-avatar" style={{ backgroundColor: '#059669' }}>S</div>
              <div className="nords-flyout__comment-body">
                <div className="nords-flyout__comment-meta">
                  <span className="nords-flyout__comment-author">Sarah</span>
                  <span className="nords-flyout__comment-nord">API Design Doc</span>
                  <span className="nords-flyout__comment-time">15m ago</span>
                </div>
                <p className="nords-flyout__comment-text">Updated the REST endpoints section. @Daniel please review the auth flow.</p>
              </div>
            </div>
            <div className="nords-flyout__comment-entry">
              <div className="nords-flyout__comment-avatar" style={{ backgroundColor: '#2563eb' }}>D</div>
              <div className="nords-flyout__comment-body">
                <div className="nords-flyout__comment-meta">
                  <span className="nords-flyout__comment-author">Daniel</span>
                  <span className="nords-flyout__comment-nord">Vendor Lock-in</span>
                  <span className="nords-flyout__comment-time">1h ago</span>
                </div>
                <p className="nords-flyout__comment-text">Mitigation strategy approved. Moving to multi-cloud provider setup.</p>
              </div>
            </div>
            <div className="nords-flyout__comment-entry">
              <div className="nords-flyout__comment-avatar" style={{ backgroundColor: '#059669' }}>S</div>
              <div className="nords-flyout__comment-body">
                <div className="nords-flyout__comment-meta">
                  <span className="nords-flyout__comment-author">Sarah</span>
                  <span className="nords-flyout__comment-nord">Physics Engine Spike</span>
                  <span className="nords-flyout__comment-time">2h ago</span>
                </div>
                <p className="nords-flyout__comment-text">Initial spike complete. WebWorker approach handles 200 nodes at 60fps.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default GlobalDock;

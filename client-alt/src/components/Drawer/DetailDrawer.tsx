/**
 * DetailDrawer.tsx — Right-Side Detail Panel (Nord + Line modes)
 *
 * Opens when a nord OR a connection is clicked. Two modes:
 *
 * **Nord Mode** (default):
 *   - Type badge + close
 *   - Editable title
 *   - Tabs: Properties | Connections | Comments
 *   - Properties are READ-ONLY per instance — edit type schema via Manage Types
 *
 * **Line Mode** (when a connection is clicked):
 *   - Line type badge (colored swatch) + close
 *   - Arrow direction toggle (A→B | A←B | none — single arrow only)
 *   - Source & Target nords display
 *   - Spectrum distance (grayed out when no arrow is set)
 *   - Tabs: Properties | Comments
 *
 * @see docs/frontend/04_ui_and_interactions.md §1.5 Detail Drawer
 */

import React, { useState } from 'react';
import {
  X, Square, User, ArrowRight, ArrowLeft, Settings2, Link2,
} from 'lucide-react';
import Spectrum from '../Spectrum/Spectrum';
import MarkdownEditor from '../MarkdownEditor/MarkdownEditor';
import './DetailDrawer.css';

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nordId: string | null;
  /** If set, opens in Line Detail mode instead of Nord mode */
  lineMode?: boolean;
}

const DetailDrawer: React.FC<DetailDrawerProps> = ({ isOpen, onClose, nordId, lineMode = false }) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'connections' | 'comments'>('properties');
  /** Arrow direction: 'forward' (A→B), 'backward' (A←B), or null (undirected) */
  const [arrowDirection, setArrowDirection] = useState<'forward' | 'backward' | null>('forward');

  /* ═══════════════════════════════════════════════════════════════ */
  /* LINE DETAIL MODE                                               */
  /*                                                                */
  /* Shows when a connection is clicked on the canvas.       */
  /* Arrow direction is REQUIRED before spectrum editing is allowed.*/
  /* ═══════════════════════════════════════════════════════════════ */

  if (lineMode) {
    return (
      <>
        <div className={`nords-drawer-scrim ${isOpen ? 'is-visible' : ''}`} onClick={onClose} />
        <aside className={`nords-detail-drawer ${isOpen ? 'is-open' : ''}`}>
          {/* Header — line type badge */}
          <header className="nords-drawer__header">
            <div className="nords-drawer__type-badge">
              <span className="nords-drawer__type-icon nords-drawer__type-icon--line" style={{ backgroundColor: '#4da6ff' }}>
                <Link2 size={10} strokeWidth={2.5} color="white" />
              </span>
              <span>Blocks</span>
            </div>
            <button className="nords-drawer__close" onClick={onClose} aria-label="Close drawer">
              <X size={14} strokeWidth={2} />
            </button>
          </header>

          <div className="nords-drawer__content">
            {/* ── Arrow Direction Control ──
              *
              * Single arrow only — no bidirectional option.
              * Direction defines which node is the subject of the relationship.
              * Without direction, the spectrum value is read-only (grayed out).
              */}
            <div className="nords-drawer__section-title">Direction</div>
            <div className="nords-line-direction">
              <button
                className={`nords-line-direction__btn ${arrowDirection === 'forward' ? 'is-active' : ''}`}
                onClick={() => setArrowDirection(arrowDirection === 'forward' ? null : 'forward')}
                title="Auth & SSO → Physics Engine"
              >
                <span className="nords-line-direction__node">Auth & SSO</span>
                <ArrowRight size={14} strokeWidth={2} />
                <span className="nords-line-direction__node">Physics Engine</span>
              </button>
              <button
                className={`nords-line-direction__btn ${arrowDirection === 'backward' ? 'is-active' : ''}`}
                onClick={() => setArrowDirection(arrowDirection === 'backward' ? null : 'backward')}
                title="Physics Engine → Auth & SSO"
              >
                <span className="nords-line-direction__node">Physics Engine</span>
                <ArrowRight size={14} strokeWidth={2} />
                <span className="nords-line-direction__node">Auth & SSO</span>
              </button>
            </div>
            {!arrowDirection && (
              <p className="nords-line-direction__hint">
                Set a direction to enable spectrum editing. Direction defines which nord is the subject.
              </p>
            )}

            {/* ── Source & Target Nords ── */}
            <div className="nords-drawer__section-title" style={{ marginTop: 'var(--nords-space-lg)' }}>Connected Nords</div>
            <div className="nords-line-endpoints">
              <div className="nords-line-endpoint">
                <span className="nords-line-endpoint__icon" style={{ color: '#4da6ff' }}>
                  <Square size={12} strokeWidth={2} />
                </span>
                <div className="nords-line-endpoint__info">
                  <span className="nords-line-endpoint__type">Task</span>
                  <span className="nords-line-endpoint__name">Auth & SSO Integration</span>
                </div>
              </div>
              <div className="nords-line-endpoint">
                <span className="nords-line-endpoint__icon" style={{ color: '#4da6ff' }}>
                  <Square size={12} strokeWidth={2} />
                </span>
                <div className="nords-line-endpoint__info">
                  <span className="nords-line-endpoint__type">Task</span>
                  <span className="nords-line-endpoint__name">Physics Engine Spike</span>
                </div>
              </div>
            </div>

            {/* ── Spectrum Distance ──
              * Grayed out when no arrow direction is set.
              * Per user spec: "the arrow impacts the spectrum value"
              */}
            <div className="nords-drawer__section-title" style={{ marginTop: 'var(--nords-space-lg)' }}>Spatial Distance</div>
            <div className={`nords-line-spectrum ${!arrowDirection ? 'is-disabled' : ''}`}>
              <div className="nords-line-spectrum__bar">
                <Spectrum value={0.72} color={arrowDirection ? '#4da6ff' : 'var(--nords-color-text-disabled)'} width={160} />
              </div>
              <div className="nords-line-spectrum__values">
                <span className="nords-line-spectrum__number">0.72</span>
                <span className="nords-line-spectrum__label">Partial Block</span>
              </div>
              {!arrowDirection && (
                <span className="nords-line-spectrum__disabled-hint">Set arrow direction to edit</span>
              )}
            </div>

            {/* ── Line Properties ── */}
            <div className="nords-drawer__section-title" style={{ marginTop: 'var(--nords-space-lg)' }}>Properties</div>
            <div className="nords-property">
              <span className="nords-property__label">Severity</span>
              <span className="nords-property__value">Hard Block</span>
            </div>
            <div className="nords-property">
              <span className="nords-property__label">Notes</span>
              <span className="nords-property__value">SSO session must resolve before physics can init</span>
            </div>
          </div>
        </aside>
      </>
    );
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /* NORD DETAIL MODE (default)                                     */
  /* ═══════════════════════════════════════════════════════════════ */

  return (
    <>
      <div className={`nords-drawer-scrim ${isOpen ? 'is-visible' : ''}`} onClick={onClose} />

      <aside className={`nords-detail-drawer ${isOpen ? 'is-open' : ''}`}>

        {/* ── Header: Type Badge + Close ── */}
        <header className="nords-drawer__header">
          <div className="nords-drawer__type-badge">
            <span className="nords-drawer__type-icon" style={{ backgroundColor: '#4da6ff' }}>
              <Square size={10} strokeWidth={2.5} color="white" />
            </span>
            <span>Task</span>
          </div>
          <button className="nords-drawer__close" onClick={onClose} aria-label="Close drawer">
            <X size={14} strokeWidth={2} />
          </button>
        </header>

        {/* ── Editable Title ── */}
        <div className="nords-drawer__title-area">
          <h2 className="nords-drawer__title" contentEditable suppressContentEditableWarning>
            Physics Engine Evaluation Spike
          </h2>
        </div>

        {/* ── Tab Bar ── */}
        <div className="nords-drawer__tabs">
          {(['properties', 'connections', 'comments'] as const).map(tab => (
            <button
              key={tab}
              className={`nords-drawer__tab ${activeTab === tab ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Scrollable Content ── */}
        <div className="nords-drawer__content">

          {/* ══ Properties Tab ══ */}
          {activeTab === 'properties' && (
            <div className="nords-drawer__properties">
              <div className="nords-property">
                <span className="nords-property__label">Status</span>
                <span className="nords-property__value nords-property__value--status-active">In Progress</span>
              </div>
              <div className="nords-property">
                <span className="nords-property__label">Assignee</span>
                <div className="nords-property__value nords-property__value--user">
                  <span className="nords-property__avatar" style={{ backgroundColor: '#059669' }}>
                    <User size={10} color="white" />
                  </span>
                  Sarah Chen
                </div>
              </div>
              <div className="nords-property">
                <span className="nords-property__label">Priority</span>
                <span className="nords-property__value nords-property__value--priority">High</span>
              </div>
              <div className="nords-property">
                <span className="nords-property__label">Sprint</span>
                <span className="nords-property__value">Sprint 4</span>
              </div>
              <div className="nords-property">
                <span className="nords-property__label">Points</span>
                <span className="nords-property__value nords-property__value--mono">8</span>
              </div>

              {/* Link to Manage Types — NOT "Add property" (properties are type-level only) */}
              <button className="nords-drawer__manage-link" title="Properties are defined at the type level">
                <Settings2 size={11} strokeWidth={1.8} />
                Edit type properties → Manage Types
              </button>

              {/* ── Description ── */}
              <div className="nords-drawer__description">
                <h3 className="nords-drawer__section-title">Description</h3>
                <MarkdownEditor
                  value={`Evaluate potential physics libraries for the force-directed graph engine. Primary candidates:\n\n- **d3-force** — Battle-tested, massive community, flexible simulation\n- **react-force-graph** — React wrapper around d3-force with WebGL renderer\n- **matter.js** — Full rigid-body physics (overkill?)\n\nKey criteria: spring tension accuracy for the 0.0→1.0 semantic scale, performance at 200+ nodes, and compatibility with "The Reveal" tweening.`}
                  fillContainer
                  placeholder="Add a description (markdown supported)..."
                />
              </div>
            </div>
          )}

          {/* ══ Connections Tab ══ */}
          {activeTab === 'connections' && (
            <div className="nords-drawer__connections">
              <div className="nords-connection">
                <div className="nords-connection__line-type">
                  <span className="nords-connection__line-color" style={{ background: '#4da6ff' }} />
                  Blocks
                </div>
                <div className="nords-connection__target">Implement Detail Drawer</div>
                <div className="nords-connection__stage">
                  <span className="nords-connection__value">0.72</span>
                  <span className="nords-connection__label-text">Partial Block</span>
                </div>
              </div>
              <div className="nords-connection">
                <div className="nords-connection__line-type">
                  <span className="nords-connection__line-color" style={{ background: '#34d399' }} />
                  Assigned To
                </div>
                <div className="nords-connection__target">Sarah Chen</div>
                <div className="nords-connection__stage">
                  <span className="nords-connection__value">0.15</span>
                  <span className="nords-connection__label-text">Primary</span>
                </div>
              </div>

              <button className="nords-drawer__manage-link">
                <Settings2 size={11} strokeWidth={1.8} />
                Add connection
              </button>
            </div>
          )}

          {/* ══ Comments Tab ══ */}
          {activeTab === 'comments' && (
            <div className="nords-drawer__comments">
              <div className="nords-comment">
                <div className="nords-comment__header">
                  <span className="nords-comment__avatar" style={{ backgroundColor: '#2563eb' }}>D</span>
                  <span className="nords-comment__author">Daniel</span>
                  <span className="nords-comment__time">2h ago</span>
                </div>
                <p className="nords-comment__body">Let's make sure we benchmark at 500+ nodes. PRD says 200 but we need headroom.</p>
              </div>
              <div className="nords-comment">
                <div className="nords-comment__header">
                  <span className="nords-comment__avatar" style={{ backgroundColor: '#a78bfa' }}>AI</span>
                  <span className="nords-comment__author">Claude</span>
                  <span className="nords-comment__time">1h ago</span>
                </div>
                <p className="nords-comment__body">d3-force with WebGL via @react-three/fiber should handle 2000+ nodes at 60fps. I can prepare a benchmark comparison.</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default DetailDrawer;

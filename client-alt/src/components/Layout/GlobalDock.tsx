import React, { useState } from 'react';
import {
  Waypoints, LayoutGrid, Square, Minus, Clock,
  Eye, EyeOff, Magnet, ChevronRight,
  Zap, Bug, User, FileText, Target, Lightbulb, StickyNote
} from 'lucide-react';
import './GlobalDock.css';

interface GlobalDockProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

/* ── Mock data for flyout panels ── */
const NARD_TYPES = [
  { name: 'Task', icon: Square, color: '#4da6ff', count: 24 },
  { name: 'Bug', icon: Bug, color: '#f87171', count: 8 },
  { name: 'Person', icon: User, color: '#34d399', count: 6 },
  { name: 'Artifact', icon: FileText, color: '#fbbf24', count: 12 },
  { name: 'Milestone', icon: Target, color: '#a78bfa', count: 3 },
  { name: 'Idea', icon: Lightbulb, color: '#fb923c', count: 5 },
];

const LINE_TYPES = [
  { name: 'Blocks', color: '#4da6ff', visible: true, active: true, count: 18 },
  { name: 'Assigned To', color: '#34d399', visible: true, active: false, count: 14 },
  { name: 'Depends On', color: '#fbbf24', visible: false, active: false, count: 9 },
  { name: 'Relates To', color: '#a78bfa', visible: false, active: false, count: 6 },
];

const SNAPSHOTS = [
  { name: 'Sprint 4 Kickoff', date: 'Apr 7, 2026', isCurrent: false },
  { name: 'Mid-Sprint Review', date: 'Apr 9, 2026', isCurrent: false },
  { name: 'Live State', date: 'Now', isCurrent: true },
];

const GlobalDock: React.FC<GlobalDockProps> = ({ activeView, onViewChange }) => {
  const [openPanel, setOpenPanel] = useState<string | null>(null);

  const togglePanel = (panel: string) => {
    setOpenPanel(openPanel === panel ? null : panel);
  };

  return (
    <>
      {/* Scrim to dismiss flyout */}
      {openPanel && <div className="nards-flyout-scrim" onClick={() => setOpenPanel(null)} />}

      <div className="nards-dock-wrapper">
        <nav className="nards-global-dock nards-glass">

          {/* Lens Selector */}
          <div className="nards-dock__section">
            <button
              className={`nards-dock__item ${activeView === 'canvas' ? 'is-active' : ''}`}
              onClick={() => { onViewChange('canvas'); setOpenPanel(null); }}
            >
              <Waypoints size={18} strokeWidth={1.6} />
              <span className="nards-dock__label">Canvas</span>
            </button>
            <button
              className={`nards-dock__item ${activeView === 'matrix' ? 'is-active' : ''}`}
              onClick={() => { onViewChange('matrix'); setOpenPanel(null); }}
            >
              <LayoutGrid size={18} strokeWidth={1.6} />
              <span className="nards-dock__label">Matrix</span>
            </button>
          </div>

          <div className="nards-dock__separator" />

          {/* Palette Triggers */}
          <div className="nards-dock__section">
            <button
              className={`nards-dock__item ${openPanel === 'nards' ? 'is-active' : ''}`}
              onClick={() => togglePanel('nards')}
            >
              <Square size={18} strokeWidth={1.6} />
              <span className="nards-dock__label">Nards</span>
            </button>
            <button
              className={`nards-dock__item ${openPanel === 'lines' ? 'is-active' : ''}`}
              onClick={() => togglePanel('lines')}
            >
              <Minus size={18} strokeWidth={1.6} />
              <span className="nards-dock__label">Lines</span>
            </button>
          </div>

          <div className="nards-dock__separator" />

          {/* Sticky Note Tool */}
          <div className="nards-dock__section">
            <button
              className="nards-dock__item nards-dock__item--drag"
              draggable
              title="Drag to add a sticky note"
            >
              <StickyNote size={18} strokeWidth={1.6} fill="var(--nards-color-warning)" />
              <span className="nards-dock__label">Note</span>
            </button>
          </div>

          <div className="nards-dock__separator" />

          {/* Timeline */}
          <div className="nards-dock__section">
            <button
              className={`nards-dock__item ${openPanel === 'timeline' ? 'is-active' : ''}`}
              onClick={() => togglePanel('timeline')}
            >
              <Clock size={18} strokeWidth={1.6} />
              <span className="nards-dock__label">Timeline</span>
            </button>
          </div>
        </nav>

        {/* ═══════════ FLYOUT PANELS ═══════════ */}

        {/* Nard Types Flyout */}
        <div className={`nards-flyout nards-glass ${openPanel === 'nards' ? 'is-open' : ''}`}>
          <div className="nards-flyout__header">
            <h3 className="nards-flyout__title">Nard Types</h3>
            <span className="nards-flyout__count">{NARD_TYPES.reduce((a, b) => a + b.count, 0)} total</span>
          </div>
          <div className="nards-flyout__list">
            {NARD_TYPES.map((type) => (
              <div key={type.name} className="nards-flyout__row">
                <div className="nards-flyout__row-left">
                  <span className="nards-flyout__type-icon" style={{ color: type.color }}>
                    <type.icon size={14} strokeWidth={2} />
                  </span>
                  <span className="nards-flyout__row-name">{type.name}</span>
                  <span className="nards-flyout__row-count">{type.count}</span>
                </div>
                <div className="nards-flyout__row-actions">
                  <button className="nards-flyout__visibility-btn is-visible" title="Toggle visibility">
                    <Eye size={13} strokeWidth={1.6} />
                  </button>
                  <ChevronRight size={12} className="nards-flyout__chevron" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Line Types Flyout */}
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
                <div className="nards-flyout__row-actions">
                  <button
                    className={`nards-flyout__visibility-btn ${type.visible ? 'is-visible' : ''}`}
                    title="Toggle visibility"
                  >
                    {type.visible ? <Eye size={13} strokeWidth={1.6} /> : <EyeOff size={13} strokeWidth={1.6} />}
                  </button>
                  <button
                    className={`nards-flyout__physics-btn ${type.active ? 'is-active' : ''}`}
                    title={type.active ? 'Active (physics on)' : 'Inactive (ghost)'}
                  >
                    <Magnet size={13} strokeWidth={1.6} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="nards-flyout__footer">
            <span className="nards-flyout__footer-hint">
              <Magnet size={10} /> Only 1 active line type allows spatial editing
            </span>
          </div>
        </div>

        {/* Timeline Flyout */}
        <div className={`nards-flyout nards-glass ${openPanel === 'timeline' ? 'is-open' : ''}`}>
          <div className="nards-flyout__header">
            <h3 className="nards-flyout__title">Timeline</h3>
            <span className="nards-flyout__count">{SNAPSHOTS.length} snapshots</span>
          </div>
          <div className="nards-flyout__list">
            {SNAPSHOTS.map((snap, i) => (
              <div key={i} className={`nards-flyout__row ${snap.isCurrent ? 'is-current' : ''}`}>
                <div className="nards-flyout__row-left">
                  <span className={`nards-flyout__snapshot-dot ${snap.isCurrent ? 'is-live' : ''}`} />
                  <div className="nards-flyout__snapshot-info">
                    <span className="nards-flyout__row-name">{snap.name}</span>
                    <span className="nards-flyout__snapshot-date">{snap.date}</span>
                  </div>
                </div>
                <ChevronRight size={12} className="nards-flyout__chevron" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
};

export default GlobalDock;

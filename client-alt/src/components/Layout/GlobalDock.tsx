import React from 'react';
import './GlobalDock.css';

interface GlobalDockProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const GlobalDock: React.FC<GlobalDockProps> = ({ activeView, onViewChange }) => {
  return (
    <div className="nards-dock-wrapper">
      <nav className="nards-global-dock nards-glass">

        {/* Lens Selector */}
        <div className="nards-dock__section">
          <button
            className={`nards-dock__item ${activeView === 'canvas' ? 'is-active' : ''}`}
            onClick={() => onViewChange('canvas')}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="nards-dock__icon">
              <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
              <circle cx="14" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
              <circle cx="8" cy="15" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
              <line x1="8" y1="7" x2="12" y2="7.5" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
              <line x1="7" y1="8.5" x2="7.5" y2="13" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
            </svg>
            <span className="nards-dock__label">Canvas</span>
          </button>
          <button
            className={`nards-dock__item ${activeView === 'matrix' ? 'is-active' : ''}`}
            onClick={() => onViewChange('matrix')}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="nards-dock__icon">
              <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
              <rect x="12" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
              <rect x="2" y="12" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
              <rect x="12" y="12" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
            <span className="nards-dock__label">Matrix</span>
          </button>
        </div>

        <div className="nards-dock__separator" />

        {/* Palettes */}
        <div className="nards-dock__section">
          <button className="nards-dock__item">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="nards-dock__icon">
              <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
              <line x1="3" y1="8" x2="17" y2="8" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="6" cy="12" r="1.5" fill="currentColor" opacity="0.4"/>
              <circle cx="10" cy="12" r="1.5" fill="currentColor" opacity="0.4"/>
            </svg>
            <span className="nards-dock__label">Nards</span>
          </button>
          <button className="nards-dock__item">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="nards-dock__icon">
              <path d="M3 10h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M3 6h14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
              <path d="M3 14h14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
            </svg>
            <span className="nards-dock__label">Lines</span>
          </button>
        </div>

        <div className="nards-dock__separator" />

        {/* Timeline */}
        <div className="nards-dock__section">
          <button className="nards-dock__item">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="nards-dock__icon">
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4"/>
              <polyline points="10,5 10,10 13,12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="nards-dock__label">History</span>
          </button>
        </div>

      </nav>
    </div>
  );
};

export default GlobalDock;

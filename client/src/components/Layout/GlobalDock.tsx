import React from 'react';
import './GlobalDock.css';

const GlobalDock: React.FC = () => {
  return (
    <div className="nards-dock-container">
      <nav className="nards-global-dock nards-glass">
        
        <div className="nards-dock-section">
          <button className="nards-dock-item active">
            <span className="icon">🌌</span>
            <span className="label">Canvas</span>
          </button>
          <button className="nards-dock-item">
            <span className="icon">📊</span>
            <span className="label">Matrix</span>
          </button>
        </div>

        <div className="nards-dock-divider"></div>

        <div className="nards-dock-section">
          <button className="nards-dock-item">
            <span className="icon">🔳</span>
            <span className="label">Nards</span>
          </button>
          <button className="nards-dock-item">
            <span className="icon">〰️</span>
            <span className="label">Lines</span>
          </button>
        </div>

        <div className="nards-dock-divider"></div>

        <div className="nards-dock-section">
          <button className="nards-dock-item timeline">
            <span className="icon">⏪</span>
            <span className="label">History</span>
          </button>
        </div>

      </nav>
    </div>
  );
};

export default GlobalDock;

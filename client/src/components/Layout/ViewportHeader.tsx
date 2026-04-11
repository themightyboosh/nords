import React from 'react';
import './ViewportHeader.css';

const ViewportHeader: React.FC = () => {
  return (
    <header className="nards-viewport-header nards-glass">
      <div className="nards-header-left">
        <div className="nards-logo">⬡ Nards</div>
        <div className="nards-project-title">
          <h1>Product Launch Q3</h1>
          <span className="nards-snapshot-badge">🔴 Live State</span>
        </div>
      </div>
      
      <div className="nards-header-center">
        <button className="nards-gravity-button">✨ Summarize This View</button>
      </div>

      <div className="nards-header-right">
        <div className="nards-activity-pulse">
          <span className="pulse-dot"></span>
          <span>3 changes</span>
        </div>
        <div className="nards-avatars">
          <div className="nards-avatar" title="Daniel" style={{ background: '#FF5630' }}>D</div>
          <div className="nards-avatar" title="Sarah" style={{ background: '#36B37E' }}>S</div>
        </div>
        <button className="nards-icon-button">⚙️</button>
      </div>
    </header>
  );
};

export default ViewportHeader;

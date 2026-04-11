import React from 'react';
import './ViewportHeader.css';

const ViewportHeader: React.FC = () => {
  return (
    <header className="nards-viewport-header nards-glass">
      <div className="nards-viewport-header__left">
        <div className="nards-viewport-header__logo">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M10 1L18.66 6V14L10 19L1.34 14V6L10 1Z" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.9"/>
            <circle cx="10" cy="10" r="3" fill="var(--nards-color-accent)" opacity="0.8"/>
          </svg>
          <span className="nards-viewport-header__wordmark">nards</span>
        </div>
        <div className="nards-viewport-header__divider" />
        <div className="nards-viewport-header__project">
          <span className="nards-viewport-header__project-name">Product Launch Q3</span>
          <span className="nards-viewport-header__snapshot-indicator">
            <span className="nards-viewport-header__live-dot" />
            Live
          </span>
        </div>
      </div>

      <div className="nards-viewport-header__right">
        <button className="nards-viewport-header__action-btn nards-viewport-header__action-btn--gravity">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v14M1 8h14M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
          </svg>
          Summarize
        </button>

        <div className="nards-viewport-header__activity">
          <span className="nards-viewport-header__activity-pulse" />
          <span className="nards-viewport-header__activity-count">3</span>
        </div>

        <div className="nards-viewport-header__avatars">
          <div className="nards-viewport-header__avatar" style={{ backgroundColor: '#4da6ff' }}>D</div>
          <div className="nards-viewport-header__avatar" style={{ backgroundColor: '#34d399' }}>S</div>
          <div className="nards-viewport-header__avatar nards-viewport-header__avatar--ai" style={{ backgroundColor: '#a78bfa' }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a1 1 0 011 1v2.07A6.003 6.003 0 0113.93 8H16a1 1 0 110 2h-2.07A6.003 6.003 0 019 14.93V16a1 1 0 11-2 0v-1.07A6.003 6.003 0 012.07 10H0a1 1 0 110-2h2.07A6.003 6.003 0 017 3.07V1a1 1 0 011-1zm0 5a3 3 0 100 6 3 3 0 000-6z"/>
            </svg>
          </div>
        </div>

        <button className="nards-viewport-header__icon-btn" aria-label="Settings">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </header>
  );
};

export default ViewportHeader;

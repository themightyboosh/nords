import React from 'react';
import { Sparkles, Settings, Activity } from 'lucide-react';
import NardsLogo from '../NardsLogo';
import ThemeSwitcher from '../ThemeSwitcher/ThemeSwitcher';
import './ViewportHeader.css';

interface ViewportHeaderProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

const ViewportHeader: React.FC<ViewportHeaderProps> = ({ currentTheme, onThemeChange }) => {
  return (
    <header className="nards-viewport-header nards-glass">
      <div className="nards-viewport-header__left">
        <div className="nards-viewport-header__logo">
          <NardsLogo size={16} />
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
        <button className="nards-viewport-header__action-btn">
          <Sparkles size={12} />
          Summarize
        </button>

        <div className="nards-viewport-header__activity">
          <Activity size={12} />
          <span className="nards-viewport-header__activity-count">3</span>
        </div>

        <div className="nards-viewport-header__avatars">
          <div className="nards-viewport-header__avatar" style={{ backgroundColor: '#2563eb' }}>D</div>
          <div className="nards-viewport-header__avatar" style={{ backgroundColor: '#059669' }}>S</div>
        </div>

        <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />

        <button className="nards-viewport-header__icon-btn" aria-label="Settings">
          <Settings size={15} strokeWidth={1.6} />
        </button>
      </div>
    </header>
  );
};

export default ViewportHeader;

import React from 'react';
import {
  Settings, Activity, ChevronDown,
  FolderKanban, Bell,
} from 'lucide-react';
import NardsLogo from '../NardsLogo';
import ThemeSwitcher from '../ThemeSwitcher/ThemeSwitcher';
import './ViewportHeader.css';

interface ViewportHeaderProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  onOpenSettings?: () => void;
}

const ViewportHeader: React.FC<ViewportHeaderProps> = ({ currentTheme, onThemeChange, onOpenSettings }) => {
  return (
    <header className="nards-viewport-header nards-glass">
      {/* ═══ Left: Project ═══ */}
      <div className="nards-viewport-header__left">
        <button className="nards-viewport-header__project-btn">
          <FolderKanban size={13} strokeWidth={1.6} />
          <div className="nards-viewport-header__project">
            <span className="nards-viewport-header__project-name">Product Launch Q3</span>
            <span className="nards-viewport-header__snapshot-indicator">
              <span className="nards-viewport-header__live-dot" />
              Live
            </span>
          </div>
          <ChevronDown size={10} className="nards-viewport-header__project-chevron" />
        </button>
      </div>

      {/* ═══ Center: Logo ═══ */}
      <div className="nards-viewport-header__center">
        <div className="nards-viewport-header__logo">
          <NardsLogo size={22} />
          <span className="nards-viewport-header__wordmark">nards</span>
        </div>
      </div>

      {/* ═══ Right: Activity + Avatars + User ═══ */}
      <div className="nards-viewport-header__right">
        <button className="nards-viewport-header__icon-btn" aria-label="Notifications" title="Notifications">
          <Bell size={15} strokeWidth={1.6} />
          <span className="nards-viewport-header__notification-badge">2</span>
        </button>

        <div className="nards-viewport-header__activity" title="3 changes off-screen">
          <Activity size={12} />
          <span className="nards-viewport-header__activity-count">3</span>
        </div>

        <div className="nards-viewport-header__divider" />

        {/* Multiplayer avatars */}
        <div className="nards-viewport-header__avatars">
          <div className="nards-viewport-header__avatar" style={{ backgroundColor: '#059669' }} title="Sarah Chen">S</div>
        </div>

        <div className="nards-viewport-header__divider" />

        <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />

        <button className="nards-viewport-header__icon-btn" aria-label="Project Settings" title="Project Settings" onClick={onOpenSettings}>
          <Settings size={15} strokeWidth={1.6} />
        </button>

        {/* User account menu */}
        <button className="nards-viewport-header__user-btn" title="Daniel Crowder — Account">
          <div className="nards-viewport-header__avatar nards-viewport-header__avatar--self" style={{ backgroundColor: '#2563eb' }}>D</div>
          <ChevronDown size={10} />
        </button>
      </div>
    </header>
  );
};

export default ViewportHeader;

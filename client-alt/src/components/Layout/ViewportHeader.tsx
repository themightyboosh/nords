import React from 'react';
import {
  Settings, Activity, ChevronDown,
  FolderKanban, Bell,
} from 'lucide-react';
import NordsLogo from '../NordsLogo';
import ThemeSwitcher from '../ThemeSwitcher/ThemeSwitcher';
import './ViewportHeader.css';

interface ViewportHeaderProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  onOpenSettings?: () => void;
}

const ViewportHeader: React.FC<ViewportHeaderProps> = ({ currentTheme, onThemeChange, onOpenSettings }) => {
  return (
    <header className="nords-viewport-header nords-glass">
      {/* ═══ Left: Project ═══ */}
      <div className="nords-viewport-header__left">
        <button className="nords-viewport-header__project-btn">
          <FolderKanban size={13} strokeWidth={1.6} />
          <div className="nords-viewport-header__project">
            <span className="nords-viewport-header__project-name">Product Launch Q3</span>
            <span className="nords-viewport-header__snapshot-indicator">
              <span className="nords-viewport-header__live-dot" />
              Live
            </span>
          </div>
          <ChevronDown size={10} className="nords-viewport-header__project-chevron" />
        </button>
      </div>

      {/* ═══ Center: Logo ═══ */}
      <div className="nords-viewport-header__center">
        <div className="nords-viewport-header__logo">
          <NordsLogo size={22} />
          <span className="nords-viewport-header__wordmark">nords</span>
          <span className="nords-viewport-header__tagline">Node Cards</span>
        </div>
      </div>

      {/* ═══ Right: Activity + Avatars + User ═══ */}
      <div className="nords-viewport-header__right">
        <button className="nords-viewport-header__icon-btn" aria-label="Notifications" title="Notifications">
          <Bell size={15} strokeWidth={1.6} />
          <span className="nords-viewport-header__notification-badge">2</span>
        </button>

        <div className="nords-viewport-header__activity" title="3 changes off-screen">
          <Activity size={12} />
          <span className="nords-viewport-header__activity-count">3</span>
        </div>

        <div className="nords-viewport-header__divider" />

        {/* Multiplayer avatars */}
        <div className="nords-viewport-header__avatars">
          <div className="nords-viewport-header__avatar" style={{ backgroundColor: '#059669' }} title="Sarah Chen">S</div>
        </div>

        <div className="nords-viewport-header__divider" />

        <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />

        <button className="nords-viewport-header__icon-btn" aria-label="Project Settings" title="Project Settings" onClick={onOpenSettings}>
          <Settings size={15} strokeWidth={1.6} />
        </button>

        {/* User account menu */}
        <button className="nords-viewport-header__user-btn" title="Daniel Crowder — Account">
          <div className="nords-viewport-header__avatar nords-viewport-header__avatar--self" style={{ backgroundColor: '#2563eb' }}>D</div>
          <ChevronDown size={10} />
        </button>
      </div>
    </header>
  );
};

export default ViewportHeader;

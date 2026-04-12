/**
 * ViewportHeader.tsx — Top Navigation Bar
 *
 * Full-width floating bar at the top of the workspace.
 *
 * Desktop (>768px):
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  [⊞ Product Launch Q3 ●Live ▾]    ◈ nords    🔔 ⚡3 | S 🎨 ⚙ D▾ │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Mobile (≤768px):
 *   ┌──────────────────────────────────────┐
 *   │  Product Launch Q3 ●Live         ☰  │
 *   └──────────────────────────────────────┘
 *   Hamburger opens a slide-down menu with all right-side controls.
 *
 * @see docs/frontend/04_ui_and_interactions.md §1.1 Viewport Header
 */

import React, { useState } from 'react';
import {
  Settings, Activity, ChevronDown, Menu, X,
  FolderKanban, Bell, User,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="nords-viewport-header nords-glass">

      {/* ═══ Left: Project Switcher ═══ */}
      <div className="nords-viewport-header__left">
        <button className="nords-viewport-header__project-btn">
          <FolderKanban size={18} strokeWidth={1.6} />
          <div className="nords-viewport-header__project">
            <span className="nords-viewport-header__project-name">Product Launch Q3</span>
          </div>
          <ChevronDown size={10} className="nords-viewport-header__project-chevron" />
        </button>
      </div>

      {/* ═══ Center: Logo + Wordmark (hidden on mobile) ═══ */}
      <div className="nords-viewport-header__center">
        <div className="nords-viewport-header__logo">
          <NordsLogo size={28} />
          <span className="nords-viewport-header__wordmark">nords</span>
          <span className="nords-viewport-header__tagline">Monumental Node Cards</span>
        </div>
      </div>

      {/* ═══ Right: Desktop controls + Mobile hamburger ═══ */}
      <div className="nords-viewport-header__right">
        {/* Desktop-only controls (hidden ≤768px via CSS) */}
        <button className="nords-viewport-header__icon-btn" aria-label="Notifications" title="Notifications">
          <Bell size={15} strokeWidth={1.6} />
          <span className="nords-viewport-header__notification-badge">2</span>
        </button>

        <div className="nords-viewport-header__activity" title="3 changes off-screen">
          <Activity size={12} />
          <span className="nords-viewport-header__activity-count">3</span>
        </div>

        <div className="nords-viewport-header__divider" />

        <div className="nords-viewport-header__avatars">
          <div className="nords-viewport-header__avatar" style={{ backgroundColor: '#059669' }} title="Sarah Chen">S</div>
        </div>

        <div className="nords-viewport-header__divider" />

        <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />

        <button className="nords-viewport-header__icon-btn" aria-label="Project Settings" title="Project Settings" onClick={onOpenSettings}>
          <Settings size={15} strokeWidth={1.6} />
        </button>

        <button className="nords-viewport-header__user-btn" title="Daniel Crowder — Account">
          <div className="nords-viewport-header__avatar nords-viewport-header__avatar--self" style={{ backgroundColor: '#2563eb' }}>D</div>
          <ChevronDown size={10} />
        </button>

        {/* Mobile hamburger button (visible ≤768px via CSS) */}
        <button
          className="nords-viewport-header__hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ═══ Mobile slide-down menu (visible ≤768px when open) ═══ */}
      <div className={`nords-viewport-header__mobile-menu ${mobileMenuOpen ? 'is-open' : ''}`}>
        <button className="nords-viewport-header__mobile-menu-item">
          <Bell size={14} strokeWidth={1.6} />
          <span>Notifications</span>
          <span className="nords-viewport-header__notification-badge" style={{ position: 'static' }}>2</span>
        </button>
        <button className="nords-viewport-header__mobile-menu-item">
          <Activity size={14} strokeWidth={1.6} />
          <span>Activity (3 changes)</span>
        </button>
        <div style={{ padding: '0 8px' }}>
          <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />
        </div>
        <button className="nords-viewport-header__mobile-menu-item" onClick={() => { onOpenSettings?.(); setMobileMenuOpen(false); }}>
          <Settings size={14} strokeWidth={1.6} />
          <span>Project Settings</span>
        </button>
        <button className="nords-viewport-header__mobile-menu-item">
          <User size={14} strokeWidth={1.6} />
          <span>Account</span>
        </button>
      </div>
    </header>
  );
};

export default ViewportHeader;

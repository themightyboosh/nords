/**
 * ViewportHeader.tsx — Top Navigation Bar
 *
 * Full-width floating bar at the top of the workspace.
 * Three-zone CSS grid layout: Project Switcher | Brand Logo | User Controls.
 *
 * Production version: wires useAuth() for real user data,
 * adds data-testid attributes, supports logout.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, Activity, ChevronDown, Menu, X,
  FolderKanban, Bell, User, LogOut,
  MessageSquare, Camera, Settings2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NordsLogo from '../NordsLogo';
import ThemeSwitcher from '../ThemeSwitcher/ThemeSwitcher';
import './ViewportHeader.css';

interface ViewportHeaderProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  onOpenSettings?: () => void;
  onOpenComments?: () => void;
  onOpenSnapshots?: () => void;
}

export default function ViewportHeader({ currentTheme, onThemeChange, onOpenSettings, onOpenComments, onOpenSnapshots }: ViewportHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="nords-viewport-header nords-glass" data-testid="viewport-header">

      {/* ═══ Left: Project Switcher ═══ */}
      <div className="nords-viewport-header__left">
        <button 
          className="nords-viewport-header__project-btn" 
          data-testid="project-switcher-btn"
          onClick={() => navigate('/projects')}
          title="Back to Projects"
        >
          <FolderKanban size={18} strokeWidth={1.6} />
          <div className="nords-viewport-header__project">
            <span className="nords-viewport-header__project-name">Product Launch Q3</span>
          </div>
          <ChevronDown size={10} className="nords-viewport-header__project-chevron" />
        </button>

        {/* Project-level tools — right of title to free dock space */}
        <div className="nords-viewport-header__project-tools">
          <button
            className="nords-viewport-header__tool-btn"
            title="Manage Types"
            onClick={onOpenSettings}
            data-testid="header-manage-types"
          >
            <Settings2 size={14} strokeWidth={1.6} />
            <span>Types</span>
          </button>
          <button
            className="nords-viewport-header__tool-btn"
            title="Comments"
            onClick={onOpenComments}
            data-testid="header-comments"
          >
            <MessageSquare size={14} strokeWidth={1.6} />
            <span>Comments</span>
          </button>
          <button
            className="nords-viewport-header__tool-btn"
            title="Snapshots"
            onClick={onOpenSnapshots}
            data-testid="header-snapshots"
          >
            <Camera size={14} strokeWidth={1.6} />
            <span>Snapshots</span>
          </button>
        </div>
      </div>

      {/* ═══ Center: Logo + Wordmark (hidden on mobile) ═══ */}
      <div className="nords-viewport-header__center">
        <div className="nords-viewport-header__branding">
          <NordsLogo size={20} />
        </div>
        <span className="nords-viewport-header__tagline">Monumental Node Cards</span>
      </div>

      {/* ═══ Right: Desktop controls + Mobile hamburger ═══ */}
      <div className="nords-viewport-header__right">
        <button className="nords-viewport-header__icon-btn" aria-label="Notifications" title="Notifications" data-testid="notifications-btn">
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

        <button className="nords-viewport-header__icon-btn" aria-label="Project Settings" title="Project Settings" onClick={onOpenSettings} data-testid="settings-btn">
          <Settings size={15} strokeWidth={1.6} />
        </button>

        <div style={{ position: 'relative' }}>
          <button
            className="nords-viewport-header__user-btn"
            title={`${displayName} — Account`}
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            data-testid="user-menu-btn"
          >
            <div className="nords-viewport-header__avatar nords-viewport-header__avatar--self" style={{ backgroundColor: '#2563eb' }}>{initial}</div>
            <ChevronDown size={10} />
          </button>

          {userDropdownOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setUserDropdownOpen(false)} />
              <div className="nords-viewport-header__user-dropdown" data-testid="user-dropdown" style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                background: 'var(--nords-glass-bg)', backdropFilter: 'blur(var(--nords-glass-blur))',
                border: '1px solid var(--nords-color-border-default)', borderRadius: 'var(--nords-radius-lg)',
                padding: '4px', minWidth: '160px', zIndex: 200,
                boxShadow: 'var(--nords-shadow-lg)',
              }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--nords-color-border-subtle)' }}>
                  <div style={{ fontSize: 'var(--nords-font-size-sm)', fontWeight: 600, color: 'var(--nords-color-text-primary)' }}>{displayName}</div>
                  <div style={{ fontSize: 'var(--nords-font-size-xs)', color: 'var(--nords-color-text-tertiary)' }}>{user?.email}</div>
                </div>
                <button
                  onClick={() => { setUserDropdownOpen(false); onOpenSettings?.(); }}
                  data-testid="dropdown-settings"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                    padding: '8px 12px', background: 'transparent', border: 'none',
                    color: 'var(--nords-color-text-secondary)', cursor: 'pointer',
                    fontSize: 'var(--nords-font-size-sm)', borderRadius: 'var(--nords-radius-sm)',
                  }}
                >
                  <User size={14} /> Profile
                </button>
                <button
                  onClick={handleLogout}
                  data-testid="dropdown-logout"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                    padding: '8px 12px', background: 'transparent', border: 'none',
                    color: 'var(--nords-color-danger, #ef4444)', cursor: 'pointer',
                    fontSize: 'var(--nords-font-size-sm)', borderRadius: 'var(--nords-radius-sm)',
                  }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>

        {/* Mobile hamburger button (visible ≤768px via CSS) */}
        <button
          className="nords-viewport-header__hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
          data-testid="mobile-menu-btn"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ═══ Mobile slide-down menu (visible ≤768px when open) ═══ */}
      <div className={`nords-viewport-header__mobile-menu ${mobileMenuOpen ? 'is-open' : ''}`}>
        {/* Project tools — hidden in desktop header on mobile, accessible here */}
        <button className="nords-viewport-header__mobile-menu-item" onClick={() => { onOpenSettings?.(); setMobileMenuOpen(false); }}>
          <Settings2 size={14} strokeWidth={1.6} />
          <span>Manage Types</span>
        </button>
        <button className="nords-viewport-header__mobile-menu-item" onClick={() => { onOpenComments?.(); setMobileMenuOpen(false); }}>
          <MessageSquare size={14} strokeWidth={1.6} />
          <span>Comments</span>
        </button>
        <button className="nords-viewport-header__mobile-menu-item" onClick={() => { onOpenSnapshots?.(); setMobileMenuOpen(false); }}>
          <Camera size={14} strokeWidth={1.6} />
          <span>Snapshots</span>
        </button>
        <div className="nords-context-menu__divider" style={{ margin: '4px 12px', height: '1px', background: 'var(--nords-color-border-subtle)' }} />
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
        <button className="nords-viewport-header__mobile-menu-item" onClick={handleLogout}>
          <LogOut size={14} strokeWidth={1.6} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}

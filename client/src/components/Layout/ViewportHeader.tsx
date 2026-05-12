/**
 * ViewportHeader.tsx — Top Navigation Bar
 *
 * Full-width floating bar at the top of the workspace.
 * Three-zone CSS grid layout:
 *   Left:   Logo (→ Projects) | Nords | Categories | Personas
 *   Center: Project Title (→ TBD settings panel)
 *   Right:  Theme Switcher | User Controls
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, Menu, X,
  LogOut, User,
  Box, Link2, Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NordsLogo from '../NordsLogo';
import ThemeSwitcher from '../ThemeSwitcher/ThemeSwitcher';
import './ViewportHeader.css';

interface ViewportHeaderProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  onOpenNordTypes?: () => void;
  onOpenCategoryTypes?: () => void;
  onOpenPersonas?: () => void;
  onOpenSettings?: () => void;
  /** Project name displayed in the center; clicking opens TBD settings */
  projectName?: string;
  /** 'workspace' (default) = full nav; 'dashboard' = logo + center title only */
  mode?: 'workspace' | 'dashboard';
}

export default function ViewportHeader({
  currentTheme, onThemeChange,
  onOpenNordTypes, onOpenCategoryTypes, onOpenPersonas, onOpenSettings,
  projectName = 'Product Launch Q3',
  mode = 'workspace',
}: ViewportHeaderProps) {
  const isDashboard = mode === 'dashboard';
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

      {/* ═══ Left: Logo + Nav Items ═══ */}
      <div className="nords-viewport-header__left">
        {/* Logo — navigates back to Projects dashboard */}
        <button
          className="nords-viewport-header__logo-btn"
          data-testid="logo-projects-btn"
          onClick={() => navigate('/projects')}
          title="Back to Projects"
        >
          <NordsLogo size={22} />
        </button>

        {/* Top-level navigation items — only in workspace mode */}
        {!isDashboard && (
          <div className="nords-viewport-header__nav">
            {onOpenNordTypes && (
              <button
                className="nords-viewport-header__nav-item"
                title="Manage Nord Types"
                onClick={onOpenNordTypes}
                data-testid="header-nords"
              >
                <Box size={14} strokeWidth={1.6} />
                <span>Nords</span>
              </button>
            )}
            {onOpenCategoryTypes && (
              <button
                className="nords-viewport-header__nav-item"
                title="Manage Categories (Connection Types)"
                onClick={onOpenCategoryTypes}
                data-testid="header-categories"
              >
                <Link2 size={14} strokeWidth={1.6} />
                <span>Categories</span>
              </button>
            )}
            {onOpenPersonas && (
              <button
                className="nords-viewport-header__nav-item"
                title="Personas"
                onClick={onOpenPersonas}
                data-testid="header-personas"
              >
                <Users size={14} strokeWidth={1.6} />
                <span>Personas</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ═══ Center: Project Title / Dashboard Title ═══ */}
      <div className="nords-viewport-header__center">
        {isDashboard ? (
          <span className="nords-viewport-header__project-title nords-viewport-header__project-title--static">
            Projects
          </span>
        ) : (
          <button
            className="nords-viewport-header__project-title"
            onClick={onOpenSettings}
            title="Project Settings"
            data-testid="project-title-btn"
          >
            <span>{projectName}</span>
          </button>
        )}
      </div>

      {/* ═══ Right: Theme + User ═══ */}
      <div className="nords-viewport-header__right">
        <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />

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
        <button className="nords-viewport-header__mobile-menu-item" onClick={() => { onOpenNordTypes?.(); setMobileMenuOpen(false); }}>
          <Box size={14} strokeWidth={1.6} />
          <span>Nords</span>
        </button>
        <button className="nords-viewport-header__mobile-menu-item" onClick={() => { onOpenCategoryTypes?.(); setMobileMenuOpen(false); }}>
          <Link2 size={14} strokeWidth={1.6} />
          <span>Categories</span>
        </button>
        <button className="nords-viewport-header__mobile-menu-item" onClick={() => { onOpenPersonas?.(); setMobileMenuOpen(false); }}>
          <Users size={14} strokeWidth={1.6} />
          <span>Personas</span>
        </button>
        <div className="nords-context-menu__divider" style={{ margin: '4px 12px', height: '1px', background: 'var(--nords-color-border-subtle)' }} />
        <div style={{ padding: '0 8px' }}>
          <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />
        </div>
        <button className="nords-viewport-header__mobile-menu-item" onClick={handleLogout}>
          <LogOut size={14} strokeWidth={1.6} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}

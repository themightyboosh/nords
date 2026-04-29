/**
 * ViewportHeader.tsx — Top Navigation Bar
 *
 * Full-width floating bar at the top of the workspace.
 * Three-zone CSS grid layout: Project Switcher | Brand Logo | User Controls.
 *
 * Header items: Nords | Categories | Personas | Settings
 * (Personas and Settings are placeholder for now)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, Menu, X,
  FolderKanban, LogOut, User,
  Box, Link2, Users, Settings,
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
}

export default function ViewportHeader({
  currentTheme, onThemeChange,
  onOpenNordTypes, onOpenCategoryTypes, onOpenPersonas, onOpenSettings,
}: ViewportHeaderProps) {
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

      {/* ═══ Left: Project Switcher + Top-level nav ═══ */}
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

        {/* Top-level navigation items */}
        <div className="nords-viewport-header__project-tools">
          <button
            className="nords-viewport-header__tool-btn"
            title="Manage Nord Types"
            onClick={onOpenNordTypes}
            data-testid="header-nords"
          >
            <Box size={14} strokeWidth={1.6} />
            <span>Nords</span>
          </button>
          <button
            className="nords-viewport-header__tool-btn"
            title="Manage Categories (Connection Types)"
            onClick={onOpenCategoryTypes}
            data-testid="header-categories"
          >
            <Link2 size={14} strokeWidth={1.6} />
            <span>Categories</span>
          </button>
          <button
            className="nords-viewport-header__tool-btn"
            title="Personas"
            onClick={onOpenPersonas}
            data-testid="header-personas"
          >
            <Users size={14} strokeWidth={1.6} />
            <span>Personas</span>
          </button>
          <button
            className="nords-viewport-header__tool-btn"
            title="Project Settings"
            onClick={onOpenSettings}
            data-testid="header-settings"
          >
            <Settings size={14} strokeWidth={1.6} />
            <span>Settings</span>
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
        <button className="nords-viewport-header__mobile-menu-item" onClick={() => { onOpenSettings?.(); setMobileMenuOpen(false); }}>
          <Settings size={14} strokeWidth={1.6} />
          <span>Settings</span>
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

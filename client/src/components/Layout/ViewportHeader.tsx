/**
 * ViewportHeader.tsx — Single-row top bar with icon-group flyouts
 *
 * Layout:  Logo | PROJECT TITLE | 🔧 🧠 🔬 🚀  ·····  🎨 👤
 *
 * Click a group icon → flyout shows sub-tabs beneath it.
 * Click again or click away → flyout closes.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, Menu, X,
  LogOut, User, Settings,
  Box, Link2, Users, Eye, Target, FlaskConical, Variable, Activity,
  Ruler, Brain, Microscope, Rocket,
  Share2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { resolveIcon } from '../../utils/iconRegistry';
import NordsLogo from '../NordsLogo';
import ThemeSwitcher from '../ThemeSwitcher/ThemeSwitcher';
import './ViewportHeader.css';

type NavGroup = 'design' | 'behavior' | 'test' | 'publish';

interface ViewportHeaderProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  onOpenNordTypes?: () => void;
  onOpenCategoryTypes?: () => void;
  onOpenPersonas?: () => void;
  onOpenVariables?: () => void;
  onOpenGoals?: () => void;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
  onOpenPreview?: () => void;
  onOpenTestRunner?: () => void;
  onOpenSessions?: () => void;
  onOpenShare?: () => void;
  projectName?: string;
  projectIcon?: string | null;
  projectColor?: string | null;
  graphOnly?: boolean;
  mode?: 'workspace' | 'dashboard';
}

interface SubItem {
  label: string;
  icon: typeof Box;
  onClick?: () => void;
  testId: string;
}

export default function ViewportHeader({
  currentTheme, onThemeChange,
  onOpenNordTypes, onOpenCategoryTypes, onOpenPersonas, onOpenVariables,
  onOpenGoals, onOpenSettings, onOpenProfile, onOpenPreview,
  onOpenTestRunner, onOpenSessions, onOpenShare,
  projectName = 'Product Launch Q3',
  projectIcon = null,
  projectColor = null,
  graphOnly = false,
  mode = 'workspace',
}: ViewportHeaderProps) {
  const isDashboard = mode === 'dashboard';
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [openGroup, setOpenGroup] = useState<NavGroup | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const flyoutRef = useRef<HTMLDivElement>(null);
  const groupBtnsRef = useRef<Record<string, HTMLButtonElement | null>>({});

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  // Close flyout on outside click
  useEffect(() => {
    if (!openGroup) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (flyoutRef.current?.contains(target)) return;
      // Check if click was on one of the group buttons
      for (const btn of Object.values(groupBtnsRef.current)) {
        if (btn?.contains(target)) return;
      }
      setOpenGroup(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openGroup]);

  const toggleGroup = useCallback((group: NavGroup) => {
    setOpenGroup(prev => prev === group ? null : group);
    setUserDropdownOpen(false);
  }, []);

  const handleSubClick = useCallback((fn?: () => void) => {
    fn?.();
    setOpenGroup(null);
  }, []);

  const handleLogout = async () => { await logout(); };

  // ── Build sub-items for each group ──
  const groups: { key: NavGroup; label: string; icon: typeof Ruler; items: SubItem[] }[] = [
    {
      key: 'design', label: 'Design', icon: Ruler,
      items: [
        { label: 'Types', icon: Box, onClick: onOpenNordTypes, testId: 'header-nords' },
        { label: 'Categories', icon: Link2, onClick: onOpenCategoryTypes, testId: 'header-categories' },
      ],
    },
    {
      key: 'behavior', label: 'Behavior', icon: Brain,
      items: [
        { label: 'Personas', icon: Users, onClick: onOpenPersonas, testId: 'header-personas' },
        ...(!graphOnly ? [
          { label: 'Goals', icon: Target, onClick: onOpenGoals, testId: 'header-goals' },
          { label: 'Collections', icon: Variable, onClick: onOpenVariables, testId: 'header-variables' },
        ] : []),
      ],
    },
    {
      key: 'test', label: 'Test', icon: Microscope,
      items: [
        { label: 'Preview', icon: Eye, onClick: onOpenPreview, testId: 'header-preview' },
        { label: 'Test', icon: FlaskConical, onClick: onOpenTestRunner, testId: 'header-test-runner' },
        { label: 'Sessions', icon: Activity, onClick: onOpenSessions, testId: 'header-sessions' },
      ],
    },
    {
      key: 'publish', label: 'Publish', icon: Rocket,
      items: [
        { label: 'Share', icon: Share2, onClick: onOpenShare, testId: 'header-share' },
        { label: 'Settings', icon: Settings, onClick: onOpenSettings, testId: 'header-settings' },
      ],
    },
  ];

  return (
    <header className="nords-viewport-header nords-glass" data-testid="viewport-header">
      <div className="nords-viewport-header__row">

        {/* ── Left: Logo ── */}
        <button
          className="nords-viewport-header__logo-btn"
          data-testid="logo-projects-btn"
          onClick={() => navigate('/projects')}
          title="Back to Projects"
        >
          <NordsLogo size={22} />
        </button>

        {/* ── Project title ── */}
        <span className="nords-viewport-header__project-title" data-testid="project-title-display">
          {isDashboard ? 'Projects' : (
            <>
              {(() => {
                const ProjectIcon = resolveIcon(projectIcon);
                return (
                  <span
                    className="nords-viewport-header__project-icon"
                    style={{ color: projectColor || 'var(--nords-color-accent)' }}
                  >
                    <ProjectIcon size={14} strokeWidth={1.8} />
                  </span>
                );
              })()}
              <span style={{ color: projectColor || undefined }}>{projectName}</span>
            </>
          )}
        </span>

        {/* ── Nav groups ── */}
        {!isDashboard && (
          <div className="nords-viewport-header__groups">
            {groups.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                ref={el => { groupBtnsRef.current[key] = el; }}
                className={`nords-viewport-header__group-btn ${openGroup === key ? 'is-open' : ''}`}
                onClick={() => toggleGroup(key)}
                title={label}
                data-testid={`header-group-${key}`}
              >
                <Icon size={15} strokeWidth={1.6} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Right: Theme + User ── */}
        <div className="nords-viewport-header__right">
          {/* <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} /> */}

          <div style={{ position: 'relative' }}>
            <button
              className="nords-viewport-header__user-btn"
              title={`${displayName} — Account`}
              onClick={() => { setUserDropdownOpen(!userDropdownOpen); setOpenGroup(null); }}
              data-testid="user-menu-btn"
            >
              <div className="nords-viewport-header__avatar" style={{ backgroundColor: '#2563eb' }}>{initial}</div>
              <ChevronDown size={10} />
            </button>

            {userDropdownOpen && (
              <>
                <div className="nords-viewport-header__backdrop" onClick={() => setUserDropdownOpen(false)} />
                <div className="nords-viewport-header__dropdown" data-testid="user-dropdown">
                  <div className="nords-viewport-header__dropdown-header">
                    <div className="nords-viewport-header__dropdown-name">{displayName}</div>
                    <div className="nords-viewport-header__dropdown-email">{user?.email}</div>
                  </div>
                  <button className="nords-viewport-header__dropdown-item" onClick={() => { setUserDropdownOpen(false); onOpenProfile?.(); }} data-testid="dropdown-profile">
                    <User size={14} /> Profile
                  </button>


                  <button className="nords-viewport-header__dropdown-item nords-viewport-header__dropdown-item--danger" onClick={handleLogout} data-testid="dropdown-logout">
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            className="nords-viewport-header__hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
            data-testid="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ═══ Flyout — anchored below the active group button ═══ */}
      {openGroup && !isDashboard && (() => {
        const group = groups.find(g => g.key === openGroup)!;
        const btn = groupBtnsRef.current[openGroup];
        const flyoutLeft = btn ? btn.offsetLeft : 0;
        return (
          <div
            ref={flyoutRef}
            className="nords-viewport-header__flyout"
            style={{ left: flyoutLeft }}
            data-testid={`flyout-${openGroup}`}
          >

            {group.items.map(item => (
              <button
                key={item.testId}
                className="nords-viewport-header__flyout-item"
                onClick={() => handleSubClick(item.onClick)}
                data-testid={item.testId}
              >
                <item.icon size={14} strokeWidth={1.6} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        );
      })()}

      {/* ═══ Mobile slide-down menu ═══ */}
      <div className={`nords-viewport-header__mobile-menu ${mobileMenuOpen ? 'is-open' : ''}`}>
        {groups.map(({ key, label, items }) => (
          <div key={key}>
            <div className="nords-viewport-header__mobile-group-label">{label}</div>
            {items.map(item => (
              <button
                key={item.testId}
                className="nords-viewport-header__mobile-menu-item"
                onClick={() => { item.onClick?.(); setMobileMenuOpen(false); }}
              >
                <item.icon size={14} strokeWidth={1.6} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
        <div style={{ margin: '4px 12px', height: '1px', background: 'var(--nords-color-border-subtle)' }} />
        <div style={{ padding: '0 8px' }}>
          {/* <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} /> */}
        </div>
        <button className="nords-viewport-header__mobile-menu-item" onClick={handleLogout}>
          <LogOut size={14} strokeWidth={1.6} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}

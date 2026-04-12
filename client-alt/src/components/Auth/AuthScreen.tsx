/**
 * AuthScreen.tsx — Login / Sign Up / User Settings
 *
 * Three modes controlled by the `mode` prop:
 *   1. **login**: Email/password login + Google SSO
 *   2. **signup**: Create account form with name, email, password
 *   3. **settings**: User profile management (avatar, name, email, preferences)
 *
 * In production, these would integrate with Firebase Auth.
 * For the mock, they are static demonstrations of the UI.
 *
 * @see docs/architecture/01_vision_and_invariants.md §3 Authentication
 */

import React, { useState } from 'react';
import {
  Mail, Lock, User, Eye, EyeOff, LogOut, Camera,
  Moon, Sun, Bell, Shield, Trash2, ChevronRight,
} from 'lucide-react';
import NordsLogo from '../NordsLogo';
import './AuthScreen.css';

export type AuthMode = 'login' | 'signup' | 'settings';

interface AuthScreenProps {
  mode: AuthMode;
  onClose: () => void;
  /** Called when login/signup succeeds (mock: just closes the screen) */
  onAuthenticated?: () => void;
  /** Callback to switch between login ↔ signup */
  onSwitchMode?: (mode: AuthMode) => void;
  /** Current theme for the settings screen */
  currentTheme?: string;
  /** Theme change callback */
  onThemeChange?: (theme: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({
  mode,
  onClose,
  onAuthenticated,
  onSwitchMode,
  currentTheme = 'obsidian',
  onThemeChange,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [settingsSection, setSettingsSection] = useState<'profile' | 'preferences' | 'security' | 'danger'>('profile');

  /* ═══════════════════════════════════════════════════════════════ */
  /* LOGIN MODE                                                     */
  /* ═══════════════════════════════════════════════════════════════ */

  if (mode === 'login') {
    return (
      <div className="nords-auth-overlay">
        <div className="nords-auth-card">
          {/* Logo */}
          <div className="nords-auth__logo">
            <NordsLogo size={36} />
            <span className="nords-auth__wordmark">nords</span>
          </div>
          <p className="nords-auth__tagline">Spatial Relationship Engine</p>

          <h2 className="nords-auth__title">Welcome back</h2>

          {/* Google SSO */}
          <button className="nords-auth__sso-btn" type="button">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 01-1.8 2.71v2.26h2.92A8.78 8.78 0 0017.64 9.2z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 009 18z" fill="#34A853"/>
              <path d="M3.97 10.71A5.41 5.41 0 013.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 000 9c0 1.45.35 2.82.96 4.04l3.01-2.33z" fill="#FBBC05"/>
              <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 00.96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="nords-auth__divider">
            <span>or</span>
          </div>

          {/* Email / Password */}
          <form className="nords-auth__form" onSubmit={e => { e.preventDefault(); onAuthenticated?.(); }}>
            <div className="nords-auth__field">
              <label className="nords-auth__label" htmlFor="login-email">Email</label>
              <div className="nords-auth__input-wrap">
                <Mail size={14} strokeWidth={1.6} className="nords-auth__input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className="nords-auth__input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="nords-auth__field">
              <label className="nords-auth__label" htmlFor="login-password">Password</label>
              <div className="nords-auth__input-wrap">
                <Lock size={14} strokeWidth={1.6} className="nords-auth__input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="nords-auth__input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="nords-auth__reveal"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="nords-auth__actions">
              <a href="#" className="nords-auth__forgot">Forgot password?</a>
            </div>

            <button type="submit" className="nords-auth__submit">
              Sign In
            </button>
          </form>

          <p className="nords-auth__switch">
            Don&apos;t have an account?{' '}
            <button className="nords-auth__switch-btn" onClick={() => onSwitchMode?.('signup')}>
              Create one
            </button>
          </p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /* SIGNUP MODE                                                    */
  /* ═══════════════════════════════════════════════════════════════ */

  if (mode === 'signup') {
    return (
      <div className="nords-auth-overlay">
        <div className="nords-auth-card">
          {/* Logo */}
          <div className="nords-auth__logo">
            <NordsLogo size={36} />
            <span className="nords-auth__wordmark">nords</span>
          </div>
          <p className="nords-auth__tagline">Spatial Relationship Engine</p>

          <h2 className="nords-auth__title">Create your account</h2>

          {/* Google SSO */}
          <button className="nords-auth__sso-btn" type="button">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 01-1.8 2.71v2.26h2.92A8.78 8.78 0 0017.64 9.2z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 009 18z" fill="#34A853"/>
              <path d="M3.97 10.71A5.41 5.41 0 013.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 000 9c0 1.45.35 2.82.96 4.04l3.01-2.33z" fill="#FBBC05"/>
              <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 00.96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            <span>Sign up with Google</span>
          </button>

          <div className="nords-auth__divider">
            <span>or</span>
          </div>

          {/* Name / Email / Password */}
          <form className="nords-auth__form" onSubmit={e => { e.preventDefault(); onAuthenticated?.(); }}>
            <div className="nords-auth__field">
              <label className="nords-auth__label" htmlFor="signup-name">Full Name</label>
              <div className="nords-auth__input-wrap">
                <User size={14} strokeWidth={1.6} className="nords-auth__input-icon" />
                <input
                  id="signup-name"
                  type="text"
                  className="nords-auth__input"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="nords-auth__field">
              <label className="nords-auth__label" htmlFor="signup-email">Email</label>
              <div className="nords-auth__input-wrap">
                <Mail size={14} strokeWidth={1.6} className="nords-auth__input-icon" />
                <input
                  id="signup-email"
                  type="email"
                  className="nords-auth__input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="nords-auth__field">
              <label className="nords-auth__label" htmlFor="signup-password">Password</label>
              <div className="nords-auth__input-wrap">
                <Lock size={14} strokeWidth={1.6} className="nords-auth__input-icon" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  className="nords-auth__input"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="nords-auth__reveal"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="nords-auth__hint">Must be at least 8 characters</p>
            </div>

            <button type="submit" className="nords-auth__submit">
              Create Account
            </button>
          </form>

          <p className="nords-auth__switch">
            Already have an account?{' '}
            <button className="nords-auth__switch-btn" onClick={() => onSwitchMode?.('login')}>
              Sign in
            </button>
          </p>

          <p className="nords-auth__legal">
            By creating an account, you agree to our{' '}
            <a href="#">Terms of Service</a> and{' '}
            <a href="#">Privacy Policy</a>.
          </p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /* USER SETTINGS MODE                                             */
  /* ═══════════════════════════════════════════════════════════════ */

  const SETTINGS_SECTIONS = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'preferences', label: 'Preferences', icon: Sun },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'danger', label: 'Danger Zone', icon: Trash2 },
  ] as const;

  return (
    <div className="nords-auth-overlay nords-auth-overlay--settings">
      <div className="nords-settings-panel">
        {/* Header */}
        <header className="nords-settings__header">
          <h2 className="nords-settings__title">Account Settings</h2>
          <button className="nords-settings__close" onClick={onClose} aria-label="Close settings">✕</button>
        </header>

        <div className="nords-settings__body">
          {/* Sidebar */}
          <nav className="nords-settings__nav">
            {SETTINGS_SECTIONS.map(s => (
              <button
                key={s.key}
                className={`nords-settings__nav-btn ${settingsSection === s.key ? 'is-active' : ''} ${s.key === 'danger' ? 'is-danger' : ''}`}
                onClick={() => setSettingsSection(s.key)}
              >
                <s.icon size={14} strokeWidth={1.6} />
                <span>{s.label}</span>
              </button>
            ))}

            <div className="nords-settings__nav-spacer" />

            <button className="nords-settings__nav-btn is-danger" onClick={() => onSwitchMode?.('login')}>
              <LogOut size={14} strokeWidth={1.6} />
              <span>Log Out</span>
            </button>
          </nav>

          {/* Content */}
          <div className="nords-settings__content">

            {/* ── Profile ── */}
            {settingsSection === 'profile' && (
              <div className="nords-settings__section">
                <h3 className="nords-settings__section-title">Profile</h3>

                {/* Avatar */}
                <div className="nords-settings__avatar-area">
                  <div className="nords-settings__avatar">
                    <span className="nords-settings__avatar-initials">DC</span>
                    <button className="nords-settings__avatar-edit" aria-label="Change avatar">
                      <Camera size={12} strokeWidth={2} />
                    </button>
                  </div>
                  <div className="nords-settings__avatar-info">
                    <span className="nords-settings__avatar-name">Daniel Crowder</span>
                    <span className="nords-settings__avatar-email">daniel@nords.app</span>
                  </div>
                </div>

                <div className="nords-settings__divider" />

                {/* Editable fields */}
                <div className="nords-settings__field">
                  <label className="nords-settings__label">Display Name</label>
                  <input className="nords-settings__input" defaultValue="Daniel Crowder" />
                </div>
                <div className="nords-settings__field">
                  <label className="nords-settings__label">Email</label>
                  <input className="nords-settings__input" defaultValue="daniel@nords.app" type="email" />
                </div>
                <div className="nords-settings__field">
                  <label className="nords-settings__label">Role</label>
                  <input className="nords-settings__input" defaultValue="Admin" disabled />
                  <p className="nords-settings__hint">Role is managed by workspace administrators.</p>
                </div>

                <button className="nords-settings__save">Save Changes</button>
              </div>
            )}

            {/* ── Preferences ── */}
            {settingsSection === 'preferences' && (
              <div className="nords-settings__section">
                <h3 className="nords-settings__section-title">Preferences</h3>

                <div className="nords-settings__pref-row">
                  <div className="nords-settings__pref-info">
                    <span className="nords-settings__pref-label">Theme</span>
                    <span className="nords-settings__pref-desc">Choose your interface theme</span>
                  </div>
                  <div className="nords-settings__theme-picker">
                    {['obsidian', 'nebula', 'vapor', 'obsidian-light'].map(t => (
                      <button
                        key={t}
                        className={`nords-settings__theme-btn ${currentTheme === t ? 'is-active' : ''}`}
                        onClick={() => onThemeChange?.(t)}
                        title={t}
                      >
                        {t === 'obsidian-light' ? <Sun size={12} /> : <Moon size={12} />}
                        <span>{t.replace('-', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="nords-settings__divider" />

                <div className="nords-settings__pref-row">
                  <div className="nords-settings__pref-info">
                    <span className="nords-settings__pref-label">Notifications</span>
                    <span className="nords-settings__pref-desc">Email notifications for @mentions and comments</span>
                  </div>
                  <label className="nords-settings__toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="nords-settings__toggle-slider" />
                  </label>
                </div>

                <div className="nords-settings__pref-row">
                  <div className="nords-settings__pref-info">
                    <span className="nords-settings__pref-label">Sound Effects</span>
                    <span className="nords-settings__pref-desc">Play UI sounds on actions</span>
                  </div>
                  <label className="nords-settings__toggle">
                    <input type="checkbox" />
                    <span className="nords-settings__toggle-slider" />
                  </label>
                </div>

                <div className="nords-settings__pref-row">
                  <div className="nords-settings__pref-info">
                    <span className="nords-settings__pref-label">Reduce Motion</span>
                    <span className="nords-settings__pref-desc">Disable animations and transitions</span>
                  </div>
                  <label className="nords-settings__toggle">
                    <input type="checkbox" />
                    <span className="nords-settings__toggle-slider" />
                  </label>
                </div>
              </div>
            )}

            {/* ── Security ── */}
            {settingsSection === 'security' && (
              <div className="nords-settings__section">
                <h3 className="nords-settings__section-title">Security</h3>

                <div className="nords-settings__pref-row">
                  <div className="nords-settings__pref-info">
                    <span className="nords-settings__pref-label">Password</span>
                    <span className="nords-settings__pref-desc">Last changed 3 months ago</span>
                  </div>
                  <button className="nords-settings__action-btn">
                    Change Password
                    <ChevronRight size={12} />
                  </button>
                </div>

                <div className="nords-settings__divider" />

                <div className="nords-settings__pref-row">
                  <div className="nords-settings__pref-info">
                    <span className="nords-settings__pref-label">Connected Accounts</span>
                    <span className="nords-settings__pref-desc">Manage your linked accounts</span>
                  </div>
                </div>

                <div className="nords-settings__connected-account">
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 01-1.8 2.71v2.26h2.92A8.78 8.78 0 0017.64 9.2z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 009 18z" fill="#34A853"/>
                    <path d="M3.97 10.71A5.41 5.41 0 013.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 000 9c0 1.45.35 2.82.96 4.04l3.01-2.33z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 00.96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  <span className="nords-settings__connected-name">Google — daniel@gmail.com</span>
                  <span className="nords-settings__connected-badge">Connected</span>
                </div>

                <div className="nords-settings__divider" />

                <div className="nords-settings__pref-row">
                  <div className="nords-settings__pref-info">
                    <span className="nords-settings__pref-label">Active Sessions</span>
                    <span className="nords-settings__pref-desc">2 active sessions</span>
                  </div>
                  <button className="nords-settings__action-btn nords-settings__action-btn--danger">
                    Sign Out All
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* ── Danger Zone ── */}
            {settingsSection === 'danger' && (
              <div className="nords-settings__section">
                <h3 className="nords-settings__section-title nords-settings__section-title--danger">Danger Zone</h3>
                <p className="nords-settings__danger-desc">
                  These actions are permanent and cannot be undone.
                </p>

                <div className="nords-settings__danger-card">
                  <div className="nords-settings__danger-info">
                    <span className="nords-settings__danger-action">Delete Account</span>
                    <span className="nords-settings__danger-detail">
                      Permanently delete your account and all associated data. You will lose access to all workspaces and projects.
                    </span>
                  </div>
                  <button className="nords-settings__danger-btn">
                    <Trash2 size={12} />
                    Delete Account
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;

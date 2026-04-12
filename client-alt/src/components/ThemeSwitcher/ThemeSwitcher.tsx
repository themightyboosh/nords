/**
 * ThemeSwitcher.tsx — Dark/Light Mode Toggle
 *
 * A single button that toggles between the Obsidian (dark) and
 * Obsidian Light themes. Shows a Sun icon in dark mode and a
 * Moon icon in light mode.
 *
 * Theme application:
 *   1. This component fires `onThemeChange('obsidian' | 'obsidian-light')`
 *   2. App.tsx stores the theme in state
 *   3. A useEffect sets `data-theme` on <html>
 *   4. CSS custom properties cascade from the theme files
 *
 * @see styles/theme-obsidian.css — Dark theme (Palantir/Bloomberg aesthetic)
 * @see styles/theme-obsidian-light.css — Light theme (Linear/Apple aesthetic)
 */

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import './ThemeSwitcher.css';

interface ThemeSwitcherProps {
  /** Current theme ID */
  currentTheme: string;
  /** Callback to change the active theme */
  onThemeChange: (theme: string) => void;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ currentTheme, onThemeChange }) => {
  const isDark = currentTheme === 'obsidian';

  return (
    <div className="nords-theme-switcher">
      <button
        className="nords-theme-switcher__toggle"
        onClick={() => onThemeChange(isDark ? 'obsidian-light' : 'obsidian')}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </div>
  );
};

export default ThemeSwitcher;

/**
 * ThemeSwitcher.tsx — Dark/Light Mode Toggle
 *
 * Persists theme preference to localStorage.
 * Respects prefers-color-scheme on first visit.
 */

import { Sun, Moon } from 'lucide-react';
import './ThemeSwitcher.css';

interface ThemeSwitcherProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

export default function ThemeSwitcher({ currentTheme, onThemeChange }: ThemeSwitcherProps) {
  const isDark = currentTheme === 'obsidian';

  return (
    <div className="nords-theme-switcher">
      <button
        className="nords-theme-switcher__toggle"
        onClick={() => onThemeChange(isDark ? 'obsidian-light' : 'obsidian')}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        data-testid="theme-toggle"
      >
        {isDark ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </div>
  );
}

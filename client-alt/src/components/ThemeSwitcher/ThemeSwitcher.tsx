import React from 'react';
import { Sun, Moon } from 'lucide-react';
import './ThemeSwitcher.css';

interface ThemeSwitcherProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

const themes = [
  { id: 'obsidian', label: 'Dark' },
  { id: 'obsidian-light', label: 'Light' },
];

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ currentTheme, onThemeChange }) => {
  const isDark = currentTheme === 'obsidian';

  return (
    <div className="nards-theme-switcher">
      <button
        className="nards-theme-switcher__toggle"
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

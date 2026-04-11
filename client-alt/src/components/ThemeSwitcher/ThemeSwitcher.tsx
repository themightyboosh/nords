import React from 'react';
import './ThemeSwitcher.css';

interface ThemeSwitcherProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

const themes = [
  { id: 'obsidian', label: 'Obsidian', subtitle: 'Inter · Dark Monochrome' },
  { id: 'nebula', label: 'Nebula', subtitle: 'Space Grotesk · Violet HUD' },
  { id: 'vapor', label: 'Vapor', subtitle: 'Inter · Warm Light' },
];

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ currentTheme, onThemeChange }) => {
  return (
    <div className="nards-theme-switcher">
      <span className="nards-theme-switcher__label">Variant</span>
      <div className="nards-theme-switcher__options">
        {themes.map((t) => (
          <button
            key={t.id}
            className={`nards-theme-switcher__option ${currentTheme === t.id ? 'is-active' : ''}`}
            onClick={() => onThemeChange(t.id)}
            title={t.subtitle}
          >
            <span className="nards-theme-switcher__option-name">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSwitcher;

/**
 * IconPicker — Shared icon selector component.
 *
 * Originally from ManageTypes, now a shared component used by:
 *   - ManageTypes (nord/connection type icons)
 *   - ProjectSettings (project icon)
 *   - ProjectDashboard (create project icon)
 *
 * Renders a searchable grid of Lucide icons. Highlights the current selection.
 */

import { useState, useMemo } from 'react';
import { ICON_MAP, getAvailableIconNames } from '../../utils/iconRegistry';
import type { LucideIcon } from 'lucide-react';
import '../ManageTypes/IconPicker.css';

interface IconPickerProps {
  /** Currently selected icon name */
  currentIcon: string;
  /** Called when user picks an icon */
  onSelect: (iconName: string) => void;
  /** Optional accent color for the selected state */
  accentColor?: string;
}

export function IconPicker({ currentIcon, onSelect, accentColor }: IconPickerProps) {
  const [search, setSearch] = useState('');
  const allNames = useMemo(() => getAvailableIconNames(), []);

  const filtered = useMemo(() => {
    if (!search.trim()) return allNames;
    const q = search.toLowerCase();
    return allNames.filter(name => name.toLowerCase().includes(q));
  }, [allNames, search]);

  return (
    <div className="icon-picker" data-testid="icon-picker">
      <input
        type="text"
        className="icon-picker__search"
        placeholder="Search icons…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        data-testid="icon-picker-search"
      />
      <div className="icon-picker__grid">
        {filtered.map(name => {
          const Icon: LucideIcon = ICON_MAP[name];
          const isSelected = name === currentIcon;
          return (
            <button
              key={name}
              className={`icon-picker__item ${isSelected ? 'icon-picker__item--selected' : ''}`}
              onClick={() => onSelect(name)}
              title={name}
              style={isSelected ? {
                borderColor: accentColor,
                background: `${accentColor}22`,
              } : undefined}
              data-testid={`icon-${name}`}
            >
              <Icon size={18} strokeWidth={1.6} style={{ color: accentColor || 'currentColor' }} />
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="icon-picker__empty">No icons match "{search}"</div>
        )}
      </div>
    </div>
  );
}

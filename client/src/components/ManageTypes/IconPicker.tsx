/**
 * IconPicker — Grid of icons from the icon registry.
 * 
 * Used in ManageTypes to select an icon for a nord/connection type.
 * Shows ~100 icons in a searchable grid, highlights current selection.
 */

import React, { useState, useMemo } from 'react';
import { ICON_MAP, getAvailableIconNames } from '../../utils/iconRegistry';
import type { LucideIcon } from 'lucide-react';
import './IconPicker.css';

interface IconPickerProps {
  currentIcon: string;
  onSelect: (iconName: string) => void;
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
              <Icon size={18} strokeWidth={1.6} />
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

/**
 * CustomSelect — Reusable dropdown with icon + color support.
 *
 * Replaces native <select> elements where we need to render
 * color dots, icons, or avatars alongside each option.
 *
 * Features:
 *   - Color dot per option
 *   - Icon per option (Lucide component)
 *   - Keyboard accessible (Arrow keys, Enter, Escape)
 *   - Closes on outside click
 *   - Matches existing nords form styling
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './CustomSelect.module.css';

export interface CustomSelectOption {
  value: string;
  label: string;
  /** Hex color to show as a dot */
  color?: string | null;
  /** Lucide icon component */
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  /** Sublabel (e.g., type name) */
  sublabel?: string;
}

interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  className = '',
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Scroll focused item into view
  useEffect(() => {
    if (!isOpen || focusIndex < 0) return;
    const list = listRef.current;
    if (!list) return;
    const item = list.children[focusIndex] as HTMLElement;
    if (item) item.scrollIntoView({ block: 'nearest' });
  }, [focusIndex, isOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setFocusIndex(options.findIndex(o => o.value === value));
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusIndex(prev => Math.min(prev + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusIndex >= 0 && focusIndex < options.length) {
          onChange(options[focusIndex].value);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  }, [isOpen, focusIndex, options, value, onChange, disabled]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`nords-custom-select ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
    >
      {/* Trigger */}
      <button
        className="nords-custom-select__trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        type="button"
        tabIndex={-1}
      >
        {selected ? (
          <span className="nords-custom-select__selected">
            {selected.color && (
              <span
                className="nords-custom-select__dot"
                style={{ backgroundColor: selected.color }}
              />
            )}
            {selected.icon && (
              <selected.icon size={14} className="nords-custom-select__icon" />
            )}
            <span className="nords-custom-select__label">{selected.label}</span>
            {selected.sublabel && (
              <span className="nords-custom-select__sublabel">{selected.sublabel}</span>
            )}
          </span>
        ) : (
          <span className="nords-custom-select__placeholder">{placeholder}</span>
        )}
        <svg className="nords-custom-select__chevron" width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
          <path d="M0 0l5 6 5-6z" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="nords-custom-select__dropdown" ref={listRef} role="listbox">
          {options.length === 0 ? (
            <div className="nords-custom-select__empty">No options</div>
          ) : (
            options.map((opt, i) => (
              <button
                key={opt.value}
                className={`nords-custom-select__option ${opt.value === value ? 'is-selected' : ''} ${i === focusIndex ? 'is-focused' : ''}`}
                onClick={() => handleSelect(opt.value)}
                role="option"
                aria-selected={opt.value === value}
                type="button"
              >
                {opt.color && (
                  <span
                    className="nords-custom-select__dot"
                    style={{ backgroundColor: opt.color }}
                  />
                )}
                {opt.icon && (
                  <opt.icon size={14} className="nords-custom-select__icon" />
                )}
                <span className="nords-custom-select__label">{opt.label}</span>
                {opt.sublabel && (
                  <span className="nords-custom-select__sublabel">{opt.sublabel}</span>
                )}
                {opt.value === value && (
                  <span className="nords-custom-select__check">✓</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;

/**
 * RadialMenu.tsx — Nord type picker, triggered by right-click on the canvas.
 *
 * Scales to 50+ types with a searchable command-palette layout:
 *   - Appears at cursor position (clamped to viewport)
 *   - Up to 5 pinned recent types shown immediately as icon pills
 *   - Searchable list below; keyboard navigable (↑↓ Enter Esc)
 *   - Smooth spring-in animation, dismisses on click-outside or Esc
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Search } from 'lucide-react';
import { useNodeCountLimit } from '../../hooks/useNodeCountLimit';
import { useTypeVisibility } from '../../hooks/useTypeVisibility';
import './RadialMenu.css';

const RECENT_KEY = 'nords-recent-nord-types';
const MAX_RECENT = 5;
const MAX_LIST = 8; // max items shown without search

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function recordRecent(typeId: string) {
  const current = getRecent().filter(id => id !== typeId);
  const next = [typeId, ...current].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

interface RadialMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCreateNord?: (typeId: string, position?: { x: number; y: number }) => void;
}

export function RadialMenu({ x, y, onClose, onCreateNord }: RadialMenuProps) {
  const { screenToFlowPosition } = useReactFlow();
  const { canAdd, isAtLimit } = useNodeCountLimit();
  const { visibleNodeTypes } = useTypeVisibility();

  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Focus input on open
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Clamp position so the palette stays inside the viewport
  const PALETTE_W = 260;
  const PALETTE_H = 340; // approximate max height
  const clampedX = Math.max(8, Math.min(window.innerWidth - PALETTE_W - 8, x));
  const clampedY = Math.max(8, Math.min(window.innerHeight - PALETTE_H - 8, y));

  // Recent types (as ordered ids)
  const recentIds = useMemo(() => getRecent(), []);

  // All types, with recent ones scored higher
  const scored = useMemo(() => {
    const q = query.toLowerCase().trim();
    return visibleNodeTypes
      .map(t => {
        const recentIdx = recentIds.indexOf((t as any).id);
        const nameMatch = t.name.toLowerCase().includes(q);
        return { type: t, recentIdx, nameMatch };
      })
      .filter(({ nameMatch, type }) => !query || nameMatch || type.name.toLowerCase().startsWith(query.toLowerCase()))
      .sort((a, b) => {
        // Exact starts-with first
        const aStart = a.type.name.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1;
        const bStart = b.type.name.toLowerCase().startsWith(query.toLowerCase()) ? 0 : 1;
        if (aStart !== bStart) return aStart - bStart;
        // Then recent
        const aR = a.recentIdx === -1 ? 999 : a.recentIdx;
        const bR = b.recentIdx === -1 ? 999 : b.recentIdx;
        return aR - bR;
      });
  }, [visibleNodeTypes, query, recentIds]);

  const displayed = scored.slice(0, query ? 50 : MAX_LIST);

  // Quick-access pills: top 5 recent types with no search active
  const quickTypes = useMemo(() => {
    if (query) return [];
    return recentIds
      .map(id => visibleNodeTypes.find(t => (t as any).id === id))
      .filter(Boolean)
      .slice(0, MAX_RECENT) as typeof visibleNodeTypes;
  }, [recentIds, visibleNodeTypes, query]);

  const handleSelect = useCallback((typeId: string) => {
    if (!canAdd) return;
    recordRecent(typeId);
    const position = screenToFlowPosition({ x, y });
    onCreateNord?.(typeId, position);
    onClose();
  }, [canAdd, screenToFlowPosition, x, y, onCreateNord, onClose]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, displayed.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && displayed[activeIdx]) {
      e.preventDefault();
      handleSelect((displayed[activeIdx].type as any).id);
    }
  };

  // Reset active index when search changes
  useEffect(() => setActiveIdx(0), [query]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  return (
    <>
      {/* Backdrop */}
      <div className="nords-radial-backdrop" onClick={onClose} />

      {/* Palette */}
      <div
        className="nords-radial-palette"
        style={{ left: clampedX, top: clampedY }}
        onKeyDown={handleKeyDown}
      >
        {/* Limit warning */}
        {isAtLimit && (
          <div className="nords-radial-limit">Node limit reached</div>
        )}

        {/* Search input */}
        <div className="nords-radial-search">
          <Search size={14} className="nords-radial-search__icon" />
          <input
            ref={inputRef}
            className="nords-radial-search__input"
            type="text"
            placeholder="Add nord…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="nords-radial-search__clear" onClick={() => setQuery('')}>×</button>
          )}
        </div>

        {/* Quick-access recent pills (shown when no search) */}
        {quickTypes.length > 0 && (
          <div className="nords-radial-quick">
            {quickTypes.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={(t as any).id}
                  className="nords-radial-quick__pill"
                  style={{ '--pill-color': t.color } as React.CSSProperties}
                  title={t.name}
                  onClick={() => handleSelect((t as any).id)}
                  disabled={!canAdd}
                >
                  <Icon size={16} strokeWidth={2} />
                </button>
              );
            })}
          </div>
        )}

        {/* Divider label */}
        <div className="nords-radial-section-label">
          {query
            ? `${displayed.length} type${displayed.length !== 1 ? 's' : ''}`
            : visibleNodeTypes.length <= MAX_LIST
              ? 'All types'
              : `All types · ${visibleNodeTypes.length} total`}
        </div>

        {/* List */}
        {displayed.length > 0 ? (
          <ul className="nords-radial-list" ref={listRef}>
            {displayed.map(({ type }, i) => {
              const Icon = type.icon;
              const isActive = i === activeIdx;
              return (
                <li
                  key={(type as any).id}
                  className={`nords-radial-list__item ${isActive ? 'is-active' : ''}`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => handleSelect((type as any).id)}
                >
                  <span
                    className="nords-radial-list__swatch"
                    style={{ background: type.color }}
                  >
                    <Icon size={13} strokeWidth={2} color="#fff" />
                  </span>
                  <span className="nords-radial-list__name">{type.name}</span>
                  {i === 0 && !query && recentIds.includes((type as any).id) && (
                    <span className="nords-radial-list__badge">recent</span>
                  )}
                  {isActive && (
                    <kbd className="nords-radial-list__hint">↵</kbd>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="nords-radial-empty">No types match "{query}"</div>
        )}
      </div>
    </>
  );
}

/**
 * SearchPalette.tsx — ⌘K Command Palette
 *
 * Global fuzzy search overlay for finding nords, connections, and
 * executing quick actions. Triggered by ⌘K (Ctrl+K on Windows).
 *
 * Sections:
 *   1. Recent — last 5 viewed nords
 *   2. Nords — fuzzy search results across all nords
 *   3. Quick Actions — lens switch, snapshot, settings
 *
 * @see docs/frontend/04_ui_and_interactions.md §1.7 Command Palette
 */

import React, { useState } from 'react';
import {
  Search, Clock, Square, User, FileText, Target, Bug, Lightbulb,
  AlertTriangle, Layers, Eye, Link2, LayoutGrid, Camera, Settings,
} from 'lucide-react';
import './SearchPalette.css';

interface SearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNordSelect: (id: string) => void;
}

/** Mock search results */
const RECENT_ITEMS = [
  { id: 'n2', title: 'Physics Engine Spike', type: 'Task', icon: Square, color: '#4da6ff' },
  { id: 'n5', title: 'API Design Doc', type: 'Artifact', color: '#34d399', icon: FileText },
  { id: 'n4', title: 'Sarah Chen', type: 'Person', color: '#f472b6', icon: User },
];

const ALL_NORDS = [
  { id: 'n1', title: 'Auth & SSO Integration', type: 'Task', icon: Square, color: '#4da6ff' },
  { id: 'n2', title: 'Physics Engine Spike', type: 'Task', icon: Square, color: '#4da6ff' },
  { id: 'n3', title: 'Canvas Renderer', type: 'Task', icon: Square, color: '#4da6ff' },
  { id: 'n4', title: 'Sarah Chen', type: 'Person', icon: User, color: '#f472b6' },
  { id: 'n5', title: 'API Design Doc', type: 'Artifact', icon: FileText, color: '#34d399' },
  { id: 'n6', title: 'Login timeout on Safari', type: 'Bug', icon: Bug, color: '#f87171' },
  { id: 'n7', title: 'Beta Launch', type: 'Milestone', icon: Target, color: '#a78bfa' },
  { id: 'n8', title: 'Auto-layout Algorithm', type: 'Idea', icon: Lightbulb, color: '#fbbf24' },
  { id: 'n9', title: 'User Onboarding', type: 'Epic', icon: Layers, color: '#38bdf8' },
  { id: 'n10', title: 'Vendor Lock-in', type: 'Risk', icon: AlertTriangle, color: '#fb923c' },
];

const QUICK_ACTIONS = [
  { label: 'Switch to Canvas', icon: Eye, shortcut: '⌘1' },
  { label: 'Switch to Link', icon: Link2, shortcut: '⌘2' },
  { label: 'Switch to Matrix', icon: LayoutGrid, shortcut: '⌘3' },
  { label: 'Take Snapshot', icon: Camera, shortcut: '⌘S' },
  { label: 'Open Settings', icon: Settings, shortcut: '⌘,' },
];

const SearchPalette: React.FC<SearchPaletteProps> = ({ isOpen, onClose, onNordSelect }) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  /** Filter nords by query */
  const filteredNords = query.length > 0
    ? ALL_NORDS.filter(n =>
        n.title.toLowerCase().includes(query.toLowerCase()) ||
        n.type.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const filteredActions = query.length > 0
    ? QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
    : QUICK_ACTIONS;

  return (
    <>
      {/* Backdrop scrim */}
      <div className="nords-search-scrim" onClick={onClose} />

      <div className="nords-search-palette nords-glass">
        {/* Search input */}
        <div className="nords-search-palette__input-row">
          <Search size={16} strokeWidth={1.5} className="nords-search-palette__search-icon" />
          <input
            className="nords-search-palette__input"
            placeholder="Search nords, connections, or actions..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <kbd className="nords-search-palette__kbd">ESC</kbd>
        </div>

        <div className="nords-search-palette__results">
          {/* Recent — only shown when query is empty */}
          {query.length === 0 && (
            <div className="nords-search-palette__section">
              <div className="nords-search-palette__section-label">
                <Clock size={11} strokeWidth={2} /> Recent
              </div>
              {RECENT_ITEMS.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className="nords-search-palette__result"
                    onClick={() => { onNordSelect(item.id); onClose(); }}
                  >
                    <Icon size={14} strokeWidth={1.5} style={{ color: item.color }} />
                    <span className="nords-search-palette__result-title">{item.title}</span>
                    <span className="nords-search-palette__result-type" style={{ color: item.color }}>{item.type}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Nord search results */}
          {filteredNords.length > 0 && (
            <div className="nords-search-palette__section">
              <div className="nords-search-palette__section-label">Nords</div>
              {filteredNords.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className="nords-search-palette__result"
                    onClick={() => { onNordSelect(item.id); onClose(); }}
                  >
                    <Icon size={14} strokeWidth={1.5} style={{ color: item.color }} />
                    <span className="nords-search-palette__result-title">{item.title}</span>
                    <span className="nords-search-palette__result-type" style={{ color: item.color }}>{item.type}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick actions */}
          {filteredActions.length > 0 && (
            <div className="nords-search-palette__section">
              <div className="nords-search-palette__section-label">Quick Actions</div>
              {filteredActions.map(action => {
                const Icon = action.icon;
                return (
                  <button key={action.label} className="nords-search-palette__result" onClick={onClose}>
                    <Icon size={14} strokeWidth={1.5} />
                    <span className="nords-search-palette__result-title">{action.label}</span>
                    <kbd className="nords-search-palette__shortcut">{action.shortcut}</kbd>
                  </button>
                );
              })}
            </div>
          )}

          {/* No results */}
          {query.length > 0 && filteredNords.length === 0 && filteredActions.length === 0 && (
            <div className="nords-search-palette__empty">
              No results for "{query}"
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SearchPalette;

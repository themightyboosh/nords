/**
 * App.tsx — Root Application Shell
 *
 * Orchestrates the three visual layers of the Nords workspace:
 *   1. Background: CanvasMock (spatial graph OR matrix pivot table)
 *   2. Floating overlays: ViewportHeader (top) + GlobalDock (bottom)
 *   3. Side panel: DetailDrawer (right-side slide-in)
 *   4. Full-screen modals: ManageTypes, ProjectSettings
 *
 * State managed here:
 *   - `theme`       → CSS theme applied via `data-theme` on <html>
 *   - `lens`        → Active view mode: canvas | link | matrix
 *   - `activeLine`  → Currently selected connection type (for Link + Matrix)
 *   - `showContext`  → Link mode: show unconnected nords as ghosts?
 *   - `isDrawerOpen` → Whether the DetailDrawer is visible
 *   - `selectedNord` → ID of the currently selected nord (drives drawer content)
 *   - `showManageTypes` / `showSettings` → Modal visibility flags
 *
 * @see docs/frontend/04_ui_and_interactions.md §1.1 Macro Workspace Layout
 */

import React, { useState, useEffect } from 'react';
import ViewportHeader from './components/Layout/ViewportHeader';
import GlobalDock from './components/Layout/GlobalDock';
import DetailDrawer from './components/Drawer/DetailDrawer';
import CanvasMock from './components/Canvas/CanvasMock';
import ManageTypes from './components/ManageTypes/ManageTypes';
import ProjectSettings from './components/ProjectSettings/ProjectSettings';
import EmptyState from './components/EmptyState/EmptyState';
import SearchPalette from './components/SearchPalette/SearchPalette';
import ProjectDashboard from './components/ProjectDashboard/ProjectDashboard';

/** The three lens modes available in the dock's 3-way toggle */
export type LensMode = 'canvas' | 'link' | 'matrix';

function App() {
  /* ── Theme ── */
  const [theme, setTheme] = useState('obsidian');

  /* ── Lens & connection state ── */
  const [lens, setLens] = useState<LensMode>('canvas');
  const [activeLine, setActiveLine] = useState('Blocks');
  const [showContext, setShowContext] = useState(true);

  /* ── Selection & drawer ── */
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedNord, setSelectedNord] = useState<string | null>(null);

  /* ── Modal visibility ── */
  const [showManageTypes, setShowManageTypes] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  /** Toggle to show the zero-state empty canvas (for mock preview) */
  const [showEmpty, setShowEmpty] = useState(false);
  /** ⌘K search palette */
  const [showSearch, setShowSearch] = useState(false);
  /** Project dashboard / workspace switcher */
  const [showDashboard, setShowDashboard] = useState(false);

  // Apply theme to <html> so CSS custom properties cascade to body and all children
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  /** Keyboard shortcuts: ⌘K = search, ⌘P = dashboard */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /** Open the detail drawer for a specific nord */
  const handleNordClick = (id: string) => {
    setSelectedNord(id);
    setLineMode(false);
    setIsDrawerOpen(true);
  };

  /** Open the detail drawer for a connection (line click) */
  const [lineMode, setLineMode] = useState(false);
  const handleLineClick = () => {
    setLineMode(true);
    setSelectedNord(null);
    setIsDrawerOpen(true);
  };

  /** Close the detail drawer and clear selection */
  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedNord(null);
    setLineMode(false);
  };

  return (
    <div className="nords-app-container">
      {/* ─── Layer 1: Canvas / Matrix background ─── */}
      <CanvasMock
        onNordClick={handleNordClick}
        onLineClick={handleLineClick}
        selectedNord={selectedNord}
        lens={lens}
        activeLine={activeLine}
        showContext={showContext}
      />

      {/* ─── Layer 2: Floating overlays ─── */}
      <ViewportHeader
        currentTheme={theme}
        onThemeChange={setTheme}
        onOpenSettings={() => setShowSettings(true)}
      />
      <GlobalDock
        lens={lens}
        onLensChange={setLens}
        activeLine={activeLine}
        onActiveLineChange={setActiveLine}
        showContext={showContext}
        onShowContextChange={setShowContext}
        onOpenManageTypes={() => setShowManageTypes(true)}
      />

      {/* ─── Layer 3: Detail Drawer (right slide-in) ─── */}
      <DetailDrawer isOpen={isDrawerOpen} onClose={closeDrawer} nordId={selectedNord} lineMode={lineMode} />

      {/* ─── Layer 4: Full-screen modals ─── */}
      {showManageTypes && <ManageTypes onClose={() => setShowManageTypes(false)} />}
      {showSettings && <ProjectSettings onClose={() => setShowSettings(false)} />}

      {/* ─── Layer 5: Search Palette (⌘K) ─── */}
      <SearchPalette
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onNordSelect={(id) => { handleNordClick(id); setShowSearch(false); }}
      />

      {/* ─── Layer 6: Project Dashboard ─── */}
      <ProjectDashboard
        isOpen={showDashboard}
        onClose={() => setShowDashboard(false)}
      />

      {/* ─── Layer 7: Empty State (togglable for mock preview) ─── */}
      {showEmpty && (
        <EmptyState
          onAddNord={() => setShowEmpty(false)}
          onManageTypes={() => { setShowEmpty(false); setShowManageTypes(true); }}
        />
      )}
    </div>
  );
}

export default App;

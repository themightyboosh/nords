import React, { useState } from 'react';
import ViewportHeader from './components/Layout/ViewportHeader';
import GlobalDock from './components/Layout/GlobalDock';
import DetailDrawer from './components/Drawer/DetailDrawer';
import CanvasMock from './components/Canvas/CanvasMock';
import ManageTypes from './components/ManageTypes/ManageTypes';
import ProjectSettings from './components/ProjectSettings/ProjectSettings';

export type LensMode = 'canvas' | 'link' | 'matrix';

function App() {
  const [theme, setTheme] = useState('obsidian');
  const [lens, setLens] = useState<LensMode>('canvas');
  const [activeLine, setActiveLine] = useState('Blocks');
  const [showContext, setShowContext] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedNard, setSelectedNard] = useState<string | null>(null);
  const [showManageTypes, setShowManageTypes] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Apply theme to html element so CSS custom properties cascade to body
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleNardClick = (id: string) => {
    setSelectedNard(id);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedNard(null);
  };

  return (
    <div className="nards-app-container">
      {/* Canvas / Matrix background */}
      <CanvasMock
        onNardClick={handleNardClick}
        selectedNard={selectedNard}
        lens={lens}
        activeLine={activeLine}
        showContext={showContext}
      />

      {/* Floating overlays */}
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

      {/* Detail Drawer */}
      <DetailDrawer isOpen={isDrawerOpen} onClose={closeDrawer} nardId={selectedNard} />

      {/* Modal overlays */}
      {showManageTypes && <ManageTypes onClose={() => setShowManageTypes(false)} />}
      {showSettings && <ProjectSettings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;

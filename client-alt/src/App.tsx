import React, { useState } from 'react';
import ViewportHeader from './components/Layout/ViewportHeader';
import GlobalDock from './components/Layout/GlobalDock';
import DetailDrawer from './components/Drawer/DetailDrawer';
import CanvasMock from './components/Canvas/CanvasMock';

function App() {
  const [theme, setTheme] = useState('obsidian');
  const [activeView, setActiveView] = useState('canvas');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedNard, setSelectedNard] = useState<string | null>(null);

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
      {/* Canvas background */}
      <CanvasMock onNardClick={handleNardClick} selectedNard={selectedNard} />

      {/* Floating overlays */}
      <ViewportHeader currentTheme={theme} onThemeChange={setTheme} />
      <GlobalDock activeView={activeView} onViewChange={setActiveView} />

      {/* Detail Drawer */}
      <DetailDrawer isOpen={isDrawerOpen} onClose={closeDrawer} nardId={selectedNard} />
    </div>
  );
}

export default App;

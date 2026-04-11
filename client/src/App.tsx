import React, { useState } from 'react';
import ViewportHeader from './components/Layout/ViewportHeader';
import GlobalDock from './components/Layout/GlobalDock';
import DetailDrawer from './components/Drawer/DetailDrawer';
import CanvasMock from './components/Canvas/CanvasMock';

function App() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedNard, setSelectedNard] = useState<string | null>(null);

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
      {/* Absolute floating overlay layer */}
      <ViewportHeader />
      <GlobalDock />
      
      {/* Background Canvas Layer */}
      <CanvasMock onNardClick={handleNardClick} selectedNard={selectedNard} />
      
      {/* Slide-over UI */}
      <DetailDrawer isOpen={isDrawerOpen} onClose={closeDrawer} nardId={selectedNard} />
    </div>
  );
}

export default App;

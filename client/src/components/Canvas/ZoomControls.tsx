/**
 * ZoomControls.tsx — Zoom widget (bottom-right corner)
 */

import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { useReactFlow, useStore } from '@xyflow/react';
import './ZoomControls.css';

export default function ZoomControls() {
  const { zoomIn, zoomOut, fitView, setViewport } = useReactFlow();
  
  // Get active zoom multiplier
  const zoom = useStore((s) => s.transform[2]);
  const displayZoom = Math.round(zoom * 100);

  const resetZoom = () => {
    setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 });
  };

  return (
    <div className="nords-zoom-controls nords-glass" data-testid="zoom-controls">
      <button 
        className="nords-zoom-controls__btn" 
        onClick={() => zoomOut({ duration: 200 })} 
        title="Zoom out" 
        data-testid="zoom-out"
      >
        <ZoomOut size={14} strokeWidth={1.6} />
      </button>
      <button 
        className="nords-zoom-controls__pct" 
        onClick={resetZoom} 
        title="Reset to 100%" 
        data-testid="zoom-reset"
      >
        {displayZoom}%
      </button>
      <button 
        className="nords-zoom-controls__btn" 
        onClick={() => zoomIn({ duration: 200 })} 
        title="Zoom in" 
        data-testid="zoom-in"
      >
        <ZoomIn size={14} strokeWidth={1.6} />
      </button>
      <div className="nords-zoom-controls__sep" />
      <button 
        className="nords-zoom-controls__btn" 
        onClick={() => fitView({ duration: 300, padding: 0.1 })} 
        title="Fit to view" 
        data-testid="zoom-fit"
      >
        <Maximize size={14} strokeWidth={1.6} />
      </button>
    </div>
  );
}

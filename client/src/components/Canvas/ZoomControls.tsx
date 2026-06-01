/**
 * ZoomControls.tsx — Zoom widget (bottom-right corner)
 *
 * Fit behavior:
 *   1st click → fit to active category nords only (if a category is active)
 *   2nd click → fit all nords
 *   If no active category → always fit all
 */

import { useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize, Minimize2 } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useLens } from '../../context/LensContext';
import './ZoomControls.css';

export default function ZoomControls() {
  const { zoomIn, zoomOut, fitView, getNodes, getEdges } = useReactFlow();
  const { activeConnectionTypeId } = useLens();

  // Track toggle state: false = "fit category", true = "fit all"
  const lastFitWasCategory = useRef(false);

  const handleFit = useCallback(() => {
    // If no active category, always fit all
    if (!activeConnectionTypeId) {
      fitView({ duration: 300, padding: 0.1 });
      lastFitWasCategory.current = false;
      return;
    }

    if (!lastFitWasCategory.current) {
      // First click: fit to active category nords only
      const edges = getEdges();
      const activeEdges = edges.filter(
        e => (e.data as any)?._typeId === activeConnectionTypeId
      );

      if (activeEdges.length > 0) {
        const nodeIds = new Set<string>();
        activeEdges.forEach(e => {
          nodeIds.add(e.source);
          nodeIds.add(e.target);
        });

        fitView({
          duration: 300,
          padding: 0.15,
          nodes: getNodes().filter(n => nodeIds.has(n.id)),
        });
        lastFitWasCategory.current = true;
        return;
      }
    }

    // Second click (or no active edges): fit all
    fitView({ duration: 300, padding: 0.1 });
    lastFitWasCategory.current = false;
  }, [activeConnectionTypeId, fitView, getNodes, getEdges]);

  // Reset toggle when active category changes
  const prevCatRef = useRef(activeConnectionTypeId);
  if (prevCatRef.current !== activeConnectionTypeId) {
    lastFitWasCategory.current = false;
    prevCatRef.current = activeConnectionTypeId;
  }

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
        onClick={handleFit} 
        title={lastFitWasCategory.current ? 'Fit all nords' : (activeConnectionTypeId ? 'Fit active category' : 'Fit to view')}
        data-testid="zoom-fit"
      >
        {lastFitWasCategory.current ? <Minimize2 size={14} strokeWidth={1.6} /> : <Maximize size={14} strokeWidth={1.6} />}
      </button>
    </div>
  );
}


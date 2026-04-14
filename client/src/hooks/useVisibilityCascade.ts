import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useLens } from '../context/LensContext';

/**
 * useVisibilityCascade controls hide/show of non-active lines and orphaned nords
 * via the showContext toggle in the dock.
 *
 * Dimming (gray) is handled upstream in lensEdges — this hook only toggles
 * the `hidden` flag when showContext is OFF.
 *
 * When a specific connection type is selected:
 *   showContext=true  → everything visible (dimming handled by lensEdges)
 *   showContext=false → non-active lines and unconnected nords hidden
 *
 * When "All Lines" is selected:
 *   showContext=true  → orphaned nords visible
 *   showContext=false → orphaned nords hidden
 */
export function useVisibilityCascade() {
  const { setNodes, setEdges, getEdges } = useReactFlow();
  const { activeConnectionTypeId, showContext } = useLens();
  
  useEffect(() => {
    // When showContext is ON, make everything visible (dimming handled elsewhere)
    if (showContext) {
      setNodes((nds) => {
        const needsReset = nds.some(n => n.hidden);
        if (!needsReset) return nds;
        return nds.map(n => ({ ...n, hidden: false }));
      });
      setEdges((eds) => {
        const needsReset = eds.some(e => e.hidden);
        if (!needsReset) return eds;
        return eds.map(e => ({ ...e, hidden: false }));
      });
      return;
    }

    // showContext is OFF — hide non-active lines and unconnected nords
    const allEdges = getEdges();

    // Build set of connected node IDs
    const connectedNodeIds = new Set<string>();
    if (activeConnectionTypeId) {
      // Only nodes connected by active type
      allEdges.forEach(e => {
        if ((e.data as any)?._typeId === activeConnectionTypeId) {
          connectedNodeIds.add(e.source);
          connectedNodeIds.add(e.target);
        }
      });
    } else {
      // All view: all connected nodes
      allEdges.forEach(e => {
        connectedNodeIds.add(e.source);
        connectedNodeIds.add(e.target);
      });
    }

    // Hide unconnected nords — only create new objects when hidden state changes
    setNodes((nds) => {
      let changed = false;
      const next = nds.map((n) => {
        const shouldHide = !connectedNodeIds.has(n.id);
        if (n.hidden !== shouldHide) { changed = true; }
        return shouldHide !== n.hidden ? { ...n, hidden: shouldHide } : n;
      });
      return changed ? next : nds;
    });

    // Hide non-active edges (only when a specific type is selected)
    if (activeConnectionTypeId) {
      setEdges((eds) => {
        let changed = false;
        const next = eds.map((e) => {
          const shouldHide = (e.data as Record<string, unknown>)?._typeId !== activeConnectionTypeId;
          if (e.hidden !== shouldHide) { changed = true; }
          return shouldHide !== e.hidden ? { ...e, hidden: shouldHide } : e;
        });
        return changed ? next : eds;
      });
    }
  }, [activeConnectionTypeId, showContext, setNodes, setEdges, getEdges]);
}

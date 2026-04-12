import { useEffect } from 'react';
import { useStore, useReactFlow } from '@xyflow/react';

/**
 * useSemanticZoom determines what visual tier to render nodes at based on the zoom lens.
 * 
 * Zoom tiers:
 * - Micro (100% - 75%): Full card anatomy
 * - Meso (74% - 25%): Hide descriptions/properties, show only title+icon
 * - Macro (< 25%): Colored dots, hairline connections
 */
export function useSemanticZoom() {
  const zoom = useStore((s) => s.transform[2]);
  
  // We can inject a CSS variable or class on the body to let CSS handle it easily
  useEffect(() => {
    const root = document.documentElement;
    if (zoom >= 0.75) {
      root.setAttribute('data-zoom-tier', 'micro');
    } else if (zoom >= 0.25) {
      root.setAttribute('data-zoom-tier', 'meso');
    } else {
      root.setAttribute('data-zoom-tier', 'macro');
    }
  }, [zoom]);

  return { zoom };
}

import { useEffect } from 'react';
import { useStore } from '@xyflow/react';

/**
 * useSemanticZoom determines what visual tier to render nodes at based on the zoom lens.
 * 
 * Zoom tiers:
 * - Micro (100% - 50%): Full card anatomy
 * - Meso (49% - 25%): Hide descriptions/properties, show only title+icon
 * - Macro (<25%): Colored dots, hairline connections
 *
 * PERF: Uses a quantized selector — only fires when the tier changes,
 * not on every scroll/pinch event. This reduces DOM writes from ~60/sec
 * during zoom gestures to max 2 (tier boundary crossings).
 */
export function useSemanticZoom() {
  const zoomTier = useStore(
    (s) => {
      const z = s.transform[2];
      if (z >= 0.50) return 'micro' as const;
      if (z >= 0.25) return 'meso' as const;
      return 'macro' as const;
    },
    (a, b) => a === b,
  );
  
  useEffect(() => {
    document.documentElement.setAttribute('data-zoom-tier', zoomTier);
  }, [zoomTier]);

  return { zoomTier };
}

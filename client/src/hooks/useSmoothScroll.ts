/**
 * useSmoothScroll — Smooth interpolation for React Flow scroll-to-pan.
 *
 * Problem: React Flow's `panOnScroll` applies raw wheel deltas as discrete
 * position jumps each frame, producing visible "chunky" steps — especially
 * on mice with notched scroll wheels.
 *
 * Solution: Intercept native wheel events on the React Flow pane, accumulate
 * deltas into a velocity buffer, then drain that buffer via requestAnimationFrame
 * using exponential decay (lerp). The result is buttery-smooth panning that
 * covers the SAME total distance — it just spreads the motion across frames.
 *
 * Usage: Call inside the InteractiveCanvas component. It attaches listeners
 * to the `.react-flow` container element.
 */

import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';

/** Decay factor per frame — 0.85 gives ~6 frames to settle (≈100ms at 60fps) */
const LERP_FACTOR = 0.15;
/** Stop animating below this threshold (px) to avoid infinite micro-drift */
const EPSILON = 0.3;
/** Zoom lerp factor — slightly slower for smoother zoom feel */
const ZOOM_LERP_FACTOR = 0.12;
/** Zoom epsilon */
const ZOOM_EPSILON = 0.001;

export function useSmoothScroll(containerRef: React.RefObject<HTMLDivElement | null>) {
  const { getViewport, setViewport, getZoom } = useReactFlow();

  // Accumulated velocity that hasn't been applied yet
  const velX = useRef(0);
  const velY = useRef(0);
  const velZoom = useRef(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Find the actual .react-flow element (could be the container itself or a child)
    const rfPane = container.querySelector('.react-flow') as HTMLElement | null;
    const target = rfPane || container;

    const tick = () => {
      const hasLinear = Math.abs(velX.current) > EPSILON || Math.abs(velY.current) > EPSILON;
      const hasZoom = Math.abs(velZoom.current) > ZOOM_EPSILON;

      if (!hasLinear && !hasZoom) {
        rafId.current = null;
        return;
      }

      const vp = getViewport();

      if (hasLinear) {
        // Apply a fraction of remaining velocity
        const dx = velX.current * LERP_FACTOR;
        const dy = velY.current * LERP_FACTOR;
        velX.current -= dx;
        velY.current -= dy;

        setViewport({ x: vp.x - dx, y: vp.y - dy, zoom: vp.zoom });
      }

      if (hasZoom) {
        const dz = velZoom.current * ZOOM_LERP_FACTOR;
        velZoom.current -= dz;
        const newZoom = Math.max(0.4, Math.min(2.0, vp.zoom + dz));
        setViewport({ x: vp.x, y: vp.y, zoom: newZoom });
      }

      rafId.current = requestAnimationFrame(tick);
    };

    const onWheel = (e: WheelEvent) => {
      // Don't intercept pinch-to-zoom (ctrlKey is set for trackpad pinch)
      if (e.ctrlKey || e.metaKey) {
        // Accumulate zoom velocity instead of letting RF handle it chunkily
        e.preventDefault();
        // Negative deltaY = zoom in, positive = zoom out
        velZoom.current += -e.deltaY * 0.002;

        if (!rafId.current) {
          rafId.current = requestAnimationFrame(tick);
        }
        return;
      }

      // Prevent React Flow's built-in scroll handler
      e.preventDefault();
      e.stopPropagation();

      // Accumulate velocity — same magnitude, just spread over frames
      velX.current += e.deltaX;
      velY.current += e.deltaY;

      // Kick off the animation loop if not already running
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(tick);
      }
    };

    // Capture phase so we intercept before React Flow's handler
    target.addEventListener('wheel', onWheel, { passive: false, capture: true });

    return () => {
      target.removeEventListener('wheel', onWheel, { capture: true } as EventListenerOptions);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [containerRef, getViewport, setViewport, getZoom]);
}

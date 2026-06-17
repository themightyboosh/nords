/**
 * useSmoothScroll — Smooth interpolation for React Flow scroll & zoom.
 *
 * Problem: React Flow applies raw wheel deltas as discrete position/zoom
 * jumps each frame, producing visible "chunky" steps — especially on mice
 * with notched scroll wheels.
 *
 * Solution: Intercept native wheel events on the React Flow pane, accumulate
 * deltas into a velocity buffer, then drain that buffer via requestAnimationFrame
 * using exponential decay (lerp). The result is buttery-smooth motion that
 * covers the SAME total distance — it just spreads the motion across frames.
 *
 * Behavior:
 *   - Two-finger trackpad swipe → smooth pan (detects deltaX)
 *   - Pinch / Ctrl+scroll / Cmd+scroll → smooth zoom toward cursor
 *   - Mouse wheel (no modifier) → smooth zoom toward cursor
 *   - Shift + mouse wheel → smooth horizontal pan
 *
 * Usage: Call inside a ReactFlow component. Pass a ref to the wrapper div.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

/** Decay factor per frame — 0.15 gives ~6 frames to settle (≈100ms at 60fps) */
const LERP_FACTOR = 0.15;
/** Stop animating below this threshold (px) to avoid infinite micro-drift */
const EPSILON = 0.3;
/** Zoom lerp factor — slightly slower for smoother zoom feel */
const ZOOM_LERP_FACTOR = 0.12;
/** Zoom epsilon */
const ZOOM_EPSILON = 0.001;
/** Minimum zoom level */
const MIN_ZOOM = 0.3;
/** Maximum zoom level */
const MAX_ZOOM = 2.0;

export function useSmoothScroll(containerRef: React.RefObject<HTMLDivElement | null>) {
  const { getViewport, setViewport } = useReactFlow();

  // Accumulated velocity that hasn't been applied yet
  const velX = useRef(0);
  const velY = useRef(0);
  const velZoom = useRef(0);
  const rafId = useRef<number | null>(null);

  // Store the last wheel-event cursor position for zoom-toward-cursor
  const cursorX = useRef(0);
  const cursorY = useRef(0);

  // Stable refs for the animation functions (avoid stale closures)
  const fnRef = useRef({ getViewport, setViewport });
  fnRef.current = { getViewport, setViewport };

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

      const vp = fnRef.current.getViewport();
      let { x, y, zoom } = vp;

      if (hasLinear) {
        // Apply a fraction of remaining velocity
        const dx = velX.current * LERP_FACTOR;
        const dy = velY.current * LERP_FACTOR;
        velX.current -= dx;
        velY.current -= dy;

        x -= dx;
        y -= dy;
      }

      if (hasZoom) {
        const dz = velZoom.current * ZOOM_LERP_FACTOR;
        velZoom.current -= dz;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + dz));

        // Zoom toward cursor: adjust viewport position so the point under
        // the cursor stays fixed. This is the standard map-zoom behavior.
        const scale = newZoom / zoom;
        x = cursorX.current - (cursorX.current - x) * scale;
        y = cursorY.current - (cursorY.current - y) * scale;
        zoom = newZoom;
      }

      fnRef.current.setViewport({ x, y, zoom });
      rafId.current = requestAnimationFrame(tick);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Record cursor position for zoom-toward-cursor
      cursorX.current = e.clientX;
      cursorY.current = e.clientY;

      // ── Detect input type ──
      // Trackpad pinch → browser synthesizes ctrlKey + small deltaY
      // Trackpad two-finger swipe → has meaningful deltaX component
      // Mouse wheel → pure deltaY, no deltaX, no ctrlKey
      const isPinchZoom = e.ctrlKey || e.metaKey;
      const hasHorizontalDelta = Math.abs(e.deltaX) > 1;

      if (isPinchZoom) {
        // ── Pinch zoom (trackpad) or Ctrl/Cmd + scroll ──
        velZoom.current += -e.deltaY * 0.004;
      } else if (hasHorizontalDelta) {
        // ── Trackpad two-finger pan (has horizontal component) ──
        velX.current += e.deltaX;
        velY.current += e.deltaY;
      } else if (e.shiftKey) {
        // ── Shift + scroll → horizontal pan ──
        velX.current += e.deltaY;
      } else {
        // ── Plain mousewheel or trackpad vertical-only → smooth zoom ──
        velZoom.current += -e.deltaY * 0.002;
      }

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
  }, [containerRef]);
}

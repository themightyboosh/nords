/**
 * useSpatialAnimations — Programmatic camera helpers (user-triggered only).
 *
 * IMPORTANT: No automatic viewport movement on selection change.
 * The canvas should NEVER move unless the user explicitly requests it.
 * Auto-fit/auto-zoom causes loss of user control (disorienting).
 *
 * These helpers can be called programmatically from UI buttons if needed.
 */

import { useReactFlow } from '@xyflow/react';
import logger from '../lib/logger';

export function useSpatialAnimations() {
  const { setCenter, getNodes, fitBounds } = useReactFlow();

  /** Fly camera to center on a specific node (call from UI only) */
  const triggerFocusFly = (nodeId: string) => {
    try {
      const n = getNodes().find(node => node.id === nodeId);
      if (n) {
        setCenter(n.position.x, n.position.y, { zoom: 1, duration: 400 });
        logger.debug('Camera fly to node', { nodeId });
      }
    } catch (err) {
      logger.error('triggerFocusFly failed', err instanceof Error ? err : new Error(String(err)));
    }
  };

  /** Fit camera to bounding box of selected nodes (call from UI only) */
  const triggerMultiSelectEqualize = () => {
    try {
      const selectedNodes = getNodes().filter(n => n.selected);
      if (selectedNodes.length >= 2) {
        const minX = Math.min(...selectedNodes.map(n => n.position.x));
        const minY = Math.min(...selectedNodes.map(n => n.position.y));
        const maxX = Math.max(...selectedNodes.map(n => n.position.x + (n.measured?.width ?? 200)));
        const maxY = Math.max(...selectedNodes.map(n => n.position.y + (n.measured?.height ?? 100)));
        fitBounds({ x: minX, y: minY, width: maxX - minX, height: maxY - minY }, { padding: 0.5, duration: 600 });
      }
    } catch (err) {
      logger.error('triggerMultiSelectEqualize failed', err instanceof Error ? err : new Error(String(err)));
    }
  };

  // NO useOnSelectionChange — viewport stays exactly where the user left it.

  return { triggerFocusFly, triggerMultiSelectEqualize };
}

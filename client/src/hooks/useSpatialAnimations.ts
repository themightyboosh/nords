import { useReactFlow, useOnSelectionChange } from '@xyflow/react';
import logger from '../lib/logger';

export function useSpatialAnimations() {
  const { setCenter, getNodes, fitBounds } = useReactFlow();

  const triggerFocusFly = (nodeId: string) => {
    try {
      const n = getNodes().find(node => node.id === nodeId);
      if (n) {
        setCenter(n.position.x, n.position.y, { zoom: 1, duration: 400 });
        logger.debug('Camera fly to node', { nodeId });
      } else {
        logger.warn('triggerFocusFly: node not found', { nodeId });
      }
    } catch (err) {
      logger.error('triggerFocusFly failed', err instanceof Error ? err : new Error(String(err)));
    }
  };

  const triggerMultiSelectEqualize = () => {
    try {
      const selectedNodes = getNodes().filter(n => n.selected);
      if (selectedNodes.length >= 2) {
        // Calculate bounding box of selected nodes
        const minX = Math.min(...selectedNodes.map(n => n.position.x));
        const minY = Math.min(...selectedNodes.map(n => n.position.y));
        const maxX = Math.max(...selectedNodes.map(n => n.position.x + (n.measured?.width ?? 200)));
        const maxY = Math.max(...selectedNodes.map(n => n.position.y + (n.measured?.height ?? 100)));

        fitBounds({ x: minX, y: minY, width: maxX - minX, height: maxY - minY }, { padding: 0.5, duration: 600 });
        logger.debug('Multi-select equalize', { count: selectedNodes.length });
      }
    } catch (err) {
      logger.error('triggerMultiSelectEqualize failed', err instanceof Error ? err : new Error(String(err)));
    }
  };

  useOnSelectionChange({
    onChange: ({ nodes }) => {
      // Only auto-fit for 2+ selected nodes (equalize view)
      // Single-select no longer flies the camera — it was causing the
      // "other cards move" bug during drag since setCenter panned the viewport.
      if (nodes.length >= 2) {
        triggerMultiSelectEqualize();
      }
    },
  });

  return { triggerFocusFly, triggerMultiSelectEqualize };
}

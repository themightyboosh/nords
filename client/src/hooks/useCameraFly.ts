import { useReactFlow } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { useCallback } from 'react';

export function useCameraFly() {
  const { setCenter, getNodes, getEdges, fitBounds } = useReactFlow();

  const flyToNode = useCallback((nodeId: string) => {
    const node = getNodes().find(n => n.id === nodeId);
    if (!node) return;

    // A more advanced focus might frame connected nodes (Phase 4.5)
    setCenter(node.position.x, node.position.y, { zoom: 1, duration: 400 });
  }, [getNodes, setCenter]);

  return { flyToNode };
}

import { useCallback } from 'react';
import type { Node } from '@xyflow/react';

export function useNodeDrag() {
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node, _nodes: Node[]) => {
      // Mock persistence for Sprint 4
      console.log(`[Mock API] Persisting node ${node.id} to position (${Math.round(node.position.x)}, ${Math.round(node.position.y)})`);
    },
    []
  );

  return { onNodeDragStop };
}

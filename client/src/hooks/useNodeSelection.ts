import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { Node } from '@xyflow/react';

export function useNodeSelection(onNordClick?: (id: string) => void) {
  const { setNodes, setEdges } = useReactFlow();

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Pass the event up to the global engine
      if (onNordClick) {
        onNordClick(node.id);
      }
      
      // In a real app we might want to also select edges or calculate connected edges
    },
    [onNordClick]
  );

  return { onNodeClick };
}

import { useStore } from '@xyflow/react';

export function useNodeCountLimit() {
  const count = useStore((s) => s.nodes.length);
  const HARD_CAP = 2500;
  
  return {
    count,
    isAtLimit: count >= HARD_CAP,
    canAdd: count < HARD_CAP,
    limit: HARD_CAP,
  };
}

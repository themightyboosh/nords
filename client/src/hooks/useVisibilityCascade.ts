import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useLens } from '../context/LensContext';

/**
 * useVisibilityCascade propagates visibility changes between nodes and edges
 * based on the Lens Context and node visibility toggling.
 * 
 * IMPORTANT: We skip calling setNodes/setEdges when nothing needs to change
 * because React Flow v12 uses a two-pass measurement system. Calling setNodes
 * during the measurement pass resets visibility:hidden and breaks rendering.
 */
export function useVisibilityCascade() {
  const { setNodes, setEdges, getEdges } = useReactFlow();
  const { lens, activeLine, showContext, hiddenTypes } = useLens();
  
  useEffect(() => {
    // In canvas mode with no hidden types, there's nothing to cascade.
    // Skip the setNodes/setEdges call to avoid interrupting React Flow's
    // internal measurement pass (which uses visibility:hidden).
    if (lens === 'canvas' && hiddenTypes.size === 0) {
      // Reset any previously applied ghosting/hiding
      setNodes((nds) => {
        const needsReset = nds.some(n => n.hidden || n.data?.isGhosted);
        if (!needsReset) return nds; // No-op — don't trigger re-render
        return nds.map(n => ({
          ...n,
          hidden: false,
          data: { ...n.data, isGhosted: false }
        }));
      });
      setEdges((eds) => {
        const needsReset = eds.some(e => e.hidden);
        if (!needsReset) return eds;
        return eds.map(e => ({
          ...e,
          hidden: false,
          data: { ...e.data, ghost: e.data?.ghost ?? false }
        }));
      });
      return;
    }

    const allEdges = getEdges();

    // 1. Calculate active nodes for link mode
    const connectedNodeIds = new Set<string>();
    if (lens === 'link') {
      allEdges.forEach(e => {
        if (e.data?.type === activeLine) {
          connectedNodeIds.add(e.source);
          connectedNodeIds.add(e.target);
        }
      });
    }

    setNodes((nds) => 
      nds.map((n) => {
        let isGhosted = false;
        let isHidden = false;

        const typeName = n.data?.type as string;

        if (lens === 'canvas') {
          // Canvas Mode: Only check the Display flyout type toggles
          if (hiddenTypes.has(typeName)) {
            isGhosted = true;
          }
        } else if (lens === 'link') {
          // Link Mode: Active if connected by activeLine type; otherwise context
          const isConnected = connectedNodeIds.has(n.id);
          if (!isConnected) {
            if (showContext) {
              isGhosted = true;
            } else {
              isHidden = true;
            }
          }
        }

        return {
          ...n,
          hidden: isHidden,
          data: {
            ...n.data,
            isGhosted
          }
        };
      })
    );

    // 2. Cascade edges
    setEdges((eds) => 
      eds.map((e) => {
        let isGhosted = false;
        let isHidden = false;

        if (lens === 'canvas') {
          isGhosted = e.data?.ghost === true;
        } else if (lens === 'link') {
          if (e.data?.type !== activeLine) {
            if (showContext) {
              isGhosted = true;
            } else {
              isHidden = true;
            }
          }
        }

        return {
          ...e,
          hidden: isHidden,
          data: {
            ...e.data,
            ghost: isGhosted
          }
        };
      })
    );
  }, [lens, activeLine, showContext, hiddenTypes, setNodes, setEdges, getEdges]);
}

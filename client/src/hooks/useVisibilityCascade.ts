import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useLens } from '../context/LensContext';

/**
 * useVisibilityCascade propagates visibility changes between nodes and edges
 * based on the active connection type and the showContext toggle.
 *
 * When a specific connection type is selected:
 *   showContext=true  → other types shown dimmed (gray)
 *   showContext=false → other types completely hidden
 *
 * When "All Lines" is selected:
 *   showContext=true  → orphaned nords shown
 *   showContext=false → orphaned nords hidden
 */
export function useVisibilityCascade() {
  const { setNodes, setEdges, getEdges } = useReactFlow();
  const { activeConnectionTypeId, showContext, hiddenTypes } = useLens();
  
  useEffect(() => {
    const allEdges = getEdges();

    // Build set of nodes connected by the active type
    const connectedNodeIds = new Set<string>();
    if (activeConnectionTypeId) {
      allEdges.forEach(e => {
        if ((e.data as any)?._typeId === activeConnectionTypeId) {
          connectedNodeIds.add(e.source);
          connectedNodeIds.add(e.target);
        }
      });
    } else {
      // All view: all connected nodes
      allEdges.forEach(e => {
        connectedNodeIds.add(e.source);
        connectedNodeIds.add(e.target);
      });
    }

    // Cascade nodes
    setNodes((nds) =>
      nds.map((n) => {
        let isGhosted = false;
        let isHidden = false;
        const typeName = n.data?.type as string;

        // Display flyout type toggles (always apply)
        if (hiddenTypes.has(typeName)) {
          isGhosted = true;
        }

        if (activeConnectionTypeId) {
          // Specific type selected: ghost/hide unconnected nords
          const isConnected = connectedNodeIds.has(n.id);
          if (!isConnected) {
            if (showContext) {
              isGhosted = true;
            } else {
              isHidden = true;
            }
          }
        } else {
          // All view: toggle orphaned nords
          const isOrphan = !connectedNodeIds.has(n.id);
          if (isOrphan && !showContext) {
            isHidden = true;
          }
        }

        return {
          ...n,
          hidden: isHidden,
          data: { ...n.data, isGhosted }
        };
      })
    );

    // Cascade edges
    setEdges((eds) =>
      eds.map((e) => {
        let isGhosted = false;
        let isHidden = false;

        if (activeConnectionTypeId) {
          // Non-active types: dim if showContext, hide if not
          if ((e.data as any)?._typeId !== activeConnectionTypeId) {
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
          data: { ...e.data, ghost: isGhosted }
        };
      })
    );
  }, [activeConnectionTypeId, showContext, hiddenTypes, setNodes, setEdges, getEdges]);
}

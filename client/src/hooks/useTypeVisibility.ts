import { useLens } from '../context/LensContext';
import { useTypeRegistry } from './useTypeRegistry';
import { useMemo } from 'react';

/**
 * Shared hook that wraps the LensContext type visibility toggles
 * with the mock registry, making it easy for the Display flyout
 * to consume and render the eye toggle list.
 */
export function useTypeVisibility() {
  const { hiddenTypes, toggleTypeVisibility } = useLens();
  const { nordTypes, connectionTypes } = useTypeRegistry();

  const visibleNodeTypes = useMemo(() => {
    return nordTypes.map(t => ({
      ...t,
      visible: !hiddenTypes.has(t.name)
    }));
  }, [nordTypes, hiddenTypes]);

  const visibleConnectionTypes = useMemo(() => {
    return connectionTypes.map(t => ({
      ...t,
      // For connections we haven't implemented per-edge toggles yet, 
      // but we prepare the interface here.
      visible: true 
    }));
  }, [connectionTypes]);

  const toggleNodeType = (name: string) => {
    toggleTypeVisibility(name);
  };

  const toggleConnectionType = (name: string) => {
    // Scaffolded for when edge toggles are added to context
  };

  return {
    visibleNodeTypes,
    visibleConnectionTypes,
    toggleNodeType,
    toggleConnectionType
  };
}

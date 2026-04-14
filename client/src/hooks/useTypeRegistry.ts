/**
 * useTypeRegistry — returns live type data from the TypeRegistryContext.
 *
 * Previously returned hardcoded mocks. Now consumes the context populated
 * by CanvasEngine via TypeRegistryProvider. The old NordTypeMock/ConnectionTypeMock
 * interfaces are preserved for backward compat with existing consumers
 * (GlobalDock, Display flyout, etc.) but now carry real database data.
 */

import { useMemo } from 'react';
import { useTypeRegistryContext } from '../context/TypeRegistryContext';
import type { LucideIcon } from 'lucide-react';

export interface NordTypeMock {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  count: number;
}

export interface ConnectionTypeMock {
  id: string;
  name: string;
  color: string;
  measurementMode: 'spectrum' | 'quadrant' | 'none';
  isSystem: boolean;
  count: number;
}

export function useTypeRegistry() {
  const { nordTypes, connectionTypes } = useTypeRegistryContext();

  // Map resolved types into the shape existing consumers expect
  const mappedNordTypes = useMemo<NordTypeMock[]>(() =>
    nordTypes.map(t => ({
      id: t.id,
      name: t.name,
      icon: t.icon,
      color: t.color,
      count: t.count,
    })),
    [nordTypes]
  );

  const mappedConnectionTypes = useMemo<ConnectionTypeMock[]>(() =>
    connectionTypes.map(t => ({
      id: t.id,
      name: t.name,
      color: t.color,
      measurementMode: t.measurementMode,
      isSystem: t.isSystem,
      count: t.count,
    })),
    [connectionTypes]
  );

  return {
    nordTypes: mappedNordTypes,
    connectionTypes: mappedConnectionTypes,
  };
}

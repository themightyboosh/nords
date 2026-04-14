/**
 * TypeRegistryContext.tsx — Provides live Nord/Connection types to the UI.
 *
 * Populated by CanvasEngine after useProjectGraph() loads.
 * Consumed by GlobalDock, RadialMenu, Display flyout, etc.
 * via the useTypeRegistry() hook.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { NordType, ConnectionType } from '../hooks/useProjectGraph';
import { resolveIcon } from '../utils/iconRegistry';
import type { LucideIcon } from 'lucide-react';

export interface ResolvedNordType {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  scaleProperty: string | null;
  propertiesSchema: Array<{ name: string; type: string; config?: Record<string, unknown> }>;
  count: number;
}

export interface ResolvedConnectionType {
  id: string;
  name: string;
  color: string;
  strokeStyle: string;
  measurementMode: 'spectrum' | 'quadrant' | 'none';
  defaultDirection: string;
  xStageLabels: string[];
  yStageLabels: string[];
  isSystem: boolean;
  count: number;
}

interface TypeRegistryContextValue {
  nordTypes: ResolvedNordType[];
  connectionTypes: ResolvedConnectionType[];
}

const TypeRegistryContext = createContext<TypeRegistryContextValue>({
  nordTypes: [],
  connectionTypes: [],
});

interface TypeRegistryProviderProps {
  rawNordTypes: NordType[];
  rawConnectionTypes: ConnectionType[];
  rawNords: { type_id: string }[];
  rawConnections: { type_id: string }[];
  children: React.ReactNode;
}

export function TypeRegistryProvider({
  rawNordTypes,
  rawConnectionTypes,
  rawNords,
  rawConnections,
  children,
}: TypeRegistryProviderProps) {
  // Pre-compute count maps from raw data
  const nordCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of rawNords) {
      map.set(n.type_id, (map.get(n.type_id) || 0) + 1);
    }
    return map;
  }, [rawNords]);

  const connCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of rawConnections) {
      map.set(c.type_id, (map.get(c.type_id) || 0) + 1);
    }
    return map;
  }, [rawConnections]);

  const nordTypes = useMemo<ResolvedNordType[]>(() =>
    rawNordTypes.map(t => ({
      id: t.id,
      name: t.name,
      icon: resolveIcon(t.icon),
      color: t.accent_color || '#4da6ff',
      scaleProperty: t.scale_property,
      propertiesSchema: t.properties_schema || [],
      count: nordCountMap.get(t.id) || 0,
    })),
    [rawNordTypes, nordCountMap]
  );

  const connectionTypes = useMemo<ResolvedConnectionType[]>(() =>
    rawConnectionTypes.map(t => ({
      id: t.id,
      name: t.name,
      color: t.accent_color || '#a78bfa',
      strokeStyle: t.stroke_style || 'solid',
      measurementMode: t.measurement_mode || 'spectrum',
      defaultDirection: t.default_direction || 'none',
      xStageLabels: t.x_stage_labels || [],
      yStageLabels: t.y_stage_labels || [],
      isSystem: t.is_system || false,
      count: connCountMap.get(t.id) || 0,
    })),
    [rawConnectionTypes, connCountMap]
  );

  return (
    <TypeRegistryContext.Provider value={{ nordTypes, connectionTypes }}>
      {children}
    </TypeRegistryContext.Provider>
  );
}

export function useTypeRegistryContext(): TypeRegistryContextValue {
  return useContext(TypeRegistryContext);
}

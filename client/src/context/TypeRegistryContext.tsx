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
}

export interface ResolvedConnectionType {
  id: string;
  name: string;
  color: string;
  strokeStyle: string;
  defaultDirection: string;
  xStageLabels: string[];
  yStageLabels: string[];
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
  children: React.ReactNode;
}

export function TypeRegistryProvider({
  rawNordTypes,
  rawConnectionTypes,
  children,
}: TypeRegistryProviderProps) {
  const nordTypes = useMemo<ResolvedNordType[]>(() =>
    rawNordTypes.map(t => ({
      id: t.id,
      name: t.name,
      icon: resolveIcon(t.icon),
      color: t.accent_color || '#4da6ff',
      scaleProperty: t.scale_property,
      propertiesSchema: t.properties_schema || [],
    })),
    [rawNordTypes]
  );

  const connectionTypes = useMemo<ResolvedConnectionType[]>(() =>
    rawConnectionTypes.map(t => ({
      id: t.id,
      name: t.name,
      color: t.accent_color || '#a78bfa',
      strokeStyle: t.stroke_style || 'solid',
      defaultDirection: t.default_direction || 'none',
      xStageLabels: t.x_stage_labels || [],
      yStageLabels: t.y_stage_labels || [],
    })),
    [rawConnectionTypes]
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

/**
 * CableSettingsContext — workspace-level cable physics tuning.
 *
 * Persisted to localStorage so values survive reloads.
 * Read by EuclideanEdge for spring constants.
 * Written by ProjectSettings "Visual Tuning" section.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface CableSettings {
  stiffness: number;  // pull toward rest (higher = snappier, less sway)
  damping: number;    // velocity decay per frame (lower = more bounces)
  amplitude: number;  // visual exaggeration of displacement
}

const DEFAULTS: CableSettings = {
  stiffness: 0.03,
  damping: 0.82,
  amplitude: 4.5,
};

const LS_KEY = 'nords-cable-settings';

function load(): CableSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      stiffness: parsed.stiffness ?? DEFAULTS.stiffness,
      damping: parsed.damping ?? DEFAULTS.damping,
      amplitude: parsed.amplitude ?? DEFAULTS.amplitude,
    };
  } catch {
    return DEFAULTS;
  }
}

interface CableSettingsContextValue {
  settings: CableSettings;
  update: (partial: Partial<CableSettings>) => void;
  reset: () => void;
}

const CableSettingsCtx = createContext<CableSettingsContextValue>({
  settings: DEFAULTS,
  update: () => {},
  reset: () => {},
});

export function CableSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CableSettings>(load);

  const update = useCallback((partial: Partial<CableSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    setSettings(DEFAULTS);
  }, []);

  return (
    <CableSettingsCtx.Provider value={{ settings, update, reset }}>
      {children}
    </CableSettingsCtx.Provider>
  );
}

export function useCableSettings() {
  return useContext(CableSettingsCtx);
}

export { DEFAULTS as CABLE_DEFAULTS };

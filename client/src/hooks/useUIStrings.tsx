/**
 * useUIStrings.ts — React context + hook for runtime UI strings.
 *
 * Fetches merged strings from GET /api/ui-strings on mount,
 * falls back to shared defaults if the API is unreachable.
 *
 * Debug mode: when `debugMode` is true, all string values are replaced
 * with [[section.key]] so you can visually spot which text is managed.
 *
 * Usage:
 *   // In App.tsx:
 *   <UIStringsProvider><App /></UIStringsProvider>
 *
 *   // In any component:
 *   const { strings } = useUIStrings();
 *   <h2>{strings.types.title}</h2>
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { api } from '../api/client';
import { UI_STRINGS_DEFAULTS, type UIStrings } from '@nords/shared/uiStringsDefaults';

interface UIStringsContextValue {
  /** Current strings (or [[key]] placeholders if debug mode is on) */
  strings: UIStrings;
  /** Re-fetch strings from the server (call after admin edits) */
  refresh: () => Promise<void>;
  loading: boolean;
  /** When true, all string values show as [[section.key]] */
  debugMode: boolean;
  setDebugMode: (on: boolean) => void;
}

const UIStringsContext = createContext<UIStringsContextValue>({
  strings: UI_STRINGS_DEFAULTS,
  refresh: async () => {},
  loading: false,
  debugMode: false,
  setDebugMode: () => {},
});

/**
 * Build a debug proxy that replaces every string value with [[section.key]].
 */
function buildDebugStrings(source: UIStrings): UIStrings {
  const result: Record<string, Record<string, string>> = {};
  for (const [section, entries] of Object.entries(source)) {
    result[section] = {};
    for (const key of Object.keys(entries as Record<string, string>)) {
      result[section][key] = `[[${section}.${key}]]`;
    }
  }
  return result as unknown as UIStrings;
}

export function UIStringsProvider({ children }: { children: ReactNode }) {
  const [rawStrings, setRawStrings] = useState<UIStrings>(UI_STRINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [debugMode, setDebugMode] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<UIStrings>('/api/ui-strings');
      setRawStrings(data);
    } catch {
      // Silently fall back to defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Memoize the debug version so it's not rebuilt every render
  const strings = useMemo(
    () => debugMode ? buildDebugStrings(rawStrings) : rawStrings,
    [rawStrings, debugMode],
  );

  return (
    <UIStringsContext.Provider value={{ strings, refresh, loading, debugMode, setDebugMode }}>
      {children}
    </UIStringsContext.Provider>
  );
}

export function useUIStrings() {
  return useContext(UIStringsContext);
}

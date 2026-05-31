/**
 * uiStrings.ts — Server-side UI string manager.
 *
 * Architecture: In-memory cache + JSON file persistence (no DB).
 *
 *   startup  → read ui-strings.json → merge with defaults → serve from memory
 *   GET      → return merged strings from memory (instant, zero I/O)
 *   PUT      → update memory + write file to disk (instant for next GET)
 *   restart  → re-read from file automatically
 *
 * If the JSON file doesn't exist, all strings come from shared defaults.
 */

import fs from 'node:fs';
import path from 'node:path';
import logger from './logger.js';
import { UI_STRINGS_DEFAULTS, type UIStrings } from '@nords/shared/uiStringsDefaults.js';

// ── File path for override persistence ──
const DATA_DIR = process.env.UI_STRINGS_DIR || path.resolve(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'ui-strings.json');

// ── In-memory override cache (only stores non-default values) ──
let overrides: Record<string, Record<string, string>> = {};

// ── Load overrides from disk on module init ──
function loadFromDisk(): void {
  try {
    if (fs.existsSync(FILE_PATH)) {
      const raw = fs.readFileSync(FILE_PATH, 'utf-8');
      overrides = JSON.parse(raw);
      logger.info('UI strings overrides loaded from disk', { path: FILE_PATH, sections: Object.keys(overrides).length });
    } else {
      logger.info('No UI strings override file found — using defaults', { path: FILE_PATH });
    }
  } catch (err: any) {
    logger.warn('Failed to load UI strings override file — using defaults', { error: err.message });
    overrides = {};
  }
}

// ── Persist overrides to disk ──
function writeToDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(overrides, null, 2), 'utf-8');
  } catch (err: any) {
    logger.error('Failed to write UI strings override file', { error: err.message });
  }
}

// ── Deep merge: defaults + overrides ──
function mergeStrings(): UIStrings {
  const result: Record<string, Record<string, string>> = {};

  for (const [section, entries] of Object.entries(UI_STRINGS_DEFAULTS)) {
    result[section] = { ...entries };
    if (overrides[section]) {
      for (const [key, value] of Object.entries(overrides[section])) {
        if (key in entries) {
          result[section][key] = value;
        }
      }
    }
  }

  return result as unknown as UIStrings;
}

// ── Public API ──

/** Get the current merged strings (defaults + overrides). Reads from memory only. */
export function getUIStrings(): UIStrings {
  return mergeStrings();
}

/** Get just the overrides (for the admin panel to show what's been customized). */
export function getUIStringOverrides(): Record<string, Record<string, string>> {
  return overrides;
}

/**
 * Update string overrides. Merges with existing overrides.
 * Pass a value identical to the default to clear the override for that key.
 */
export function updateUIStrings(patch: Record<string, Record<string, string>>): UIStrings {
  for (const [section, entries] of Object.entries(patch)) {
    if (!(section in UI_STRINGS_DEFAULTS)) continue; // Ignore unknown sections

    const defaults = UI_STRINGS_DEFAULTS[section as keyof UIStrings];
    if (!overrides[section]) overrides[section] = {};

    for (const [key, value] of Object.entries(entries)) {
      if (!(key in defaults)) continue; // Ignore unknown keys

      // If value matches default, remove the override
      if (value === (defaults as Record<string, string>)[key]) {
        delete overrides[section][key];
      } else {
        overrides[section][key] = value;
      }
    }

    // Clean up empty sections
    if (Object.keys(overrides[section]).length === 0) {
      delete overrides[section];
    }
  }

  writeToDisk();
  return mergeStrings();
}

/** Reset all overrides back to defaults. */
export function resetUIStrings(): UIStrings {
  overrides = {};
  writeToDisk();
  return mergeStrings();
}

// ── Initialize on import ──
loadFromDisk();

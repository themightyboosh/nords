/**
 * uiStrings.ts — Re-exports UI string defaults for backward compatibility.
 *
 * Components that haven't migrated to useUIStrings() yet can still import
 * UI_STRINGS from here. These are the static defaults — no runtime overrides.
 *
 * Prefer useUIStrings() hook for runtime-overridable strings.
 */

export { UI_STRINGS_DEFAULTS as UI_STRINGS } from '@nords/shared/uiStringsDefaults';

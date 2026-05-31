/**
 * propertyTypes.ts — Single source of truth for property type definitions.
 *
 * Imported by both server (Zod schemas, validation, toolDispatch)
 * and client (ManageTypes, PropertyField, ManageVariables, useTypeMutations).
 *
 * "Required" semantics vary by context:
 *   - Nord/Category properties: the instance must have this field filled.
 *   - Collection variables: the variable is required by any linked goal.
 *
 * ═══════════════════════════════════════════════════════════════
 *  To add a new property type:
 *    1. Add it to PROPERTY_TYPES array
 *    2. Add its metadata to PROPERTY_TYPE_META
 *    3. Add its UI renderer case to PropertyField.tsx
 *    That's it. Everything else derives from these definitions.
 * ═══════════════════════════════════════════════════════════════
 */

// ── Canonical Property Types ──

export const PROPERTY_TYPES = [
  // Text
  'short_text',
  'long_text',
  'url',
  'email',
  'phone',
  // Numeric
  'number',
  'currency',
  'percentage',
  // Date
  'date',
  'date_range',
  // Selection
  'select',
  'multi_select',
  // Other
  'boolean',
  'tags',
  'computed',
  // System / reserved (accepted by server, not in UI type picker)
  'stage',
  'user',
  'nord_reference',
  'file',
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

// ── Metadata Registry ──

export interface PropertyTypeMeta {
  /** Human-friendly label shown in dropdowns (e.g. "Short Text") */
  label: string;
  /** Compatibility group — controls default-value preservation on type change */
  group: string;
  /** Does this type require an options[] array? (select, multi_select) */
  needsOptions: boolean;
  /** Can this type have a defaultValue? */
  supportsDefault: boolean;
  /** Lucide icon name for UI badges */
  icon: string;
}

export const PROPERTY_TYPE_META: Record<PropertyType, PropertyTypeMeta> = {
  short_text:     { label: 'Short Text',     group: 'text',     needsOptions: false, supportsDefault: true,  icon: 'Type' },
  long_text:      { label: 'Long Text',      group: 'text',     needsOptions: false, supportsDefault: true,  icon: 'AlignLeft' },
  url:            { label: 'URL',            group: 'text',     needsOptions: false, supportsDefault: true,  icon: 'Link' },
  email:          { label: 'Email',          group: 'text',     needsOptions: false, supportsDefault: true,  icon: 'Mail' },
  phone:          { label: 'Phone',          group: 'text',     needsOptions: false, supportsDefault: true,  icon: 'Phone' },
  number:         { label: 'Number',         group: 'number',   needsOptions: false, supportsDefault: true,  icon: 'Hash' },
  currency:       { label: 'Currency',       group: 'number',   needsOptions: false, supportsDefault: true,  icon: 'DollarSign' },
  percentage:     { label: 'Percentage',     group: 'number',   needsOptions: false, supportsDefault: true,  icon: 'Percent' },
  date:           { label: 'Date',           group: 'date',     needsOptions: false, supportsDefault: true,  icon: 'Calendar' },
  date_range:     { label: 'Date Range',     group: 'date',     needsOptions: false, supportsDefault: false, icon: 'CalendarRange' },
  select:         { label: 'Dropdown',       group: 'select',   needsOptions: true,  supportsDefault: true,  icon: 'ChevronDown' },
  multi_select:   { label: 'Multi-Select',   group: 'select',   needsOptions: true,  supportsDefault: false, icon: 'ListChecks' },
  boolean:        { label: 'Yes / No',       group: 'boolean',  needsOptions: false, supportsDefault: true,  icon: 'ToggleLeft' },
  tags:           { label: 'Tags',           group: 'tags',     needsOptions: false, supportsDefault: false, icon: 'Tag' },
  computed:       { label: 'Computed ƒ',     group: 'computed', needsOptions: false, supportsDefault: false, icon: 'Calculator' },
  stage:          { label: 'Stage',          group: 'system',   needsOptions: false, supportsDefault: false, icon: 'Layers' },
  user:           { label: 'User',           group: 'system',   needsOptions: false, supportsDefault: false, icon: 'User' },
  nord_reference: { label: 'Nord Reference', group: 'system',   needsOptions: false, supportsDefault: false, icon: 'Link2' },
  file:           { label: 'File',           group: 'system',   needsOptions: false, supportsDefault: false, icon: 'File' },
};

// ── Helpers ──

/** Does this property type require an options[] array? */
export function needsOptions(type: PropertyType): boolean {
  return PROPERTY_TYPE_META[type]?.needsOptions ?? false;
}

/** Human-friendly display label for a property type */
export function getDisplayLabel(type: PropertyType): string {
  return PROPERTY_TYPE_META[type]?.label ?? type;
}

/** Compatibility group for default-value preservation on type change */
export function getCompatGroup(type: PropertyType): string {
  return PROPERTY_TYPE_META[type]?.group ?? type;
}

/** Check if a property type supports a default value */
export function supportsDefault(type: PropertyType): boolean {
  return PROPERTY_TYPE_META[type]?.supportsDefault ?? false;
}

/**
 * Property types shown in the UI type picker dropdown.
 * Excludes system/reserved types (stage, user, nord_reference, file).
 */
export const UI_PROPERTY_TYPES = PROPERTY_TYPES.filter(
  t => PROPERTY_TYPE_META[t].group !== 'system'
);

// ── Legacy Type Normalization ──

/**
 * Maps old (v1) property type names to their canonical equivalents.
 * Used during read to normalize before rendering or validation.
 */
export const LEGACY_TYPE_MAP: Record<string, PropertyType> = {
  string:   'short_text',
  text:     'short_text',
  markdown: 'long_text',
  // The rest are unchanged: number, date, url, select, tags, computed, boolean
};

/**
 * Normalize a property type string — handles both legacy and canonical names.
 * Safe to call on values that are already canonical.
 */
export function normalizePropertyType(type: string): PropertyType {
  if (LEGACY_TYPE_MAP[type]) return LEGACY_TYPE_MAP[type];
  // Verify it's a known canonical type, fallback to short_text
  if ((PROPERTY_TYPES as readonly string[]).includes(type)) return type as PropertyType;
  return 'short_text';
}

/**
 * All valid type strings (canonical + legacy) that the server should accept.
 * Used in Zod schemas to be lenient at the boundary.
 */
export const ALL_ACCEPTED_TYPES = [
  ...PROPERTY_TYPES,
  ...Object.keys(LEGACY_TYPE_MAP),
] as const;

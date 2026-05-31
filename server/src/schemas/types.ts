/**
 * Zod schemas for Nord Type and Connection Type endpoints.
 *
 * Types define the schema of the graph — what kinds of nodes and edges
 * exist, what properties they carry, and how they are visualized.
 */

import { z } from 'zod';
import {
  PROPERTY_TYPES,
  LEGACY_TYPE_MAP,
  type PropertyType,
} from '@nords/shared/propertyTypes.js';

// ── Shared: Property Schema (column definition for JSONB properties) ──

// Accept canonical types directly, plus legacy names via transform
const PropertyTypeField = z.string()
  .transform((val): PropertyType => {
    if (LEGACY_TYPE_MAP[val]) return LEGACY_TYPE_MAP[val];
    if ((PROPERTY_TYPES as readonly string[]).includes(val)) return val as PropertyType;
    return 'short_text'; // safe fallback
  })
  .describe('Data type of the property — determines the UI control and validation');

export const PropertySchemaItem = z.preprocess(
  // Normalize legacy { key, label } format → canonical { name }
  (val: any) => {
    if (val && typeof val === 'object' && !val.name && (val.label || val.key)) {
      return { ...val, name: val.label || val.key };
    }
    return val;
  },
  z.object({
    name: z.string().min(1)
      .describe('Property name (column heading) — must be unique within the type'),
    type: PropertyTypeField,
    required: z.boolean().optional().default(false)
      .describe('Whether this property must have a value'),
    defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional()
      .describe('Default value when a new nord/connection is created'),
    options: z.array(z.string()).optional()
      .describe('Valid options for select/multi_select types'),
    card_row: z.number().int().min(0).max(6).optional().nullable()
      .describe('Which row of the card UI displays this property (0/null = hidden)'),
    config: z.record(z.unknown()).optional()
      .describe('Type-specific configuration (e.g., currency symbol, date format)'),
  }).passthrough()  // Allow extra fields (key, label, mcp_visible) without failing
);

// ── Stage Labels (spectrum/board column definitions) ──

export const StageLabelItem = z.object({
  label: z.string().min(1).describe('Display name for this stage'),
  position: z.number().min(0).max(1).describe('Normalized position along the 0.0–1.0 axis'),
});

// ── Nord Types ──

export const CreateNordTypeSchema = z.object({
  name: z.string().min(1).max(100).default('New Type')
    .describe('Name of the nord type (e.g., "Bug", "Person", "Milestone")'),
  description: z.string().max(500).optional().nullable()
    .describe('What this type represents in the domain'),
  icon: z.string().max(50).optional().nullable()
    .describe('Lucide icon name (e.g., "Bug", "User", "Flag")'),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable()
    .describe('Hex color for visual distinction (e.g., "#4da6ff")'),
  properties_schema: z.array(PropertySchemaItem).optional().default([])
    .describe('Column definitions for the dynamic JSONB properties on nords of this type'),
  scale_property: z.string().optional().nullable()
    .describe('Property name whose value controls the visual size of the nord in graph view'),
});

export const UpdateNordTypeSchema = z.object({
  name: z.string().min(1).max(100).optional()
    .describe('Display name of the nord type'),
  description: z.string().max(500).optional().nullable()
    .describe('What this type represents'),
  icon: z.string().max(50).optional().nullable()
    .describe('Lucide icon name'),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable()
    .describe('Hex color'),
  properties_schema: z.array(PropertySchemaItem).optional()
    .describe('Column definitions for dynamic properties'),
  scale_property: z.string().optional().nullable()
    .describe('Property name controlling visual scale'),
  sort_order: z.number().int().min(0).optional()
    .describe('Display order in the type list'),
});

// ── Connection Types ──

export const CreateConnectionTypeSchema = z.object({
  name: z.string().min(1).max(100).default('New Connection')
    .describe('Name of the relationship type (e.g., "Blocks", "Depends On", "Reports To")'),
  description: z.string().max(500).optional().nullable()
    .describe('What this relationship represents in the domain'),
  icon: z.string().max(50).optional().nullable()
    .describe('Lucide icon name (e.g., "Link", "ArrowRight", "GitBranch")'),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable()
    .describe('Hex color for the edge line'),
  stroke_style: z.enum(['solid', 'dashed', 'dotted']).optional().default('solid')
    .describe('Visual style of the edge line'),
  default_direction: z.enum(['forward', 'reverse', 'both', 'none']).optional().default('none')
    .describe('Default arrow direction when a new connection is created'),
  verb: z.string().max(50).optional().nullable()
    .describe('Action verb for the relationship (e.g., "blocks", "depends on")'),
  direction_filter: z.enum(['all', 'forward', 'reverse', 'both', 'none']).optional().default('all')
    .describe('Which direction options are available in the UI'),
  x_stage_labels: z.array(StageLabelItem).optional().default([])
    .describe('Stage labels for the horizontal spectrum axis (e.g., ["To Do", "In Progress", "Done"])'),
  y_stage_labels: z.array(StageLabelItem).optional().default([])
    .describe('Stage labels for the vertical axis (reserved for future quadrant mode)'),
  properties_schema: z.array(PropertySchemaItem).optional().default([])
    .describe('Column definitions for dynamic properties on connections of this type'),
});

export const UpdateConnectionTypeSchema = z.object({
  name: z.string().min(1).max(100).optional()
    .describe('Display name of the connection type'),
  description: z.string().max(500).optional().nullable()
    .describe('What this relationship represents'),
  icon: z.string().max(50).optional().nullable()
    .describe('Lucide icon name'),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable()
    .describe('Hex color for the edge'),
  stroke_style: z.enum(['solid', 'dashed', 'dotted']).optional()
    .describe('Visual line style'),
  default_direction: z.enum(['forward', 'reverse', 'both', 'none']).optional()
    .describe('Default arrow direction for new connections'),
  direction_filter: z.enum(['all', 'forward', 'reverse', 'both', 'none']).optional()
    .describe('Which direction options are available in the UI'),
  direction_prepositions: z.object({
    forward: z.string(),
    reverse: z.string(),
    both: z.string(),
  }).optional().nullable()
    .describe('Preposition labels for each direction'),
  measurement_mode: z.enum(['spectrum', 'none']).optional()
    .describe('How connections of this type use the distance axes'),
  verb: z.string().max(50).optional().nullable()
    .describe('Action verb'),
  x_stage_labels: z.array(StageLabelItem).optional()
    .describe('Horizontal spectrum stage labels'),
  y_stage_labels: z.array(StageLabelItem).optional()
    .describe('Vertical axis stage labels'),
  properties_schema: z.array(PropertySchemaItem).optional()
    .describe('Dynamic property column definitions'),
  sort_order: z.number().int().min(0).optional()
    .describe('Display order in the type list'),
});

// ── Project-Type Association ──

export const AssociateTypeSchema = z.object({
  type_id: z.string().uuid()
    .describe('ID of the nord type or connection type to associate'),
  type_kind: z.enum(['nord', 'connection'])
    .describe('Whether this is a nord type or connection type'),
});

export const DissociateTypeSchema = z.object({
  type_id: z.string().uuid()
    .describe('ID of the type to remove from the project'),
});

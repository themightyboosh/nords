/**
 * Zod schemas for Nords and Connections (graph data endpoints).
 *
 * Nords are node cards. Connections are typed edges with spectrum positions.
 * Both carry dynamic JSONB properties defined by their type's schema.
 */

import { z } from 'zod';

// ── Nords ──

export const CreateNordSchema = z.object({
  type_id: z.string().uuid()
    .describe('Nord type ID — determines the property schema, icon, and accent color'),
  title: z.string().min(1).max(500).default('New Nord')
    .describe('Display title of the node card'),
  description: z.string().max(5000).optional().nullable()
    .describe('Rich text description (markdown supported)'),
  properties: z.record(z.unknown()).optional().default({})
    .describe('Dynamic JSONB properties — keys must match the nord type property schema'),
  position_x: z.number().min(-10).max(10).default(0)
    .describe('Horizontal position in the graph canvas (normalized coordinates)'),
  position_y: z.number().min(-10).max(10).default(0)
    .describe('Vertical position in the graph canvas (normalized coordinates)'),
  scale: z.number().min(0.1).max(10).default(1.0)
    .describe('Visual scale multiplier (1.0 = default size)'),
});

export const UpdateNordSchema = z.object({
  title: z.string().min(1).max(500).optional()
    .describe('Display title'),
  description: z.string().max(5000).optional().nullable()
    .describe('Rich text description'),
  properties: z.record(z.unknown()).optional()
    .describe('Dynamic JSONB properties — partial updates merge with existing'),
  position_x: z.number().min(-10).max(10).optional()
    .describe('Horizontal canvas position'),
  position_y: z.number().min(-10).max(10).optional()
    .describe('Vertical canvas position'),
  scale: z.number().min(0.1).max(10).optional()
    .describe('Visual scale multiplier'),
});

export const BatchPositionUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.string().uuid().describe('Nord ID'),
    x: z.number().describe('New horizontal position'),
    y: z.number().describe('New vertical position'),
  })).min(1).max(500)
    .describe('Array of position updates to apply in a single database round trip'),
});

// ── Connections ──

export const CreateConnectionSchema = z.object({
  type_id: z.string().uuid()
    .describe('Connection type ID — defines the relationship category, stage labels, and visual style'),
  source_nord_id: z.string().uuid()
    .describe('Source nord (edge origin) — the "from" side of the relationship'),
  target_nord_id: z.string().uuid()
    .describe('Target nord (edge destination) — the "to" side of the relationship'),
  direction: z.enum(['forward', 'reverse', 'both', 'none']).default('none')
    .describe('Arrow directionality: forward = source→target, reverse = target→source, both = bidirectional, none = undirected'),
  distance_x: z.number().min(0).max(1).default(0.5)
    .describe('Spectrum position (0.0–1.0) along the connection type x-axis stage labels. Controls board column placement.'),
  distance_y: z.number().min(0).max(1).default(0.5)
    .describe('Vertical axis position (0.0–1.0). Reserved for future quadrant mode.'),
  properties: z.record(z.unknown()).optional().default({})
    .describe('Dynamic JSONB properties matching the connection type schema'),
});

export const UpdateConnectionSchema = z.object({
  direction: z.enum(['forward', 'reverse', 'both', 'none']).optional()
    .describe('Arrow directionality'),
  distance_x: z.number().min(0).max(1).optional()
    .describe('Spectrum position along x-axis stage labels'),
  distance_y: z.number().min(0).max(1).optional()
    .describe('Vertical axis position'),
  properties: z.record(z.unknown()).optional()
    .describe('Dynamic JSONB properties — partial update'),
  sort_order: z.number().int().min(0).optional()
    .describe('Within-column ordering for board view (lower = higher in column)'),
});

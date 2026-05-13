/**
 * Zod schemas for Persona endpoints.
 *
 * Personas are AI lens configurations that weight different Nord types
 * and categories differently. Each persona has up to 5 mental models
 * that define behavioral guardrails and focus areas.
 */

import { z } from 'zod';

// ── Personas ──

export const CreatePersonaSchema = z.object({
  name: z.string().min(1).max(100)
    .describe('Display name of the persona (e.g., "Engineering Lead", "Product Owner")'),
  avatar_seed: z.string().max(100).optional().nullable()
    .describe('Seed string for deterministic avatar generation (DiceBear)'),
});

export const UpdatePersonaSchema = z.object({
  name: z.string().min(1).max(100).optional()
    .describe('Display name'),
  description: z.string().max(1000).optional().nullable()
    .describe('Role description and behavioral context for AI interactions'),
  avatar_seed: z.string().max(100).optional().nullable()
    .describe('Avatar generation seed'),
  accent_hue: z.number().int().min(0).max(360).optional()
    .describe('HSL hue value (0–360) for the persona accent color'),
  temperature: z.number().min(0).max(2).optional()
    .describe('AI response temperature (0.0 = deterministic, 1.0 = balanced/Gemini default, 2.0 = maximum creativity)'),
  sort_order: z.number().int().min(0).optional()
    .describe('Display order in the persona list'),
});

// ── Mental Models ──

export const CreateMentalModelSchema = z.object({
  title: z.string().min(1).max(200)
    .describe('Short title of the mental model (e.g., "Risk Assessment", "Resource Allocation")'),
  body: z.string().max(5000).optional().nullable()
    .describe('Detailed description — used as system prompt context for AI interactions'),
});

export const UpdateMentalModelSchema = z.object({
  title: z.string().min(1).max(200).optional()
    .describe('Mental model title'),
  body: z.string().max(5000).optional().nullable()
    .describe('Detailed description / system prompt context'),
});

export const ReorderMentalModelsSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1).max(5)
    .describe('Ordered array of mental model UUIDs representing the new sort order'),
});

// ── Category Weights ──

export const UpsertCategoryWeightSchema = z.object({
  weight: z.number().min(-100).max(100)
    .describe('Relevance weight for this connection type category (-100 = suppress, 0 = neutral, 100 = prioritize)'),
});

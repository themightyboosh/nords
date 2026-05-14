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
  avatar_seed: z.string().max(100).optional().nullable()
    .describe('Avatar generation seed'),
  accent_color: z.string().max(20).optional().nullable()
    .describe('Hex color string for the persona accent (e.g., "#3d4f7c")'),
  background: z.string().max(2000).optional().nullable()
    .describe('Persona background and role context'),
  primary_motivation: z.string().max(2000).optional().nullable()
    .describe('Core motivation driving this persona'),
  voice_and_tone: z.string().max(2000).optional().nullable()
    .describe('Communication style and tone'),
  guardrails: z.array(z.object({
    mode: z.enum(['always', 'never']),
    text: z.string().max(500),
  })).optional().nullable()
    .describe('Behavioral guardrails — always/never rules for AI responses'),
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

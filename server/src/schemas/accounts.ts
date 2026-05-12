/**
 * Zod schemas for Account and billing endpoints.
 */

import { z } from 'zod';

export const CreateAccountSchema = z.object({
  name: z.string().min(1).max(200)
    .describe('Display name of the billing account'),
  billing_email: z.string().email().optional().nullable()
    .describe('Email address for invoices and billing notifications'),
});

export const UpdateAccountSchema = z.object({
  name: z.string().min(1).max(200).optional()
    .describe('Display name'),
  billing_email: z.string().email().optional().nullable()
    .describe('Billing notification email'),
  plan: z.enum(['free', 'pro', 'enterprise']).optional()
    .describe('Billing plan tier'),
  status: z.enum(['active', 'suspended', 'closed']).optional()
    .describe('Account lifecycle status'),
});

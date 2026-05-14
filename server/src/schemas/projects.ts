/**
 * Zod schemas for Project endpoints.
 *
 * Every field carries a .describe() annotation so downstream
 * consumers (MCP tools, OpenAPI generators) get semantic context.
 */

import { z } from 'zod';

export const CreateProjectSchema = z.object({
  org_id: z.string().uuid().optional()
    .describe('Organization ID. Defaults to the dev placeholder in single-user mode.'),
  name: z.string().min(1).max(200)
    .describe('Human-readable project name'),
  description: z.string().min(1).max(2000)
    .describe('Brief description of the project scope and purpose'),
  purpose: z.string().min(1).max(2000)
    .describe('Why this project exists — guides AI personas and MCP interactions'),
  icon: z.string().max(10).optional().nullable()
    .describe('Emoji or short icon identifier'),
  mcp_enabled: z.boolean().default(false)
    .describe('Whether MCP (Model Context Protocol) integration is active'),
  mcp_capture_data: z.boolean().default(false)
    .describe('Whether MCP interactions capture data into the graph'),
  mcp_mutable: z.boolean().default(false)
    .describe('Whether MCP can mutate graph data (experimental)'),
  mcp_system_prompt: z.string().max(50000).optional().nullable()
    .describe('System prompt for MCP agent sessions. Combined with auto-generated schema context and persona at session start.'),
  default_persona_id: z.string().uuid().optional().nullable()
    .describe('Default persona lens for AI interactions'),
  default_start_nord_id: z.string().uuid().optional().nullable()
    .describe('Default starting nord for graph navigation'),
  default_end_nord_id: z.string().uuid().optional().nullable()
    .describe('Default end nord — session transitions here when all required properties are met'),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional()
    .describe('Human-readable project name'),
  description: z.string().max(2000).optional().nullable()
    .describe('Brief description of the project'),
  purpose: z.string().max(2000).optional().nullable()
    .describe('Why this project exists'),
  icon: z.string().max(10).optional().nullable()
    .describe('Emoji or short icon identifier'),
  mcp_enabled: z.boolean().optional()
    .describe('Whether MCP integration is active'),
  mcp_capture_data: z.boolean().optional()
    .describe('Whether MCP captures data into the graph'),
  mcp_mutable: z.boolean().optional()
    .describe('Whether MCP can mutate graph data'),
  mcp_system_prompt: z.string().max(50000).optional().nullable()
    .describe('System prompt for MCP agent sessions'),
  default_persona_id: z.string().uuid().optional().nullable()
    .describe('Default persona lens for AI interactions'),
  default_start_nord_id: z.string().uuid().optional().nullable()
    .describe('Default starting nord for navigation'),
  default_end_nord_id: z.string().uuid().optional().nullable()
    .describe('Default end nord for session completion'),
});

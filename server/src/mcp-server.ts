/**
 * mcp-server.ts — Native MCP adapter for external clients.
 *
 * Wraps the Nords MCP tools using the @modelcontextprotocol/sdk
 * so external AI clients (Claude Desktop, Cursor, etc.) can connect
 * via stdio transport.
 *
 * Configuration (env vars):
 *   DATABASE_URL  — Postgres connection string (required)
 *   PROJECT_ID    — Default project to operate on (required)
 *   PERSONA_ID    — Default persona (optional)
 *   START_NORD_ID — Default start nord (optional)
 *
 * Usage:
 *   npx tsx src/mcp-server.ts
 *
 * Claude Desktop config (claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "nords": {
 *         "command": "npx",
 *         "args": ["tsx", "/path/to/nords/server/src/mcp-server.ts"],
 *         "env": {
 *           "DATABASE_URL": "postgres://...",
 *           "PROJECT_ID": "your-project-uuid"
 *         }
 *       }
 *     }
 *   }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { dispatchTool, type ToolContext } from './lib/toolDispatch.js';
import * as mcpRepo from './repositories/mcpSessions.js';

// ── Session Management ──

let currentSessionId: string | null = null;

async function ensureSession(projectId: string): Promise<string> {
  if (currentSessionId) return currentSessionId;

  const personaId = process.env.PERSONA_ID || null;
  const startNordId = process.env.START_NORD_ID || null;

  const session = await mcpRepo.createSession(projectId, personaId, startNordId);
  currentSessionId = session.id;
  return session.id;
}

function getToolContext(sessionId: string): ToolContext {
  return {
    sessionId,
    projectId: process.env.PROJECT_ID || '',
    mcpMutable: process.env.MCP_MUTABLE === 'true',
  };
}

// ── Server Setup ──

const server = new McpServer({
  name: 'nords-mcp',
  version: '1.0.0',
});

// ── Tier 1: Read-Only Tools ──

server.tool('nords_get_dictionary',
  'Get the project dictionary — full ontology of nord types, connection types (verbs, stages), and personas. Call this FIRST.',
  {},
  async () => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_get_dictionary', getToolContext(sid), {});
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }] };
  }
);

server.tool('nords_get_horizon',
  'Get Session Horizon — current position, persona-weighted neighbors, completion %, predicted path.',
  {},
  async () => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_get_horizon', getToolContext(sid), {});
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }] };
  }
);

server.tool('nords_get_graph',
  'Get the full project graph with all nords, connections, and types.',
  {},
  async () => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_get_graph', getToolContext(sid), {});
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }] };
  }
);

server.tool('nords_get_nord',
  'Get a single nord by ID with all its properties.',
  { nord_id: z.string().describe('UUID of the nord') },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_get_nord', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data ?? result.error, null, 2) }] };
  }
);

server.tool('nords_query_nords',
  'Search nords by type and/or title substring.',
  {
    type_id: z.string().optional().describe('Filter by nord type UUID'),
    title: z.string().optional().describe('Search by title (case-insensitive)'),
  },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_query_nords', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }] };
  }
);

server.tool('nords_get_connections',
  'Get all connections to/from a specific nord.',
  { nord_id: z.string().describe('UUID of the nord') },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_get_connections', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }] };
  }
);

server.tool('nords_get_session_state',
  'Get full session state: position, session nords, traversals.',
  {},
  async () => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_get_session_state', getToolContext(sid), {});
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }] };
  }
);

server.tool('nords_get_incomplete_nords',
  'Get nords with unfilled required properties.',
  {},
  async () => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_get_incomplete_nords', getToolContext(sid), {});
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }] };
  }
);

// ── Tier 2: Session Tools ──

server.tool('nords_traverse_connection',
  'Move to a connected nord. Returns updated horizon.',
  {
    connection_id: z.string().describe('UUID of the connection'),
    source_nord_id: z.string().describe('UUID of the source nord'),
    target_nord_id: z.string().describe('UUID of the target nord'),
    direction: z.enum(['forward', 'backward']).describe('Direction of traversal'),
    traversal_type: z.enum(['read', 'advance', 'rework', 'create', 'assign', 'evaluate']).describe('Why you are traversing'),
  },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_traverse_connection', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data ?? result.error, null, 2) }] };
  }
);

server.tool('nords_update_session_nord',
  'Save collected properties to a session nord. Validates against schema.',
  {
    nord_id: z.string().describe('UUID of the nord'),
    properties: z.record(z.unknown()).describe('Key-value pairs of collected properties'),
    required_count: z.number().optional().describe('Total required fields'),
    filled_count: z.number().optional().describe('Filled required fields'),
  },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_update_session_nord', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data ?? result.error, null, 2) }] };
  }
);

server.tool('nords_visit_nord',
  'Log a visit event with optional before/after snapshots.',
  {
    nord_id: z.string().describe('UUID of the nord'),
    visit_type: z.enum(['inspect', 'update', 'complete', 'create', 'gate_check']).describe('Type of visit'),
    properties_before: z.record(z.unknown()).optional().describe('Properties before'),
    properties_after: z.record(z.unknown()).optional().describe('Properties after'),
  },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_visit_nord', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data ?? result.error, null, 2) }] };
  }
);

server.tool('nords_switch_persona',
  'Switch the active persona lens. Returns reweighted horizon.',
  { persona_id: z.string().nullable().describe('UUID of the persona, or null to clear') },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_switch_persona', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data ?? result.error, null, 2) }] };
  }
);

// ── Tier 3: Mutable Tools (only when MCP_MUTABLE=true) ──

server.tool('nords_create_nord',
  'Create a new nord.',
  {
    type_id: z.string().describe('UUID of the nord type'),
    title: z.string().describe('Title'),
    properties: z.record(z.unknown()).optional().describe('Initial properties'),
  },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_create_nord', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data ?? result.error, null, 2) }] };
  }
);

server.tool('nords_update_nord',
  'Update an existing nord.',
  {
    nord_id: z.string().describe('UUID of the nord'),
    title: z.string().optional().describe('New title'),
    properties: z.record(z.unknown()).optional().describe('Updated properties'),
  },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_update_nord', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data ?? result.error, null, 2) }] };
  }
);

server.tool('nords_delete_nord',
  'Soft-delete a nord.',
  { nord_id: z.string().describe('UUID') },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_delete_nord', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data ?? result.error, null, 2) }] };
  }
);

server.tool('nords_create_connection',
  'Create a typed connection.',
  {
    type_id: z.string().describe('Connection type UUID'),
    source_nord_id: z.string().describe('Source nord UUID'),
    target_nord_id: z.string().describe('Target nord UUID'),
    direction: z.string().optional().describe('Direction'),
    distance_x: z.number().optional().describe('X spectrum position'),
    distance_y: z.number().optional().describe('Y spectrum position'),
  },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_create_connection', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data ?? result.error, null, 2) }] };
  }
);

server.tool('nords_update_connection',
  'Update connection distance, direction, or properties.',
  {
    connection_id: z.string().describe('Connection UUID'),
    distance_x: z.number().optional(),
    distance_y: z.number().optional(),
    direction: z.string().optional(),
    properties: z.record(z.unknown()).optional(),
  },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_update_connection', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data ?? result.error, null, 2) }] };
  }
);

server.tool('nords_delete_connection',
  'Soft-delete a connection.',
  { connection_id: z.string().describe('Connection UUID') },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_delete_connection', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.data ?? result.error, null, 2) }] };
  }
);

// ── Start ──

async function main() {
  if (!process.env.PROJECT_ID) {
    console.error('Error: PROJECT_ID environment variable is required');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Nords MCP server started (project: ${process.env.PROJECT_ID})`);
}

main().catch((err) => {
  console.error('Fatal MCP server error:', err);
  process.exit(1);
});

/**
 * mcp-server.ts — Standard MCP adapter for any LLM client.
 *
 * Exposes the Nords knowledge graph as MCP tools over stdio transport.
 * Compatible with any client that implements the Model Context Protocol:
 * Claude Desktop, Cursor, Antigravity, OpenAI-compatible clients, etc.
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
 * Generic MCP client config:
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
import { createLogger, format, transports } from 'winston';
import { dispatchTool, type ToolContext } from './lib/toolDispatch.js';
import * as mcpRepo from './repositories/mcpSessions.js';
import { stripNulls } from './repositories/mcpSessions.js';
import { query } from './db.js';
import { nordTypesRepo, connectionTypesRepo } from './repositories/types.js';

// Wrap tool result in JSON, stripping null values for token savings
function toJson(data: unknown): string {
  return JSON.stringify(stripNulls(data), null, 2);
}

// MCP uses stdio transport — stdout is reserved for protocol messages.
// We create a dedicated stderr logger so structured logs don't corrupt the protocol.
const mcpLogger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  defaultMeta: { service: 'nords-mcp' },
  transports: [new transports.Console({ stderrLevels: ['error', 'warn', 'info', 'debug'] })],
});

// ── Project Context for Tool Descriptions ──
// Built at startup and injected into key tool descriptions so external
// LLM clients get zero-shot orientation from project vocabulary.

let projectContext = '';

async function buildProjectContext(): Promise<string> {
  const projectId = process.env.PROJECT_ID!;
  try {
    const nordTypes = await nordTypesRepo.findByProject(projectId);
    const connTypes = await connectionTypesRepo.findByProject(projectId);
    const personas = await query<{ name: string }>(
      'SELECT name FROM personas WHERE project_id = $1 AND deleted_at IS NULL', [projectId]
    );
    const project = await query<{ project_mode: string }>(
      'SELECT project_mode FROM projects WHERE id = $1', [projectId]
    );
    const parts: string[] = [];
    if (project[0]?.project_mode) parts.push(`Mode: ${project[0].project_mode}`);
    if (nordTypes.length > 0) parts.push(`Nord types: ${nordTypes.map(t => t.name).join(', ')}`);
    if (connTypes.length > 0) {
      parts.push(`Connection types: ${connTypes.map(ct => {
        let s = ct.name;
        if (ct.verb) s += ` (${ct.verb})`;
        return s;
      }).join(', ')}`);
    }
    if (personas.length > 0) parts.push(`Personas: ${personas.map(p => p.name).join(', ')}`);
    return parts.length > 0 ? ` [Project context — ${parts.join('. ')}]` : '';
  } catch { return ''; }
}

// ── Session Management ──

let currentSessionId: string | null = null;

async function ensureSession(projectId: string): Promise<string> {
  if (currentSessionId) {
    const session = await query<{ status: string }>('SELECT status FROM mcp_sessions WHERE id = $1', [currentSessionId]);
    if (session[0] && session[0].status === 'active') {
      return currentSessionId;
    }
  }

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
    mcpCaptureData: process.env.MCP_CAPTURE_DATA !== 'false', // default true
  };
}

// ── Server Setup ──

const server = new McpServer({
  name: 'nords-mcp',
  version: '1.0.0',
});

// ── Tier 1: Read-Only Tools ──

server.tool('nords_get_dictionary',
  'Get the project dictionary — full ontology of nord types, connection types (verbs, stages), and personas. The horizon already gives you inline schemas, so you may not need this unless you want the full ontology.',
  {},
  async () => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_get_dictionary', getToolContext(sid), {});
    return { content: [{ type: 'text' as const, text: toJson(result.data) }] };
  }
);

server.tool('nords_get_horizon',
  `Get lean horizon — current position, neighbors with directional context (verb, direction, traversal_direction, stage, connection properties), suggested_next ranked by goals/urgency/flow with reasons, completion %. Each neighbor shows how it relates to you: verb ("verifies"), traversal_direction (outgoing = follow flow, incoming = trace back), stage ("Tested"), and properties ("Verification Status: Failed"). Check context_hint.stale — if true, call nords_get_context next.${projectContext}`,
  {},
  async () => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_get_horizon', getToolContext(sid), {});
    return { content: [{ type: 'text' as const, text: toJson(result.data) }] };
  }
);

server.tool('nords_get_context',
  `Get rich context: remaining variables with descriptions, connection schemas, planning queue, persona details. Call when context_hint.stale is true in the horizon response.${projectContext}`,
  {},
  async () => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_get_context', getToolContext(sid), {});
    return { content: [{ type: 'text' as const, text: toJson(result.data) }] };
  }
);

server.tool('nords_list_all',
  'Lightweight directory of every nord in the project — returns only id, title, and type_name (no properties or connections). Use this to scan the full project before drilling in with nords_get_nord or nords_query_nords.',
  {},
  async () => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_list_all', getToolContext(sid), {});
    return { content: [{ type: 'text' as const, text: toJson(result.data) }] };
  }
);

server.tool('nords_get_graph',
  'Get the project graph. For small projects (<50 nords) returns everything. For larger projects, returns a neighborhood subgraph scoped to max_depth hops from your current position. Includes nords, connections, and type definitions.',
  {
    max_depth: z.number().optional().describe('Max hops from current position (default 3, max 5). Only applies to projects with 50+ nords.'),
    center_nord_id: z.string().optional().describe('Override center for the subgraph (defaults to your current position)'),
  },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_get_graph', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: toJson(result.data) }] };
  }
);

server.tool('nords_get_nord',
  'Get a single nord by ID with all its properties. Also updates your position to this nord and returns the horizon from there.',
  { nord_id: z.string().describe('UUID of the nord') },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_get_nord', getToolContext(sid), args);
    return { 
      content: [{ type: 'text' as const, text: toJson(result.data ?? result.error) }],
      isError: !result.success
    };
  }
);

server.tool('nords_query_nords',
  'Search nords by type name and/or title substring.',
  {
    type_name: z.string().optional().describe('Filter by nord type name (case-insensitive)'),
    type_id: z.string().optional().describe('Filter by nord type UUID'),
    title: z.string().optional().describe('Filter by title substring (case-insensitive)'),
  },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    // Resolve type_name → type_id if provided
    const resolvedArgs = { ...args };
    if (args.type_name && !args.type_id) {
      const types = await nordTypesRepo.findByProject(process.env.PROJECT_ID!);
      const match = types.find(t => t.name.toLowerCase() === (args.type_name as string).toLowerCase());
      if (match) resolvedArgs.type_id = match.id;
    }
    const result = await dispatchTool('nords_query_nords', getToolContext(sid), resolvedArgs);
    return { content: [{ type: 'text' as const, text: toJson(result.data) }] };
  }
);

server.tool('nords_get_connections',
  'Get all connections to/from a specific nord. Returns full connection rows including type_name, verb, direction, distance_x/y, and connection instance properties (e.g. Verification Status, Severity, Allocation %). Use when you need to see all relationships beyond what the horizon neighbors show.',
  { nord_id: z.string().describe('UUID of the nord') },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_get_connections', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: toJson(result.data) }] };
  }
);

server.tool('nords_get_session_state',
  'Get full session state: position, session nords, traversals.',
  {},
  async () => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_get_session_state', getToolContext(sid), {});
    return { content: [{ type: 'text' as const, text: toJson(result.data) }] };
  }
);

server.tool('nords_get_incomplete_nords',
  'Get nords with unfilled required properties.',
  {},
  async () => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_get_incomplete_nords', getToolContext(sid), {});
    return { content: [{ type: 'text' as const, text: toJson(result.data) }] };
  }
);

server.tool('nords_get_goals',
  'Get all project goals with their property bindings, end_type, and DAG edges.',
  {},
  async () => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_get_goals', getToolContext(sid), {});
    return { content: [{ type: 'text' as const, text: toJson(result.data) }] };
  }
);

server.tool('nords_get_briefing',
  `Cold-start composite — returns dictionary + horizon + goals + protocol in one call. Use this at the very start of a session.${projectContext}`,
  {},
  async () => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_get_briefing', getToolContext(sid), {});
    return { content: [{ type: 'text' as const, text: toJson(result.data) }] };
  }
);

server.tool('nords_get_analytics',
  'Get aggregate analytics: session counts, traversal stats, top-visited nords.',
  {},
  async () => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_get_analytics', getToolContext(sid), {});
    return { content: [{ type: 'text' as const, text: toJson(result.data) }] };
  }
);


// ── Tier 2: Session Tools ──

server.tool('nords_navigate',
  `Navigate to any nord by name, type, or ID. Traverses if target is a neighbor, jumps otherwise. Returns: destination nord, fresh horizon, and — if traversed — a traversed_via block with the edge metadata (type_name, verb, traversal_direction, stage, connection properties) of the path just walked. Use traversed_via to bridge your conversation naturally.${projectContext}`,
  {
    to: z.string().describe('Nord title, type name, or UUID'),
    type_name: z.string().optional().describe('Filter by nord type to disambiguate'),
  },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_navigate', getToolContext(sid), args);
    return { 
      content: [{ type: 'text' as const, text: toJson(result.data ?? result.error) }], 
      isError: !result.success 
    };
  }
);

server.tool('nords_update_session_nord',
  'Save collected properties to a session nord. Validates against schema, computes completion server-side, and returns updated horizon. You can save to any nord, not just the current one.',
  {
    nord_id: z.string().describe('UUID of the nord'),
    properties: z.record(z.unknown()).describe('Key-value pairs of collected properties'),
  },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_update_session_nord', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: toJson(result.data ?? result.error) }], isError: !result.success };
  }
);

server.tool('nords_update_session_variables',
  'Save collected project variable values. Variables are project-level data points. Pass variable_id from remaining_variables in the horizon. Evaluates goal completion and returns goal events + updated horizon.',
  {
    variables: z.array(z.object({
      variable_id: z.string().describe('UUID of the project variable'),
      value: z.unknown().describe('The collected value'),
    })).describe('Array of variable values to save'),
  },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_update_session_variables', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: toJson(result.data ?? result.error) }], isError: !result.success };
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
    return { content: [{ type: 'text' as const, text: toJson(result.data ?? result.error) }], isError: !result.success };
  }
);

server.tool('nords_switch_persona',
  `Switch the active persona lens. Returns reweighted horizon.${projectContext}`,
  { persona_id: z.string().nullable().describe('UUID of the persona, or null to clear') },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_switch_persona', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: toJson(result.data ?? result.error) }], isError: !result.success };
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
    return { content: [{ type: 'text' as const, text: toJson(result.data ?? result.error) }], isError: !result.success };
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
    return { content: [{ type: 'text' as const, text: toJson(result.data ?? result.error) }], isError: !result.success };
  }
);

server.tool('nords_delete_nord',
  'Soft-delete a nord.',
  { nord_id: z.string().describe('UUID') },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_delete_nord', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: toJson(result.data ?? result.error) }], isError: !result.success };
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
    return { content: [{ type: 'text' as const, text: toJson(result.data ?? result.error) }], isError: !result.success };
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
    return { content: [{ type: 'text' as const, text: toJson(result.data ?? result.error) }], isError: !result.success };
  }
);

server.tool('nords_delete_connection',
  'Soft-delete a connection.',
  { connection_id: z.string().describe('Connection UUID') },
  async (args) => {
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const result = await dispatchTool('nords_delete_connection', getToolContext(sid), args);
    return { content: [{ type: 'text' as const, text: toJson(result.data ?? result.error) }], isError: !result.success };
  }
);

server.tool('nords_reset_session',
  'Reset the current session (abandon it) and start a fresh one.',
  {},
  async () => {
    if (currentSessionId) {
      try {
        await mcpRepo.endSession(currentSessionId, 'abandoned', 'Session reset by user');
      } catch { /* ok */ }
    }
    currentSessionId = null;
    const sid = await ensureSession(process.env.PROJECT_ID!);
    const horizon = await mcpRepo.getSessionHorizonLean(sid);
    return { content: [{ type: 'text' as const, text: toJson({ session_id: sid, horizon }) }] };
  }
);

// ── Resource: Project Overview ──

server.resource(
  'project-overview',
  `nords://projects/${process.env.PROJECT_ID}/overview`,
  async (uri) => {
    const projectId = process.env.PROJECT_ID!;
    const project = await query('SELECT name, purpose, project_mode FROM projects WHERE id = $1', [projectId]);
    const p = project[0] as any;
    const nords = await query(
      `SELECT n.title, nt.name as type_name, n.properties
       FROM nords n JOIN nord_types nt ON nt.id = n.type_id
       WHERE n.project_id = $1 AND n.deleted_at IS NULL ORDER BY n.title`,
      [projectId]
    );
    const connections = await query(
      `SELECT sn.title as source, tn.title as target, ct.name as type_name
       FROM connections c
       JOIN nords sn ON sn.id = c.source_nord_id
       JOIN nords tn ON tn.id = c.target_nord_id
       JOIN connection_types ct ON ct.id = c.type_id
       WHERE c.project_id = $1 AND c.deleted_at IS NULL`,
      [projectId]
    );
    const goals = await query(
      `SELECT g.name, g.end_type,
              (SELECT COUNT(*) FROM goal_properties gp WHERE gp.goal_id = g.id) as bound_properties
       FROM goals g WHERE g.project_id = $1 ORDER BY g.sort_order`,
      [projectId]
    );
    const edges = await query(
      `SELECT sg.name as source_goal, tg.name as target_goal
       FROM goal_edges ge
       JOIN goals sg ON sg.id = ge.source_goal_id
       JOIN goals tg ON tg.id = ge.target_goal_id
       WHERE ge.project_id = $1`,
      [projectId]
    );

    const overview = [
      `# ${p?.name || 'Unknown Project'}`,
      p?.purpose ? `\nPurpose: ${p.purpose}` : '',
      `\nMode: ${p?.project_mode || 'collect'}`,
      `\n## Nords (${nords.length})`,
      ...nords.map((n: any) => `- **${n.title}** (${n.type_name}) — ${Object.keys(n.properties || {}).length} properties`),
      `\n## Connections (${connections.length})`,
      ...connections.map((c: any) => `- ${c.source} —[${c.type_name}]→ ${c.target}`),
      `\n## Goals (${goals.length})`,
      ...goals.map((g: any) => {
        const end = g.end_type ? ` [${g.end_type.toUpperCase()}]` : '';
        return `- **${g.name}**${end} — ${g.bound_properties} bound properties`;
      }),
      `\n## Goal Edges (${edges.length})`,
      ...edges.map((e: any) => `- ${e.source_goal} → ${e.target_goal}`),
    ].join('\n');

    return { contents: [{ uri: uri.href, mimeType: 'text/markdown', text: overview }] };
  }
);

// ── Start ──

async function main() {
  if (!process.env.PROJECT_ID) {
    mcpLogger.error('PROJECT_ID environment variable is required');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    mcpLogger.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  // Build project context for tool descriptions
  projectContext = await buildProjectContext();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  mcpLogger.info('Nords MCP server started', { projectId: process.env.PROJECT_ID });
}

main().catch((err) => {
  mcpLogger.error('Fatal MCP server error', { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
  process.exit(1);
});

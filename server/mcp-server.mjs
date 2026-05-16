#!/usr/bin/env node
/**
 * mcp-server.mjs — Nords MCP Server (stdio transport)
 *
 * Exposes the Nords tool suite via the Model Context Protocol so that
 * Claude (or any MCP-compatible client) can interact with a project.
 *
 * Connects to the running Nords API server via HTTP.
 *
 * Usage:
 *   NORDS_PROJECT_ID=<uuid> node server/mcp-server.mjs
 *
 * Or configure in your MCP settings:
 *   {
 *     "mcpServers": {
 *       "nords": {
 *         "command": "node",
 *         "args": ["server/mcp-server.mjs"],
 *         "cwd": "/path/to/nords",
 *         "env": {
 *           "NORDS_PROJECT_ID": "<project-uuid>",
 *           "NORDS_API_BASE": "http://localhost:3000"
 *         }
 *       }
 *     }
 *   }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = process.env.NORDS_API_BASE || 'http://localhost:3000';
const PROJECT_ID = process.env.NORDS_PROJECT_ID;

if (!PROJECT_ID) {
  console.error('Error: NORDS_PROJECT_ID environment variable is required.');
  console.error('Usage: NORDS_PROJECT_ID=<uuid> node server/mcp-server.mjs');
  process.exit(1);
}

// ── HTTP helper ──

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

// ── Session management ──
// We lazily create a session on first tool call that needs one

let sessionId = null;

async function ensureSession() {
  if (sessionId) return sessionId;
  const project = await api('GET', `/api/projects/${PROJECT_ID}`);
  const session = await api('POST', `/api/projects/${PROJECT_ID}/mcp-sessions`, {
    persona_id: project.default_persona_id || null,
    start_nord_id: project.default_start_nord_id || null,
  });
  sessionId = session.id;

  // Initialize session goals
  const mode = project.project_mode || 'collect';
  // Goal initialization happens server-side via the session creation flow
  // For the MCP server, we POST to initialize goals
  try {
    await api('POST', `/api/mcp-sessions/${sessionId}/initialize-goals`, { project_mode: mode });
  } catch {
    // Endpoint may not exist yet — goals init is also done lazily in chat
  }
  return sessionId;
}

// ── Build MCP Server ──

const server = new McpServer({
  name: 'nords',
  version: '1.0.0',
});

// ─── Read-Only Tools ───

server.tool(
  'nords_get_dictionary',
  'Get the project dictionary — full ontology of nord types (with property schemas), connection types (with verbs), and personas.',
  {},
  async () => {
    const data = await api('GET', `/api/projects/${PROJECT_ID}/graph`);
    const personas = await api('GET', `/api/projects/${PROJECT_ID}/personas`);
    const project = await api('GET', `/api/projects/${PROJECT_ID}`);
    return {
      content: [{ type: 'text', text: JSON.stringify({
        project: { id: project.id, name: project.name, purpose: project.purpose, mode: project.project_mode },
        nord_types: data.nord_types,
        connection_types: data.connection_types,
        personas: personas.map(p => ({ id: p.id, name: p.name, background: p.background, primary_motivation: p.primary_motivation })),
      }, null, 2) }],
    };
  }
);

server.tool(
  'nords_get_graph',
  'Get the full project graph — all nords, connections, and types.',
  {},
  async () => {
    const data = await api('GET', `/api/projects/${PROJECT_ID}/graph`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  'nords_get_nord',
  'Get a single nord by ID with all its properties.',
  { nord_id: z.string().describe('UUID of the nord to retrieve') },
  async ({ nord_id }) => {
    const data = await api('GET', `/api/projects/${PROJECT_ID}/graph`);
    const nord = data.nords?.find(n => n.id === nord_id);
    if (!nord) return { content: [{ type: 'text', text: `Nord ${nord_id} not found` }] };
    return { content: [{ type: 'text', text: JSON.stringify(nord, null, 2) }] };
  }
);

server.tool(
  'nords_query_nords',
  'Search nords by type name and/or title substring.',
  {
    type_name: z.string().optional().describe('Filter by nord type name (case-insensitive)'),
    title: z.string().optional().describe('Filter by title substring (case-insensitive)'),
  },
  async ({ type_name, title }) => {
    const data = await api('GET', `/api/projects/${PROJECT_ID}/graph`);
    let nords = data.nords || [];
    if (type_name) {
      const typeId = data.nord_types?.find(t => t.name.toLowerCase() === type_name.toLowerCase())?.id;
      if (typeId) nords = nords.filter(n => n.type_id === typeId);
    }
    if (title) nords = nords.filter(n => n.title.toLowerCase().includes(title.toLowerCase()));
    return { content: [{ type: 'text', text: JSON.stringify(nords, null, 2) }] };
  }
);

server.tool(
  'nords_get_connections',
  'Get all connections to/from a specific nord.',
  { nord_id: z.string().describe('UUID of the nord') },
  async ({ nord_id }) => {
    const data = await api('GET', `/api/projects/${PROJECT_ID}/graph`);
    const conns = (data.connections || []).filter(
      c => c.source_nord_id === nord_id || c.target_nord_id === nord_id
    );
    return { content: [{ type: 'text', text: JSON.stringify(conns, null, 2) }] };
  }
);

server.tool(
  'nords_get_goals',
  'Get all project goals with their property bindings, end_type, and DAG edges.',
  {},
  async () => {
    const goals = await api('GET', `/api/projects/${PROJECT_ID}/goals`);
    const edges = await api('GET', `/api/projects/${PROJECT_ID}/goal-edges`);
    return {
      content: [{ type: 'text', text: JSON.stringify({ goals, edges }, null, 2) }],
    };
  }
);

// ─── Session Tools ───

server.tool(
  'nords_get_horizon',
  'Get the Session Horizon — current position, persona-weighted neighbors, completion %, suggested next, and planning queue.',
  {},
  async () => {
    const sid = await ensureSession();
    const horizon = await api('GET', `/api/mcp-sessions/${sid}/horizon`);
    return { content: [{ type: 'text', text: JSON.stringify(horizon, null, 2) }] };
  }
);

server.tool(
  'nords_get_session_state',
  'Get full session state: status, all session nords with completion, and traversal history.',
  {},
  async () => {
    const sid = await ensureSession();
    const session = await api('GET', `/api/mcp-sessions/${sid}`);
    const nords = await api('GET', `/api/mcp-sessions/${sid}/nords`);
    return { content: [{ type: 'text', text: JSON.stringify({ session, nords }, null, 2) }] };
  }
);

server.tool(
  'nords_update_session_nord',
  'Save collected property values to a session nord. Triggers goal evaluation and returns goal_events. Use this when you have gathered information from the user.',
  {
    nord_id: z.string().describe('UUID of the nord to update'),
    properties: z.record(z.unknown()).describe('Key-value pairs of collected properties'),
    required_count: z.number().optional().describe('Total required fields for this nord'),
    filled_count: z.number().optional().describe('Number of required fields now filled'),
  },
  async ({ nord_id, properties, required_count, filled_count }) => {
    const sid = await ensureSession();
    const result = await api('PUT', `/api/mcp-sessions/${sid}/nords/${nord_id}`, {
      properties,
      required_count: required_count ?? 0,
      filled_count: filled_count ?? 0,
    });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'nords_traverse_connection',
  'Move to a connected nord by traversing a connection. Updates current position and returns updated horizon.',
  {
    connection_id: z.string().describe('UUID of the connection to traverse'),
    source_nord_id: z.string().describe('UUID of the nord you are leaving'),
    target_nord_id: z.string().describe('UUID of the nord you are moving to'),
    direction: z.enum(['forward', 'backward']).describe('Direction of traversal'),
    traversal_type: z.enum(['read', 'advance', 'rework', 'create', 'assign', 'evaluate']).describe('Why you are traversing'),
  },
  async ({ connection_id, source_nord_id, target_nord_id, direction, traversal_type }) => {
    const sid = await ensureSession();
    const result = await api('POST', `/api/mcp-sessions/${sid}/traversals`, {
      connection_id, source_nord_id, target_nord_id, direction, traversal_type,
    });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'nords_visit_nord',
  'Log a visit to a nord with optional before/after property snapshots.',
  {
    nord_id: z.string().describe('UUID of the nord visited'),
    visit_type: z.enum(['inspect', 'update', 'complete', 'create', 'gate_check']).describe('Type of visit'),
  },
  async ({ nord_id, visit_type }) => {
    const sid = await ensureSession();
    const result = await api('POST', `/api/mcp-sessions/${sid}/visits`, {
      nord_id, visit_type,
    });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'nords_reset_session',
  'Reset the current session (abandon it) and start a fresh one.',
  {},
  async () => {
    if (sessionId) {
      try { await api('PUT', `/api/mcp-sessions/${sessionId}`, { status: 'abandoned' }); } catch { /* ok */ }
    }
    sessionId = null;
    const sid = await ensureSession();
    return { content: [{ type: 'text', text: `Session reset. New session: ${sid}` }] };
  }
);

// ── Resources ──

server.resource(
  'project-overview',
  `nords://projects/${PROJECT_ID}/overview`,
  async (uri) => {
    const project = await api('GET', `/api/projects/${PROJECT_ID}`);
    const graph = await api('GET', `/api/projects/${PROJECT_ID}/graph`);
    const goals = await api('GET', `/api/projects/${PROJECT_ID}/goals`);
    const edges = await api('GET', `/api/projects/${PROJECT_ID}/goal-edges`);

    const overview = [
      `# ${project.name}`,
      project.purpose ? `\nPurpose: ${project.purpose}` : '',
      `\nMode: ${project.project_mode || 'collect'}`,
      `\n## Nords (${graph.nords?.length || 0})`,
      ...(graph.nords || []).map(n => {
        const type = graph.nord_types?.find(t => t.id === n.type_id)?.name || '?';
        return `- **${n.title}** (${type}) — ${Object.keys(n.properties || {}).length} properties`;
      }),
      `\n## Connections (${graph.connections?.length || 0})`,
      ...(graph.connections || []).map(c => {
        const src = graph.nords?.find(n => n.id === c.source_nord_id)?.title || c.source_nord_id.slice(0, 8);
        const tgt = graph.nords?.find(n => n.id === c.target_nord_id)?.title || c.target_nord_id.slice(0, 8);
        const type = graph.connection_types?.find(t => t.id === c.type_id)?.name || '?';
        return `- ${src} —[${type}]→ ${tgt}`;
      }),
      `\n## Goals (${goals.length})`,
      ...goals.map(g => {
        const end = g.end_type ? ` [${g.end_type.toUpperCase()}]` : '';
        const props = (g.properties || []).length;
        return `- **${g.name}**${end} — ${props} bound properties`;
      }),
      `\n## Goal Edges (${edges.length})`,
      ...edges.map(e => {
        const src = goals.find(g => g.id === e.source_goal_id)?.name || e.source_goal_id.slice(0, 8);
        const tgt = goals.find(g => g.id === e.target_goal_id)?.name || e.target_goal_id.slice(0, 8);
        return `- ${src} → ${tgt}`;
      }),
    ].join('\n');

    return { contents: [{ uri: uri.href, mimeType: 'text/markdown', text: overview }] };
  }
);

// ── Start ──

const transport = new StdioServerTransport();
await server.connect(transport);

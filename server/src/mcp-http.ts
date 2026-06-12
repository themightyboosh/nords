/**
 * mcp-http.ts — HTTP MCP transport for publishing projects to external LLMs.
 *
 * This is the core publish feature. Any LLM client that supports MCP over HTTP
 * can connect to a Nords project using an access token:
 *
 *   {
 *     "mcpServers": {
 *       "nords": {
 *         "type": "streamable-http",
 *         "url": "https://your-deployment.com/mcp",
 *         "headers": { "Authorization": "Bearer nrd_..." }
 *       }
 *     }
 *   }
 *
 * Consumer-facing: read + session-write only. Graph mutations are not exposed.
 * Mutability is a future roadmap item for project creators.
 */

import { Router, Request, Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import logger from './lib/logger.js';
import { accessTokensRepo } from './repositories/accessTokens.js';
import { dispatchTool, type ToolContext } from './lib/toolDispatch.js';
import * as mcpRepo from './repositories/mcpSessions.js';
import { stripNulls } from './repositories/mcpSessions.js';
import { query } from './db.js';
import { nordTypesRepo, connectionTypesRepo } from './repositories/types.js';
import * as goalsRepo from './repositories/goals.js';
import { logEvent } from './lib/sessionEvents.js';

export const mcpHttpRouter = Router();

// ── Own CORS policy (open — token-gated, any origin can call) ──
mcpHttpRouter.use('/mcp', cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Mcp-Session-Id'],
  exposedHeaders: ['Mcp-Session-Id'],
}));

// ── Helpers ──

function toJson(data: unknown): string {
  return JSON.stringify(stripNulls(data), null, 2);
}

async function buildProjectContext(projectId: string): Promise<string> {
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

// ── Per-transport session management ──

const transportSessions = new Map<string, { sessionId: string; projectId: string }>();

async function ensureSession(projectId: string, transportId: string): Promise<string> {
  const existing = transportSessions.get(transportId);
  if (existing) {
    const rows = await query<{ status: string }>('SELECT status FROM mcp_sessions WHERE id = $1', [existing.sessionId]);
    if (rows[0]?.status === 'active') return existing.sessionId;
  }

  const project = await query<{ default_persona_id: string | null; default_start_nord_id: string | null }>(
    'SELECT default_persona_id, default_start_nord_id FROM projects WHERE id = $1', [projectId]
  );
  const personaId = project[0]?.default_persona_id || null;
  const startNordId = project[0]?.default_start_nord_id || null;

  const session = await mcpRepo.createSession(projectId, personaId, startNordId, null, null, 'api');

  logEvent(session.id, 'session_start', 'source', {
    source_type: 'api',
    persona_id: personaId,
    start_nord_id: startNordId,
  });

  await goalsRepo.initializeSessionGoals(session.id, projectId, 'collect');

  transportSessions.set(transportId, { sessionId: session.id, projectId });
  return session.id;
}

function getToolContext(sessionId: string, projectId: string): ToolContext {
  return {
    sessionId,
    projectId,
    mcpMutable: false, // Consumer-facing — no graph mutations
    mcpCaptureData: true,
    sourceType: 'api',
  };
}

// ── Register all consumer-facing tools ──

function registerTools(server: McpServer, projectId: string, transportId: string, projectCtx: string) {
  const getSid = () => ensureSession(projectId, transportId);
  const ctx = (sid: string) => getToolContext(sid, projectId);

  // ── Tier 1: Read-Only ──

  server.tool('nords_get_dictionary',
    'Get the project dictionary — full ontology of nord types, connection types (verbs, stages), and personas. The horizon already gives you inline schemas, so you may not need this unless you want the full ontology.',
    {},
    async () => { const s = await getSid(); const r = await dispatchTool('nords_get_dictionary', ctx(s), {}); return { content: [{ type: 'text' as const, text: toJson(r.data) }] }; }
  );

  server.tool('nords_get_horizon',
    `Lean horizon — current position, directional neighbors (verb, stage, traversal_direction), suggested_next ranked by goals, completion %. Check context_hint.stale to know if nords_get_context is needed.${projectCtx}`,
    {},
    async () => { const s = await getSid(); const r = await dispatchTool('nords_get_horizon', ctx(s), {}); return { content: [{ type: 'text' as const, text: toJson(r.data) }] }; }
  );

  server.tool('nords_get_context',
    `Get rich context: remaining variables with descriptions, connection schemas, planning queue, persona details. Call when context_hint.stale is true in the horizon response.${projectCtx}`,
    {},
    async () => { const s = await getSid(); const r = await dispatchTool('nords_get_context', ctx(s), {}); return { content: [{ type: 'text' as const, text: toJson(r.data) }] }; }
  );

  server.tool('nords_list_all',
    'Lightweight directory of every nord in the project — returns only id, title, and type_name (no properties or connections).',
    {},
    async () => { const s = await getSid(); const r = await dispatchTool('nords_list_all', ctx(s), {}); return { content: [{ type: 'text' as const, text: toJson(r.data) }] }; }
  );

  server.tool('nords_get_graph',
    'Get the project graph. For small projects (<50 nords) returns everything. For larger projects, returns a neighborhood subgraph.',
    {
      max_depth: z.number().optional().describe('Max hops from current position (default 3, max 5)'),
      center_nord_id: z.string().optional().describe('Override center for the subgraph'),
    },
    async (args) => { const s = await getSid(); const r = await dispatchTool('nords_get_graph', ctx(s), args); return { content: [{ type: 'text' as const, text: toJson(r.data) }] }; }
  );

  server.tool('nords_get_nord',
    'Get a single nord by ID with all its properties. Also updates your position to this nord and returns the horizon from there.',
    { nord_id: z.string().describe('UUID of the nord') },
    async (args) => { const s = await getSid(); const r = await dispatchTool('nords_get_nord', ctx(s), args); return { content: [{ type: 'text' as const, text: toJson(r.data ?? r.error) }], isError: !r.success }; }
  );

  server.tool('nords_query_nords',
    'Search nords by type name and/or title substring.',
    {
      type_name: z.string().optional().describe('Filter by nord type name (case-insensitive)'),
      type_id: z.string().optional().describe('Filter by nord type UUID'),
      title: z.string().optional().describe('Filter by title substring (case-insensitive)'),
    },
    async (args) => {
      const s = await getSid();
      const resolvedArgs = { ...args };
      if (args.type_name && !args.type_id) {
        const types = await nordTypesRepo.findByProject(projectId);
        const match = types.find(t => t.name.toLowerCase() === (args.type_name as string).toLowerCase());
        if (match) resolvedArgs.type_id = match.id;
      }
      const r = await dispatchTool('nords_query_nords', ctx(s), resolvedArgs);
      return { content: [{ type: 'text' as const, text: toJson(r.data) }] };
    }
  );

  server.tool('nords_get_connections',
    'All connections to/from a nord with type, verb, direction, distance, and instance properties.',
    { nord_id: z.string().describe('UUID of the nord') },
    async (args) => { const s = await getSid(); const r = await dispatchTool('nords_get_connections', ctx(s), args); return { content: [{ type: 'text' as const, text: toJson(r.data) }] }; }
  );

  server.tool('nords_get_session_state',
    'Get full session state: position, session nords, traversals.',
    {},
    async () => { const s = await getSid(); const r = await dispatchTool('nords_get_session_state', ctx(s), {}); return { content: [{ type: 'text' as const, text: toJson(r.data) }] }; }
  );

  server.tool('nords_get_incomplete_nords',
    'Get nords with unfilled required properties.',
    {},
    async () => { const s = await getSid(); const r = await dispatchTool('nords_get_incomplete_nords', ctx(s), {}); return { content: [{ type: 'text' as const, text: toJson(r.data) }] }; }
  );

  server.tool('nords_get_goals',
    'Get all project goals with their property bindings, end_type, and DAG edges.',
    {},
    async () => { const s = await getSid(); const r = await dispatchTool('nords_get_goals', ctx(s), {}); return { content: [{ type: 'text' as const, text: toJson(r.data) }] }; }
  );

  server.tool('nords_get_briefing',
    `Cold-start composite — returns dictionary + horizon + goals + protocol in one call. Use this at the very start of a session.${projectCtx}`,
    {},
    async () => { const s = await getSid(); const r = await dispatchTool('nords_get_briefing', ctx(s), {}); return { content: [{ type: 'text' as const, text: toJson(r.data) }] }; }
  );

  server.tool('nords_get_analytics',
    'Get aggregate analytics: session counts, traversal stats, top-visited nords.',
    {},
    async () => { const s = await getSid(); const r = await dispatchTool('nords_get_analytics', ctx(s), {}); return { content: [{ type: 'text' as const, text: toJson(r.data) }] }; }
  );

  // ── Tier 2: Session Tools (navigate, collect, visit) ──

  server.tool('nords_navigate',
    `Navigate to a nord by name, type, or ID. Traverses if neighbor, jumps otherwise. Returns destination, fresh horizon, and traversed_via edge metadata.${projectCtx}`,
    {
      to: z.string().describe('Nord title, type name, or UUID'),
      type_name: z.string().optional().describe('Filter by nord type to disambiguate'),
    },
    async (args) => { const s = await getSid(); const r = await dispatchTool('nords_navigate', ctx(s), args); return { content: [{ type: 'text' as const, text: toJson(r.data ?? r.error) }], isError: !r.success }; }
  );

  server.tool('nords_update_session_nord',
    'Save collected properties to a session nord. Validates against schema, computes completion server-side, and returns updated horizon.',
    {
      nord_id: z.string().describe('UUID of the nord'),
      properties: z.record(z.unknown()).describe('Key-value pairs of collected properties'),
    },
    async (args) => { const s = await getSid(); const r = await dispatchTool('nords_update_session_nord', ctx(s), args); return { content: [{ type: 'text' as const, text: toJson(r.data ?? r.error) }], isError: !r.success }; }
  );

  server.tool('nords_update_session_variables',
    'Save project variable values by variable_id. Evaluates goal completion and returns goal events + updated horizon.',
    {
      variables: z.array(z.object({
        variable_id: z.string().describe('UUID of the project variable'),
        value: z.unknown().describe('The collected value'),
      })).describe('Array of variable values to save'),
    },
    async (args) => { const s = await getSid(); const r = await dispatchTool('nords_update_session_variables', ctx(s), args); return { content: [{ type: 'text' as const, text: toJson(r.data ?? r.error) }], isError: !r.success }; }
  );

  server.tool('nords_visit_nord',
    'Log a visit event with optional before/after snapshots.',
    {
      nord_id: z.string().describe('UUID of the nord'),
      visit_type: z.enum(['inspect', 'update', 'complete', 'create', 'gate_check']).describe('Type of visit'),
      properties_before: z.record(z.unknown()).optional().describe('Properties before'),
      properties_after: z.record(z.unknown()).optional().describe('Properties after'),
    },
    async (args) => { const s = await getSid(); const r = await dispatchTool('nords_visit_nord', ctx(s), args); return { content: [{ type: 'text' as const, text: toJson(r.data ?? r.error) }], isError: !r.success }; }
  );

  server.tool('nords_switch_persona',
    `Switch the active persona lens. Returns reweighted horizon.${projectCtx}`,
    { persona_id: z.string().nullable().describe('UUID of the persona, or null to clear') },
    async (args) => { const s = await getSid(); const r = await dispatchTool('nords_switch_persona', ctx(s), args); return { content: [{ type: 'text' as const, text: toJson(r.data ?? r.error) }], isError: !r.success }; }
  );

  server.tool('nords_reset_session',
    'Reset the current session (abandon it) and start a fresh one.',
    {},
    async () => {
      const existing = transportSessions.get(transportId);
      if (existing) {
        try { await mcpRepo.endSession(existing.sessionId, 'abandoned', 'Session reset by API client'); } catch { /* ok */ }
      }
      transportSessions.delete(transportId);
      const s = await getSid();
      const horizon = await mcpRepo.getSessionHorizonLean(s);
      return { content: [{ type: 'text' as const, text: toJson({ session_id: s, horizon }) }] };
    }
  );

  // Note: Tier 3 (mutable tools: create/update/delete nords/connections) intentionally omitted.
  // This is consumer-facing. Mutability is a future roadmap item for project creators.
}

// ── Active transport tracking ──

const activeTransports = new Map<string, { transport: StreamableHTTPServerTransport; server: McpServer }>();

// ── Token authentication ──

async function authenticateRequest(req: Request): Promise<{ projectId: string; tokenId: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const rawToken = authHeader.slice(7);
  if (!rawToken) return null;

  const record = await accessTokensRepo.verify(rawToken);
  if (!record) return null;

  // Touch last_used_at (fire and forget)
  accessTokensRepo.touchLastUsed(record.id).catch(() => {});

  return { projectId: record.project_id, tokenId: record.id };
}

// ── MCP HTTP endpoint ──

mcpHttpRouter.all('/mcp', async (req: Request, res: Response) => {
  try {
    // Authenticate via access token
    const auth = await authenticateRequest(req);
    if (!auth) {
      res.status(401).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Unauthorized. Provide Authorization: Bearer <access_token>' },
        id: null,
      });
      return;
    }

    // Check for existing MCP session
    const mcpSessionId = req.headers['mcp-session-id'] as string | undefined;

    if (mcpSessionId && activeTransports.has(mcpSessionId)) {
      const { transport } = activeTransports.get(mcpSessionId)!;
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // For non-initialization requests that reference a missing session
    if (mcpSessionId && !activeTransports.has(mcpSessionId)) {
      res.status(404).json({
        jsonrpc: '2.0',
        error: { code: -32004, message: 'Session not found. Initialize a new session first.' },
        id: null,
      });
      return;
    }

    // New session: create server + transport
    const transportId = randomUUID();
    const projectCtx = await buildProjectContext(auth.projectId);

    const mcpServer = new McpServer({
      name: 'nords',
      version: '1.0.0',
    });

    registerTools(mcpServer, auth.projectId, transportId, projectCtx);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) activeTransports.delete(sid);
      transportSessions.delete(transportId);
      logger.info('MCP HTTP transport closed', { transportId, mcpSessionId: sid });
    };

    await mcpServer.connect(transport);

    logger.info('MCP HTTP session starting', {
      transportId,
      projectId: auth.projectId,
      tokenId: auth.tokenId,
    });

    await transport.handleRequest(req, res, req.body);

    // Track the transport AFTER handleRequest — that's when sessionId is assigned
    if (transport.sessionId) {
      activeTransports.set(transport.sessionId, { transport, server: mcpServer });
      logger.info('MCP HTTP session registered', {
        transportId,
        mcpSessionId: transport.sessionId,
      });
    }

  } catch (err: any) {
    logger.error('MCP HTTP error', { error: err.message, stack: err.stack });
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

// ── DELETE handler for session termination (MCP spec) ──
mcpHttpRouter.delete('/mcp', async (req: Request, res: Response) => {
  const mcpSessionId = req.headers['mcp-session-id'] as string | undefined;
  if (mcpSessionId && activeTransports.has(mcpSessionId)) {
    const { transport } = activeTransports.get(mcpSessionId)!;
    await transport.close();
    activeTransports.delete(mcpSessionId);
    res.status(200).json({ ok: true });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

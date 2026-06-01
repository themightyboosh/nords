/**
 * geminiTools.ts — Gemini function declarations for MCP tools.
 *
 * These are the JSON schemas that tell Gemini what tools are available
 * and what parameters each accepts. Gemini uses these to decide which
 * tools to call and with what arguments.
 *
 * Phase 2: When a ProjectDictionary is provided, tool descriptions are
 * enriched with project-specific vocabulary (type names, verbs, persona
 * names, mode) so the AI has zero-shot orientation without calling
 * nords_get_dictionary first.
 */

import type { FunctionDeclaration, Type } from '@google/genai';
import type { ProjectDictionary } from '../repositories/mcpSessions.js';

/**
 * Build a compact context suffix from the project dictionary.
 * Injected into key tool descriptions at registration time.
 */
function buildProjectContext(dict: ProjectDictionary, mode?: string): string {
  const parts: string[] = [];

  if (mode) parts.push(`Mode: ${mode}`);

  if (dict.nord_types.length > 0) {
    parts.push(`Nord types: ${dict.nord_types.map(t => t.name).join(', ')}`);
  }

  if (dict.connection_types.length > 0) {
    const ctStrs = dict.connection_types.map(ct => {
      let s = ct.name;
      if (ct.verb) s += ` (${ct.verb})`;
      return s;
    });
    parts.push(`Connection types: ${ctStrs.join(', ')}`);
  }

  if (dict.personas.length > 0) {
    parts.push(`Personas: ${dict.personas.map(p => p.name).join(', ')}`);
  }

  return parts.length > 0 ? ` [Project context — ${parts.join('. ')}]` : '';
}

/**
 * Build the complete function declarations array.
 * We build it dynamically so we can optionally exclude mutable tools
 * and inject project-specific context into descriptions.
 */
export function buildToolDeclarations(
  includeMutable: boolean,
  dictionary?: ProjectDictionary | null,
  projectMode?: string | null
): FunctionDeclaration[] {
  const ctx = dictionary ? buildProjectContext(dictionary, projectMode || undefined) : '';

  const readOnly: FunctionDeclaration[] = [
    {
      name: 'nords_get_dictionary',
      description: `Get the project dictionary — the full ontology and mission definition. Returns nord types (with property schemas), connection types (with verbs, stages, measurement modes), personas (with exchange styles, guardrails, mental models, category weights), goals (with variable bindings, prerequisite chains, relevant nords/types), goal edges (DAG sequencing), and collection variables (typed data points the AI needs to gather).${ctx ? ' The horizon already gives you inline context, so you may not need this unless you want the full ontology.' : ' Call this FIRST at the start of every session to understand the vocabulary before making decisions.'}`,
      parameters: { type: 'OBJECT' as Type, properties: {}, required: [] },
    },
    {
      name: 'nords_get_horizon',
      description: `Get the Session Horizon — your full situational awareness. Returns current position (with type and properties for context), persona-weighted neighbors, remaining collection variables, overall completion %, traversal breadcrumbs, suggested next nord, predicted 2-hop path, and planning_queue.${ctx}`,
      parameters: { type: 'OBJECT' as Type, properties: {}, required: [] },
    },
    {
      name: 'nords_list_all',
      description: 'Lightweight directory of every nord — returns only id, title, and type_name (no properties or connections). Use to scan the full project before drilling in.',
      parameters: { type: 'OBJECT' as Type, properties: {}, required: [] },
    },
    {
      name: 'nords_get_graph',
      description: 'Get the project graph. For small projects returns everything. For larger projects, returns a neighborhood subgraph scoped to max_depth hops from your current position. Use for broad exploration when the horizon is insufficient.',
      parameters: {
        type: 'OBJECT' as Type,
        properties: {
          max_depth: { type: 'NUMBER' as Type, description: 'Max hops from current position (default 3, max 5)' },
          center_nord_id: { type: 'STRING' as Type, description: 'Override center for the subgraph (defaults to current position)' },
        },
        required: [],
      },
    },
    {
      name: 'nords_get_nord',
      description: 'Get a single nord by ID with all its properties.',
      parameters: {
        type: 'OBJECT' as Type,
        properties: { nord_id: { type: 'STRING' as Type, description: 'The UUID of the nord to retrieve' } },
        required: ['nord_id'],
      },
    },
    {
      name: 'nords_query_nords',
      description: 'Search nords by type name and/or title substring. Use type_name (e.g. "Requirement", "Risk") instead of type_id to avoid UUID errors.',
      parameters: {
        type: 'OBJECT' as Type,
        properties: {
          type_name: { type: 'STRING' as Type, description: 'Filter by nord type name (case-insensitive, e.g. "Requirement", "Risk"). Preferred over type_id.' },
          type_id: { type: 'STRING' as Type, description: 'Filter by nord type UUID (use type_name instead when possible)' },
          title: { type: 'STRING' as Type, description: 'Search by title substring (case-insensitive)' },
        },
        required: [],
      },
    },
    {
      name: 'nords_get_connections',
      description: 'Get all connections to/from a specific nord.',
      parameters: {
        type: 'OBJECT' as Type,
        properties: { nord_id: { type: 'STRING' as Type, description: 'The UUID of the nord' } },
        required: ['nord_id'],
      },
    },
    {
      name: 'nords_get_session_state',
      description: 'Get full session state: current position, collected variable values, and traversal history.',
      parameters: { type: 'OBJECT' as Type, properties: {}, required: [] },
    },
    {
      name: 'nords_get_goals',
      description: 'Get session goal progress at runtime. Returns each goal\'s current status (pending/active/complete/cancelled) and its bound collection variables with collected/uncollected state and values. Use this to check live progress — the dictionary has the design-time goal definitions, this has the session-level state. Goal events are also returned automatically after every nords_update_session_variables call.',
      parameters: { type: 'OBJECT' as Type, properties: {}, required: [] },
    },
    {
      name: 'nords_get_briefing',
      description: `Cold-start composite tool — returns dictionary (full ontology including goals, collection variables, and goal sequencing) + horizon (current position, neighbors, remaining variables) + session goal progress + protocol in a single call. Use this at the very beginning of a session. Saves 3+ round-trips.${ctx}`,
      parameters: { type: 'OBJECT' as Type, properties: {}, required: [] },
    },
    {
      name: 'nords_get_analytics',
      description: 'Get aggregate analytics for the project: session counts by status, traversal stats, and top-visited nords.',
      parameters: { type: 'OBJECT' as Type, properties: {}, required: [] },
    },
  ];

  const session: FunctionDeclaration[] = [
    {
      name: 'nords_jump_to_nord',
      description: `Jump directly to any nord by its ID. Use this to reposition yourself when you need to explore a specific node (e.g. from query results or the planning_queue). This updates your position and returns the updated horizon with neighbors. Use nords_traverse_connection for connected moves and this for direct jumps.${ctx}`,
      parameters: {
        type: 'OBJECT' as Type,
        properties: {
          nord_id: { type: 'STRING' as Type, description: 'UUID of the nord to jump to' },
        },
        required: ['nord_id'],
      },
    },
    {
      name: 'nords_traverse_connection',
      description: `Move to a connected neighbor by traversing a connection. Get the connection_id from neighbors[].relationship.connection_id in the horizon. The source_nord_id is your current position (horizon.current_nord.id) and target_nord_id is neighbors[].nord.id. direction should match neighbors[].relationship.direction. This updates your position and automatically returns the updated horizon. Prefer this over nords_jump_to_nord when the target is a neighbor — traversal records the relationship context.${ctx}`,
      parameters: {
        type: 'OBJECT' as Type,
        properties: {
          connection_id: { type: 'STRING' as Type, description: 'UUID of the connection to traverse' },
          source_nord_id: { type: 'STRING' as Type, description: 'UUID of the nord you are leaving' },
          target_nord_id: { type: 'STRING' as Type, description: 'UUID of the nord you are moving to' },
          direction: { type: 'STRING' as Type, description: 'Direction of traversal: forward or backward' },
          traversal_type: { type: 'STRING' as Type, description: 'Why: read, advance, rework, create, assign, evaluate' },
          context: { type: 'OBJECT' as Type, description: 'Optional JSON context for why you traversed', properties: {} },
        },
        required: ['connection_id', 'source_nord_id', 'target_nord_id', 'direction', 'traversal_type'],
      },
    },
    {
      name: 'nords_update_session_variables',
      description: 'Save collected variable values. Collection variables are typed data points (string, select, boolean, number) bound to goals — collecting all required variables for a goal drives goal completion. Each variable may have enum options constraining valid values. Find uncollected variables in remaining_variables on the horizon — each entry includes variable_id, name, type, description, and options. Call this immediately when the user provides information matching a variable description. This is the ONLY tool for saving data collected from the user.',
      parameters: {
        type: 'OBJECT' as Type,
        properties: {
          variables: {
            type: 'ARRAY' as Type,
            description: 'Array of {variable_id, value} objects to save',
            items: {
              type: 'OBJECT' as Type,
              properties: {
                variable_id: { type: 'STRING' as Type, description: 'UUID of the collection variable (from remaining_variables in the horizon)' },
                value: { type: 'STRING' as Type, description: 'The collected value. For select types, must match one of the variable\'s options.' },
              },
              required: ['variable_id', 'value'],
            },
          },
        },
        required: ['variables'],
      },
    },
    {
      name: 'nords_visit_nord',
      description: 'Log a visit to a nord with optional before/after property snapshots.',
      parameters: {
        type: 'OBJECT' as Type,
        properties: {
          nord_id: { type: 'STRING' as Type, description: 'UUID of the nord visited' },
          visit_type: { type: 'STRING' as Type, description: 'Type: inspect, update, complete, create, gate_check' },
          properties_before: { type: 'OBJECT' as Type, description: 'Property snapshot before changes', properties: {} },
          properties_after: { type: 'OBJECT' as Type, description: 'Property snapshot after changes', properties: {} },
          context: { type: 'OBJECT' as Type, description: 'Optional visit context', properties: {} },
        },
        required: ['nord_id', 'visit_type'],
      },
    },
    {
      name: 'nords_switch_persona',
      description: `Switch the active persona lens. This changes how neighbors are weighted by persona bias and returns the updated horizon with reweighted view. Use this when the conversation shifts to a different domain.${dictionary?.personas?.length ? ` Available personas: ${dictionary.personas.map(p => p.name).join(', ')}` : ''}`,
      parameters: {
        type: 'OBJECT' as Type,
        properties: {
          persona_id: { type: 'STRING' as Type, description: 'UUID of the persona to switch to, or null to clear' },
        },
        required: ['persona_id'],
      },
    },
  ];

  const mutable: FunctionDeclaration[] = [
    {
      name: 'nords_create_nord',
      description: 'Create a new nord in the project.',
      parameters: {
        type: 'OBJECT' as Type,
        properties: {
          type_id: { type: 'STRING' as Type, description: 'UUID of the nord type' },
          title: { type: 'STRING' as Type, description: 'Title for the new nord' },
          properties: { type: 'OBJECT' as Type, description: 'Initial properties', properties: {} },
          position_x: { type: 'NUMBER' as Type, description: 'X position on canvas' },
          position_y: { type: 'NUMBER' as Type, description: 'Y position on canvas' },
        },
        required: ['type_id', 'title'],
      },
    },
    {
      name: 'nords_update_nord',
      description: 'Update an existing nord (title, properties).',
      parameters: {
        type: 'OBJECT' as Type,
        properties: {
          nord_id: { type: 'STRING' as Type, description: 'UUID of the nord to update' },
          title: { type: 'STRING' as Type, description: 'New title' },
          properties: { type: 'OBJECT' as Type, description: 'Updated properties', properties: {} },
        },
        required: ['nord_id'],
      },
    },
    {
      name: 'nords_delete_nord',
      description: 'Soft-delete a nord.',
      parameters: {
        type: 'OBJECT' as Type,
        properties: { nord_id: { type: 'STRING' as Type, description: 'UUID of the nord to delete' } },
        required: ['nord_id'],
      },
    },
    {
      name: 'nords_create_connection',
      description: 'Create a typed connection between two nords.',
      parameters: {
        type: 'OBJECT' as Type,
        properties: {
          type_id: { type: 'STRING' as Type, description: 'UUID of the connection type' },
          source_nord_id: { type: 'STRING' as Type, description: 'Source nord UUID' },
          target_nord_id: { type: 'STRING' as Type, description: 'Target nord UUID' },
          direction: { type: 'STRING' as Type, description: 'Direction: forward, reverse, both, none' },
          distance_x: { type: 'NUMBER' as Type, description: 'Position on X spectrum (0.0-1.0)' },
          distance_y: { type: 'NUMBER' as Type, description: 'Position on Y spectrum (0.0-1.0)' },
        },
        required: ['type_id', 'source_nord_id', 'target_nord_id'],
      },
    },
    {
      name: 'nords_update_connection',
      description: 'Update connection distance, direction, or properties.',
      parameters: {
        type: 'OBJECT' as Type,
        properties: {
          connection_id: { type: 'STRING' as Type, description: 'UUID of the connection' },
          distance_x: { type: 'NUMBER' as Type, description: 'New X spectrum position' },
          distance_y: { type: 'NUMBER' as Type, description: 'New Y spectrum position' },
          direction: { type: 'STRING' as Type, description: 'New direction' },
          properties: { type: 'OBJECT' as Type, description: 'Updated connection properties', properties: {} },
        },
        required: ['connection_id'],
      },
    },
    {
      name: 'nords_delete_connection',
      description: 'Soft-delete a connection.',
      parameters: {
        type: 'OBJECT' as Type,
        properties: { connection_id: { type: 'STRING' as Type, description: 'UUID of the connection to delete' } },
        required: ['connection_id'],
      },
    },
  ];

  return [...readOnly, ...session, ...(includeMutable ? mutable : [])];
}

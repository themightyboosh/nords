/**
 * geminiTools.ts — Gemini function declarations for all 18 MCP tools.
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
      description: `Get the project dictionary — the full ontology of nord types (with descriptions and property schemas), connection types (with verbs, measurement modes, stage labels), and personas (with backgrounds, motivations, mental models, and category weights).${ctx ? ' The horizon already gives you inline schemas, so you may not need this unless you want the full ontology.' : ' Call this FIRST at the start of every session to understand the vocabulary before making decisions.'}`,
      parameters: { type: 'OBJECT' as Type, properties: {}, required: [] },
    },
    {
      name: 'nords_get_horizon',
      description: `Get the Session Horizon — your full situational awareness. Returns current position (with session_properties and remaining_schema), persona-weighted neighbors, overall completion %, traversal breadcrumbs, suggested next nord, predicted 2-hop path, and planning_queue.${ctx}`,
      parameters: { type: 'OBJECT' as Type, properties: {}, required: [] },
    },
    {
      name: 'nords_get_graph',
      description: 'Get the full project graph including all nords, connections, and their types. Use this for broad exploration when the horizon is insufficient.',
      parameters: { type: 'OBJECT' as Type, properties: {}, required: [] },
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
      description: 'Search nords by type and/or title substring.',
      parameters: {
        type: 'OBJECT' as Type,
        properties: {
          type_id: { type: 'STRING' as Type, description: 'Filter by nord type UUID' },
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
      description: 'Get full session state: current position, all session nords with completion, and traversal history.',
      parameters: { type: 'OBJECT' as Type, properties: {}, required: [] },
    },
    {
      name: 'nords_get_incomplete_nords',
      description: 'Get all nords in the session that still have unfilled required properties.',
      parameters: { type: 'OBJECT' as Type, properties: {}, required: [] },
    },
    {
      name: 'nords_get_goals',
      description: 'Get session goals with progress. Returns each goal\'s status (pending/active/complete/cancelled), bound properties with collected values, exclusion groups, and prerequisite chains. Goal events are also returned automatically after every nords_update_session_nord call.',
      parameters: { type: 'OBJECT' as Type, properties: {}, required: [] },
    },
    {
      name: 'nords_get_briefing',
      description: `Cold-start composite tool — returns dictionary + horizon + goals in a single call. Use this at the very beginning of a session instead of calling nords_get_dictionary and nords_get_horizon separately. Saves 2 round-trips.${ctx}`,
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
      name: 'nords_traverse_connection',
      description: `Move to a connected nord by traversing a connection. Get the connection_id from neighbors[].relationship.connection_id in the horizon. The source_nord_id is your current position (horizon.current_nord.id) and target_nord_id is neighbors[].nord.id. direction should match neighbors[].relationship.direction. This updates your position and automatically returns the updated horizon.${ctx}`,
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
      name: 'nords_update_session_nord',
      description: 'Save collected property values to a session nord. Validates properties against the nord type schema, computes completion automatically, and returns the updated horizon. Use this when you have gathered information from the user. You can save to any nord, not just the current one.',
      parameters: {
        type: 'OBJECT' as Type,
        properties: {
          nord_id: { type: 'STRING' as Type, description: 'UUID of the nord to update' },
          properties: { type: 'OBJECT' as Type, description: 'Key-value pairs of collected properties', properties: {} },
        },
        required: ['nord_id', 'properties'],
      },
    },
    {
      name: 'nords_update_session_variables',
      description: 'Save collected project variable values. Variables are project-level data points (not tied to a specific nord). Pass the variable_id from remaining_variables in the horizon. Automatically evaluates goal completion and returns goal events + updated horizon. Use this whenever you learn a piece of information that maps to a project variable.',
      parameters: {
        type: 'OBJECT' as Type,
        properties: {
          variables: {
            type: 'ARRAY' as Type,
            description: 'Array of {variable_id, value} objects to save',
            items: {
              type: 'OBJECT' as Type,
              properties: {
                variable_id: { type: 'STRING' as Type, description: 'UUID of the project variable' },
                value: { type: 'STRING' as Type, description: 'The collected value (will be JSON-parsed if object)' },
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

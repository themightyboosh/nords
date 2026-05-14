/**
 * mcpMessages.ts — Repository for MCP conversation messages.
 *
 * Stores the full chat log per session including tool calls,
 * context snapshots, and token/latency metrics.
 */

import { query, queryOne } from '../db.js';
import type { McpMessage } from '../types/entities.js';

export const mcpMessagesRepo = {

  /** Append a message to a session */
  async create(msg: Omit<McpMessage, 'id' | 'created_at'>): Promise<McpMessage> {
    return queryOne<McpMessage>(`
      INSERT INTO mcp_messages (session_id, role, content, tool_calls, context, tokens_in, tokens_out, model, latency_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      msg.session_id,
      msg.role,
      msg.content,
      msg.tool_calls ? JSON.stringify(msg.tool_calls) : null,
      msg.context ? JSON.stringify(msg.context) : null,
      msg.tokens_in ?? null,
      msg.tokens_out ?? null,
      msg.model ?? null,
      msg.latency_ms ?? null,
    ]) as Promise<McpMessage>;
  },

  /** Get all messages for a session, ordered chronologically */
  async findBySession(sessionId: string): Promise<McpMessage[]> {
    return query<McpMessage>(
      'SELECT * FROM mcp_messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );
  },

  /** Get message count for a session */
  async countBySession(sessionId: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      'SELECT COUNT(*)::text as count FROM mcp_messages WHERE session_id = $1',
      [sessionId]
    );
    return parseInt(result?.count || '0', 10);
  },

  /** Get total token usage for a session */
  async getSessionTokenUsage(sessionId: string): Promise<{ totalIn: number; totalOut: number }> {
    const result = await queryOne<{ total_in: string; total_out: string }>(`
      SELECT COALESCE(SUM(tokens_in), 0)::text as total_in,
             COALESCE(SUM(tokens_out), 0)::text as total_out
      FROM mcp_messages WHERE session_id = $1
    `, [sessionId]);
    return {
      totalIn: parseInt(result?.total_in || '0', 10),
      totalOut: parseInt(result?.total_out || '0', 10),
    };
  },
};

-- Migration 016: MCP Messages (conversation logging for Preview Chat)
--
-- Stores the full conversation log per session. Used by:
-- - Preview chat UI for rendering messages
-- - Dev mode for inspecting tool calls and context payloads
-- - Session export and replay features

CREATE TABLE IF NOT EXISTS mcp_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES mcp_sessions(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content       TEXT NOT NULL,
  tool_calls    JSONB,                -- [{name, arguments, result}] for assistant tool invocations
  context       JSONB,                -- System prompt, injected schemas, persona context at time of message
  tokens_in     INTEGER,              -- Prompt token count
  tokens_out    INTEGER,              -- Completion token count
  model         TEXT,                 -- e.g. 'gemini-2.0-flash', 'gemini-2.5-pro'
  latency_ms    INTEGER,              -- Round-trip latency in milliseconds
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_messages_session
  ON mcp_messages (session_id, created_at ASC);

COMMENT ON TABLE mcp_messages IS 'Full conversation log per MCP session. Each row is one message in the chat.';
COMMENT ON COLUMN mcp_messages.tool_calls IS 'Array of tool call objects with name, arguments, and result for assistant-initiated actions.';
COMMENT ON COLUMN mcp_messages.context IS 'Snapshot of the assembled context (system prompt, schemas, persona) at message time. Used by Dev Mode.';

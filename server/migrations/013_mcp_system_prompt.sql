-- ═══════════════════════════════════════════════════════════════
-- Migration 013: MCP System Prompt on Projects
-- ═══════════════════════════════════════════════════════════════
-- Adds a system prompt field to projects that is injected into
-- MCP agent sessions. Combined with auto-generated schema context
-- and persona at session start. The LLM is just a runtime —
-- the project is the program.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS mcp_system_prompt TEXT DEFAULT NULL;

COMMENT ON COLUMN projects.mcp_system_prompt IS
  'System prompt injected into MCP agent sessions. Combined with schema context and persona at session start.';

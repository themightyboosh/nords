-- ═══════════════════════════════════════════════════════════
-- Migration 010: Add MCP + Purpose fields to Projects
-- ═══════════════════════════════════════════════════════════
-- Adds: purpose, mcp_enabled, mcp_capture_data, mcp_mutable
-- to the projects table for Issue 2 and Issue 8.

BEGIN;

INSERT INTO schema_migrations (version) VALUES ('010_project_mcp_fields')
  ON CONFLICT (version) DO NOTHING;

-- Purpose field (required going forward, nullable for existing data)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS purpose TEXT;

-- MCP settings
ALTER TABLE projects ADD COLUMN IF NOT EXISTS mcp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS mcp_capture_data BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS mcp_mutable BOOLEAN NOT NULL DEFAULT FALSE;

-- Default persona and default start nord
ALTER TABLE projects ADD COLUMN IF NOT EXISTS default_persona_id UUID;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS default_start_nord_id UUID;

COMMIT;

-- 038_always_on_agent.sql
-- Every project is now inherently an MCP/Agent project.
-- Default mcp_enabled to TRUE so existing projects work without toggling.

UPDATE projects SET mcp_enabled = true WHERE mcp_enabled = false;
ALTER TABLE projects ALTER COLUMN mcp_enabled SET DEFAULT true;

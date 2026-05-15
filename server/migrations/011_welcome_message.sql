-- 011: Add project-level welcome message for MCP chat sessions
-- Shown as the first message when a new session starts or is reset.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS mcp_welcome_message text;

COMMENT ON COLUMN projects.mcp_welcome_message IS 'Initial greeting message displayed when an MCP chat session starts';

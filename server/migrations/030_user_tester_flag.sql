-- ═══════════════════════════════════════════════════════════
-- Migration 030: User Tester Flag
-- ═══════════════════════════════════════════════════════════
-- Adds an is_tester boolean flag to the users table.
-- Testers can access preview/testing features without admin access.

BEGIN;

INSERT INTO schema_migrations (version) VALUES ('030_user_tester_flag');

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_tester BOOLEAN NOT NULL DEFAULT false;

COMMIT;

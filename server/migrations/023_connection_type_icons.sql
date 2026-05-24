-- ═══════════════════════════════════════════════════════════
-- Migration 023: Add icon column to connection_types
-- ═══════════════════════════════════════════════════════════
-- Unifies the icon+color pattern: connection types (categories) now
-- have an icon just like nord types, enabling the ColorIcon treatment
-- everywhere.

BEGIN;

INSERT INTO schema_migrations (version) VALUES ('023_connection_type_icons');

ALTER TABLE connection_types
  ADD COLUMN icon TEXT DEFAULT 'Link';

-- Backfill existing rows with the 'Link' default
UPDATE connection_types SET icon = 'Link' WHERE icon IS NULL;

COMMIT;

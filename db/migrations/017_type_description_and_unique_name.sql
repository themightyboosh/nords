-- 017_type_description_and_unique_name.sql
-- Add description field (required for AI semantic traversal) and
-- enforce unique type names per user (since types are user-scoped).

-- ── Add description column ──

ALTER TABLE nord_types
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

ALTER TABLE connection_types
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

-- ── Unique name constraint per user ──
-- Scoped to the user, not globally — two different users can have a
-- type named "Task". Soft-deleted types are excluded so a name can
-- be reused after deletion.

CREATE UNIQUE INDEX IF NOT EXISTS uq_nord_type_user_name
  ON nord_types (user_id, LOWER(name))
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_connection_type_user_name
  ON connection_types (user_id, LOWER(name))
  WHERE deleted_at IS NULL;

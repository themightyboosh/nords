-- 009_user_level_types.sql
-- Move type ownership from project-level to user-level.
-- Types become global components in a user's library.
-- Projects reference types via a join table.

-- ── Add user_id to type tables ──

ALTER TABLE nord_types ADD COLUMN user_id UUID REFERENCES users(id);
ALTER TABLE connection_types ADD COLUMN user_id UUID REFERENCES users(id);

-- ── Add is_system flag for non-deletable system defaults ──

ALTER TABLE connection_types ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT false;

-- ── Backfill user_id from project's created_by ──

UPDATE nord_types
SET user_id = (SELECT created_by FROM projects WHERE id = nord_types.project_id)
WHERE user_id IS NULL;

UPDATE connection_types
SET user_id = (SELECT created_by FROM projects WHERE id = connection_types.project_id)
WHERE user_id IS NULL;

-- ── Make user_id NOT NULL after backfill ──

ALTER TABLE nord_types ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE connection_types ALTER COLUMN user_id SET NOT NULL;

-- ── Create project_types join table ──

CREATE TABLE project_types (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type_id UUID NOT NULL,
  type_kind TEXT NOT NULL CHECK (type_kind IN ('nord', 'connection')),
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, type_id)
);

-- ── Backfill project_types from existing relationships ──

INSERT INTO project_types (project_id, type_id, type_kind, sort_order)
SELECT project_id, id, 'nord', sort_order FROM nord_types WHERE deleted_at IS NULL;

INSERT INTO project_types (project_id, type_id, type_kind, sort_order)
SELECT project_id, id, 'connection', sort_order FROM connection_types WHERE deleted_at IS NULL;

-- ── Drop project_id from type tables (no longer needed for ownership) ──
-- Note: keeping project_id temporarily for backward compat during migration.
-- Uncomment these after verifying the migration:
-- ALTER TABLE nord_types DROP COLUMN project_id;
-- ALTER TABLE connection_types DROP COLUMN project_id;

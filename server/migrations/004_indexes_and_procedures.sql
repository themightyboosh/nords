-- ═══════════════════════════════════════════════════════════
-- Migration 004: Indexes, Stored Procedures & Triggers
-- ═══════════════════════════════════════════════════════════
-- Performance layer. All indexes, stored procedures, and
-- trigger functions that make Postgres perform like a
-- native graph database at our scale.

BEGIN;

INSERT INTO schema_migrations (version) VALUES ('004_indexes_and_procedures');

-- ─────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- Fuzzy text search on titles/descriptions

-- ─────────────────────────────────────────────────────────
-- INDEXES: Nords
-- ─────────────────────────────────────────────────────────

-- Hot path: load all active nords for a project
CREATE INDEX idx_nords_project_active
  ON nords (project_id)
  WHERE deleted_at IS NULL;

-- MCP AI agent filtering: dynamic JSONB property queries
CREATE INDEX idx_nords_properties
  ON nords USING GIN (properties jsonb_path_ops);

-- Viewport culling: load only nords visible on screen
CREATE INDEX idx_nords_spatial
  ON nords (project_id, position_x, position_y)
  WHERE deleted_at IS NULL;

-- Fuzzy search on nord titles
CREATE INDEX idx_nords_title_trgm
  ON nords USING GIN (title gin_trgm_ops)
  WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────
-- INDEXES: Connections
-- ─────────────────────────────────────────────────────────

-- Hot path: load all active connections for a project
CREATE INDEX idx_connections_project_active
  ON connections (project_id)
  WHERE deleted_at IS NULL;

-- Graph traversal: all connections FROM a nord
CREATE INDEX idx_connections_source
  ON connections (source_nord_id)
  WHERE deleted_at IS NULL;

-- Graph traversal: all connections TO a nord
CREATE INDEX idx_connections_target
  ON connections (target_nord_id)
  WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────
-- INDEXES: Snapshots
-- ─────────────────────────────────────────────────────────

-- Chronological listing (most recent first)
CREATE INDEX idx_snapshots_project
  ON snapshots (project_id, created_at DESC);

-- ─────────────────────────────────────────────────────────
-- INDEXES: Comments
-- ─────────────────────────────────────────────────────────

-- Load comments for a specific nord or connection
CREATE INDEX idx_comments_target
  ON comments (target_type, target_id)
  WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────
-- STORED PROCEDURE: Load Entire Project Graph
-- ─────────────────────────────────────────────────────────
-- Called once per project open. Bundles all 4 entity types
-- into a single JSON payload entirely inside Postgres memory.
-- Replaces 4 network round trips with 1.

CREATE OR REPLACE FUNCTION fn_load_project_graph(p_project_id UUID)
RETURNS JSON
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'nord_types',
      COALESCE(
        (SELECT json_agg(row_to_json(t))
         FROM nord_types t
         WHERE t.project_id = p_project_id AND t.deleted_at IS NULL),
        '[]'::json
      ),
    'nords',
      COALESCE(
        (SELECT json_agg(row_to_json(n))
         FROM nords n
         WHERE n.project_id = p_project_id AND n.deleted_at IS NULL),
        '[]'::json
      ),
    'connection_types',
      COALESCE(
        (SELECT json_agg(row_to_json(ct))
         FROM connection_types ct
         WHERE ct.project_id = p_project_id AND ct.deleted_at IS NULL),
        '[]'::json
      ),
    'connections',
      COALESCE(
        (SELECT json_agg(row_to_json(c))
         FROM connections c
         WHERE c.project_id = p_project_id AND c.deleted_at IS NULL),
        '[]'::json
      )
  );
$$;

-- ─────────────────────────────────────────────────────────
-- STORED PROCEDURE: Capture Snapshot
-- ─────────────────────────────────────────────────────────
-- Assembles and stores a full graph keyframe in one atomic
-- transaction. Zero data leaves the database.

CREATE OR REPLACE FUNCTION fn_capture_snapshot(
  p_project_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS snapshots
LANGUAGE sql
VOLATILE
AS $$
  INSERT INTO snapshots (project_id, name, description, snapshot_data, created_by)
  VALUES (
    p_project_id,
    p_name,
    p_description,
    (SELECT fn_load_project_graph(p_project_id)),
    p_user_id
  )
  RETURNING *;
$$;

-- ─────────────────────────────────────────────────────────
-- STORED PROCEDURE: Batch Update Positions
-- ─────────────────────────────────────────────────────────
-- Drag-and-drop optimization. Accepts a JSONB array of
-- [{id, x, y}, ...] and updates all nords in one statement.

CREATE OR REPLACE FUNCTION fn_batch_update_positions(p_updates JSONB)
RETURNS INT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  affected INT;
BEGIN
  UPDATE nords
  SET
    position_x = (u->>'x')::float,
    position_y = (u->>'y')::float,
    updated_at = CURRENT_TIMESTAMP
  FROM jsonb_array_elements(p_updates) AS u
  WHERE nords.id = (u->>'id')::uuid
    AND nords.deleted_at IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- ─────────────────────────────────────────────────────────
-- TRIGGER: Snapshot Immutability
-- ─────────────────────────────────────────────────────────
-- Physically prevents any UPDATE on the snapshots table.
-- History is sacred.

CREATE OR REPLACE FUNCTION fn_deny_snapshot_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Snapshots are immutable. UPDATE is not permitted.';
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_snapshots_immutable
  BEFORE UPDATE ON snapshots
  FOR EACH ROW
  EXECUTE FUNCTION fn_deny_snapshot_update();

-- ─────────────────────────────────────────────────────────
-- TRIGGER: Cascade Soft-Delete Connections on Nord Delete
-- ─────────────────────────────────────────────────────────
-- When a nord is soft-deleted, all connections referencing
-- it (as source or target) are automatically soft-deleted.

CREATE OR REPLACE FUNCTION fn_cascade_soft_delete_connections()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    UPDATE connections
    SET deleted_at = NEW.deleted_at
    WHERE (source_nord_id = NEW.id OR target_nord_id = NEW.id)
      AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cascade_soft_delete_connections
  AFTER UPDATE OF deleted_at ON nords
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
  EXECUTE FUNCTION fn_cascade_soft_delete_connections();

-- ─────────────────────────────────────────────────────────
-- TRIGGER: Auto-update updated_at timestamp
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_nords_updated_at
  BEFORE UPDATE ON nords
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();

COMMIT;

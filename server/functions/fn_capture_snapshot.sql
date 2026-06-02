-- ═══════════════════════════════════════════════════════════
-- fn_capture_snapshot
-- ═══════════════════════════════════════════════════════════
-- Assembles and stores a full graph keyframe in one atomic
-- transaction. Zero data leaves the database.
--
-- History: 004 (current)

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

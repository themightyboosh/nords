-- ═══════════════════════════════════════════════════════════
-- fn_batch_update_positions
-- ═══════════════════════════════════════════════════════════
-- Drag-and-drop optimization. Accepts a JSONB array of
-- [{id, x, y}, ...] and updates all nords in one statement.
--
-- History: 004 (current)

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

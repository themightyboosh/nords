-- ═══════════════════════════════════════════════════════════
-- fn_cascade_cleanup_board_positions_by_type
-- ═══════════════════════════════════════════════════════════
-- Trigger function: when a connection_type is soft-deleted,
-- removes all board positions for that type.
--
-- History: 007 (current)

CREATE OR REPLACE FUNCTION fn_cascade_cleanup_board_positions_by_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    DELETE FROM nord_board_positions WHERE type_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

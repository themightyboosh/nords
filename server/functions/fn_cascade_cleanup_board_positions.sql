-- ═══════════════════════════════════════════════════════════
-- fn_cascade_cleanup_board_positions
-- ═══════════════════════════════════════════════════════════
-- Trigger function: when a nord is soft-deleted, removes its
-- board position entries (hard delete since positions are
-- ephemeral UI state, not historical data).
--
-- History: 007 (current)

CREATE OR REPLACE FUNCTION fn_cascade_cleanup_board_positions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    DELETE FROM nord_board_positions WHERE nord_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

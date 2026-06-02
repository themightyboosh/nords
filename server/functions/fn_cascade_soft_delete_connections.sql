-- ═══════════════════════════════════════════════════════════
-- fn_cascade_soft_delete_connections
-- ═══════════════════════════════════════════════════════════
-- Trigger function: when a nord is soft-deleted, all connections
-- referencing it (as source or target) are automatically soft-deleted.
--
-- History: 004 (current)

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

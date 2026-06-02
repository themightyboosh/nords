-- ═══════════════════════════════════════════════════════════
-- fn_set_updated_at
-- ═══════════════════════════════════════════════════════════
-- Trigger function: auto-sets updated_at to CURRENT_TIMESTAMP
-- on any UPDATE. Used by nords, projects, comments tables.
--
-- History: 004 (current)

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

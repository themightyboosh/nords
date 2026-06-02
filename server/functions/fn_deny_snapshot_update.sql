-- ═══════════════════════════════════════════════════════════
-- fn_deny_snapshot_update
-- ═══════════════════════════════════════════════════════════
-- Trigger function: physically prevents any UPDATE on snapshots.
-- History is sacred.
--
-- History: 004 (current)

CREATE OR REPLACE FUNCTION fn_deny_snapshot_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Snapshots are immutable. UPDATE is not permitted.';
  RETURN NULL;
END;
$$;

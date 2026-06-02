-- ═══════════════════════════════════════════════════════════
-- trg_collection_groups_updated_at
-- ═══════════════════════════════════════════════════════════
-- Trigger function: auto-sets updated_at to NOW() on
-- collection_groups UPDATE. Separate from fn_set_updated_at
-- because it uses NOW() vs CURRENT_TIMESTAMP (functionally
-- identical within a transaction, kept for historical fidelity).
--
-- History: 032 (current)

CREATE OR REPLACE FUNCTION trg_collection_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

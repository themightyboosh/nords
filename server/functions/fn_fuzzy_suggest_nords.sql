-- ═══════════════════════════════════════════════════════════
-- fn_fuzzy_suggest_nords
-- ═══════════════════════════════════════════════════════════
-- Standalone fuzzy search — can be reused by query_nords
-- or future tools that need spell-check suggestions.
--
-- History: 041 (current)

CREATE OR REPLACE FUNCTION fn_fuzzy_suggest_nords(
  p_project_id UUID,
  p_term TEXT,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  nord_id UUID,
  title TEXT,
  type_name TEXT,
  sim FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT n.id, n.title, nt.name, similarity(n.title, p_term)::float
  FROM nords n
  JOIN nord_types nt ON nt.id = n.type_id
  WHERE n.project_id = p_project_id
    AND n.deleted_at IS NULL
    AND n.title % p_term
  ORDER BY similarity(n.title, p_term) DESC
  LIMIT p_limit;
$$;

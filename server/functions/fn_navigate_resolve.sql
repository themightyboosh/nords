-- ═══════════════════════════════════════════════════════════
-- fn_navigate_resolve
-- ═══════════════════════════════════════════════════════════
-- Combines search (ILIKE) + fuzzy fallback (pg_trgm) + recency
-- flags into a single round trip. The navigate handler calls
-- this ONCE instead of 3 separate queries.
--
-- Neighbor scoring (persona_bias, goal_proximity, distance_x)
-- stays in TypeScript — it comes from the horizon, not the DB.
-- This is a HYBRID approach: DB does text + sets, TS does scoring.
--
-- History: 041 (current)

CREATE OR REPLACE FUNCTION fn_navigate_resolve(
  p_project_id UUID,
  p_session_id UUID,
  p_search_term TEXT,
  p_type_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  nord_id UUID,
  title TEXT,
  type_name TEXT,
  is_recent BOOLEAN,
  title_similarity FLOAT,
  source TEXT  -- 'ilike' or 'fuzzy'
)
LANGUAGE sql STABLE
AS $$
  WITH recent_nords AS (
    -- Recency set: last 10 distinct nords visited in this session
    SELECT target_nord_id
    FROM mcp_traversals
    WHERE session_id = p_session_id
    GROUP BY target_nord_id
    ORDER BY MAX(traversed_at) DESC
    LIMIT 10
  ),
  -- Phase 1: ILIKE search (substring match)
  ilike_matches AS (
    SELECT n.id AS nord_id, n.title, nt.name AS type_name,
           EXISTS(SELECT 1 FROM recent_nords r WHERE r.target_nord_id = n.id) AS is_recent,
           1.0::float AS title_similarity,
           'ilike'::text AS source
    FROM nords n
    JOIN nord_types nt ON nt.id = n.type_id
    WHERE n.project_id = p_project_id
      AND n.deleted_at IS NULL
      AND n.title ILIKE '%' || p_search_term || '%'
      AND (p_type_filter IS NULL OR nt.name ILIKE p_type_filter)
    LIMIT 20
  ),
  -- Phase 2: Fuzzy fallback (only if ILIKE found nothing)
  -- Uses % operator so the GIN trgm index is used (not seq scan)
  fuzzy_matches AS (
    SELECT n.id AS nord_id, n.title, nt.name AS type_name,
           EXISTS(SELECT 1 FROM recent_nords r WHERE r.target_nord_id = n.id) AS is_recent,
           similarity(n.title, p_search_term)::float AS title_similarity,
           'fuzzy'::text AS source
    FROM nords n
    JOIN nord_types nt ON nt.id = n.type_id
    WHERE n.project_id = p_project_id
      AND n.deleted_at IS NULL
      AND n.title % p_search_term   -- Uses GIN index!
      AND NOT EXISTS (SELECT 1 FROM ilike_matches)
      AND (p_type_filter IS NULL OR nt.name ILIKE p_type_filter)
    ORDER BY similarity(n.title, p_search_term) DESC
    LIMIT 5
  )
  SELECT * FROM ilike_matches
  UNION ALL
  SELECT * FROM fuzzy_matches;
$$;

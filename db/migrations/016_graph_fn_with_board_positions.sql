-- 016_graph_fn_with_board_positions.sql
-- Update fn_load_project_graph to include nord_board_positions in the payload.

CREATE OR REPLACE FUNCTION fn_load_project_graph(p_project_id UUID)
RETURNS JSON
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'nord_types',
      COALESCE(
        (SELECT json_agg(row_to_json(t))
         FROM nord_types t
         JOIN project_types pt ON pt.type_id = t.id AND pt.type_kind = 'nord'
         WHERE pt.project_id = p_project_id AND t.deleted_at IS NULL),
        '[]'::json
      ),
    'nords',
      COALESCE(
        (SELECT json_agg(row_to_json(n))
         FROM nords n
         WHERE n.project_id = p_project_id AND n.deleted_at IS NULL),
        '[]'::json
      ),
    'connection_types',
      COALESCE(
        (SELECT json_agg(row_to_json(ct))
         FROM connection_types ct
         JOIN project_types pt ON pt.type_id = ct.id AND pt.type_kind = 'connection'
         WHERE pt.project_id = p_project_id AND ct.deleted_at IS NULL),
        '[]'::json
      ),
    'connections',
      COALESCE(
        (SELECT json_agg(row_to_json(c))
         FROM connections c
         WHERE c.project_id = p_project_id AND c.deleted_at IS NULL),
        '[]'::json
      ),
    'board_positions',
      COALESCE(
        (SELECT json_agg(row_to_json(nbp))
         FROM nord_board_positions nbp
         JOIN nords n ON n.id = nbp.nord_id
         WHERE n.project_id = p_project_id
           AND n.deleted_at IS NULL),
        '[]'::json
      )
  )
$$;

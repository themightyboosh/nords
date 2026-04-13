-- 010_update_graph_function.sql
-- Update fn_load_project_graph to query types through project_types join table
-- instead of direct project_id on the type tables.

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
      )
  );
$$;

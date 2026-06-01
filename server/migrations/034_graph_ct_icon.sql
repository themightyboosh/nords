-- ═══════════════════════════════════════════════════════════
-- Migration 034: Add icon to fn_load_project_graph connection_types
-- ═══════════════════════════════════════════════════════════
-- The icon column was added to connection_types in migration 023,
-- but fn_load_project_graph (last updated in 008) didn't include it.
-- This adds 'icon' to the connection_types JSON output.

BEGIN;

INSERT INTO schema_migrations (version) VALUES ('034_graph_ct_icon');

CREATE OR REPLACE FUNCTION fn_load_project_graph(p_project_id uuid)
RETURNS json
LANGUAGE sql STABLE
AS $function$
  SELECT json_build_object(
    'nord_types',
      COALESCE(
        (SELECT json_agg(
          json_build_object(
            'id', t.id, 'project_id', t.project_id, 'name', t.name,
            'icon', t.icon, 'accent_color', t.accent_color,
            'description', t.description,
            'properties_schema', t.properties_schema,
            'sort_order', t.sort_order
          ) ORDER BY t.sort_order, t.name
        )
        FROM nord_types t
        WHERE t.project_id = p_project_id AND t.deleted_at IS NULL),
        '[]'::json
      ),
    'nords',
      COALESCE(
        (SELECT json_agg(
          json_build_object(
            'id', n.id, 'project_id', n.project_id, 'type_id', n.type_id,
            'title', n.title,
            'properties', n.properties,
            'position_x', n.position_x, 'position_y', n.position_y,
            'scale', n.scale,
            'created_at', n.created_at, 'updated_at', n.updated_at
          )
        )
        FROM nords n
        WHERE n.project_id = p_project_id AND n.deleted_at IS NULL),
        '[]'::json
      ),
    'connection_types',
      COALESCE(
        (SELECT json_agg(
          json_build_object(
            'id', ct.id, 'project_id', ct.project_id, 'name', ct.name,
            'icon', ct.icon,
            'accent_color', ct.accent_color, 'stroke_style', ct.stroke_style,
            'default_direction', ct.default_direction,
            'description', ct.description,
            'x_stage_labels', ct.x_stage_labels, 'y_stage_labels', ct.y_stage_labels,
            'properties_schema', ct.properties_schema,
            'sort_order', ct.sort_order, 'verb', ct.verb,
            'direction_filter', ct.direction_filter,
            'direction_prepositions', ct.direction_prepositions,
            'measurement_mode', ct.measurement_mode
          ) ORDER BY ct.sort_order, ct.name
        )
        FROM connection_types ct
        WHERE ct.project_id = p_project_id AND ct.deleted_at IS NULL),
        '[]'::json
      ),
    'connections',
      COALESCE(
        (SELECT json_agg(
          json_build_object(
            'id', c.id, 'project_id', c.project_id, 'type_id', c.type_id,
            'source_nord_id', c.source_nord_id, 'target_nord_id', c.target_nord_id,
            'direction', c.direction,
            'distance_x', c.distance_x, 'distance_y', c.distance_y,
            'properties', c.properties,
            'created_at', c.created_at
          )
        )
        FROM connections c
        WHERE c.project_id = p_project_id AND c.deleted_at IS NULL),
        '[]'::json
      ),
    'board_positions',
      COALESCE(
        (SELECT json_agg(
          json_build_object(
            'id', nbp.id, 'nord_id', nbp.nord_id, 'type_id', nbp.type_id,
            'distance_x', nbp.distance_x, 'distance_y', nbp.distance_y
          )
        )
        FROM nord_board_positions nbp
        JOIN nords n ON n.id = nbp.nord_id
        WHERE n.project_id = p_project_id
          AND n.deleted_at IS NULL),
        '[]'::json
      )
  )
$function$;

COMMIT;

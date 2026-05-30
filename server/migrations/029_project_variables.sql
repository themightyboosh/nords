-- ══════════════════════════════════════════════════════════
-- 029: Global Project Variables + Goal Variable Bindings
-- ══════════════════════════════════════════════════════════
-- Moves MCP variable collection from per-nord properties to a
-- global project-level variable registry. Goals now bind to global
-- variables. Adds capture-context metadata and goal event audit log.

-- 1. Project Variables (master list)
CREATE TABLE IF NOT EXISTS project_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'string'
    CHECK (type IN ('string','number','boolean','date','select',
                    'multi_select','date_range','email','url','phone')),
  options JSONB,
  required BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  hint TEXT DEFAULT '',
  priority INT NOT NULL DEFAULT 0,
  depends_on TEXT DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, name)
);
CREATE INDEX IF NOT EXISTS idx_pv_project ON project_variables(project_id);

-- 2. Goal Variable Bindings (replaces goal_properties)
CREATE TABLE IF NOT EXISTS goal_variable_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  variable_id UUID NOT NULL REFERENCES project_variables(id) ON DELETE CASCADE,
  required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(goal_id, variable_id)
);
CREATE INDEX IF NOT EXISTS idx_gvb_goal ON goal_variable_bindings(goal_id);

-- 3. Goal Relevant Nords (bidirectional)
CREATE TABLE IF NOT EXISTS goal_relevant_nords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  nord_id UUID NOT NULL REFERENCES nords(id) ON DELETE CASCADE,
  UNIQUE(goal_id, nord_id)
);
CREATE INDEX IF NOT EXISTS idx_grn_goal ON goal_relevant_nords(goal_id);
CREATE INDEX IF NOT EXISTS idx_grn_nord ON goal_relevant_nords(nord_id);

-- 4. Goal Relevant Nord Types
CREATE TABLE IF NOT EXISTS goal_relevant_nord_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  nord_type_id UUID NOT NULL REFERENCES nord_types(id) ON DELETE CASCADE,
  UNIQUE(goal_id, nord_type_id)
);

-- 5. Session Variables (replaces per-nord MCP property storage)
-- Rich capture metadata: where (nord), who (persona), and when (sequence)
CREATE TABLE IF NOT EXISTS mcp_session_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES mcp_sessions(id) ON DELETE CASCADE,
  variable_id UUID NOT NULL REFERENCES project_variables(id) ON DELETE CASCADE,
  value JSONB,
  nord_id UUID REFERENCES nords(id) ON DELETE SET NULL,
  persona_id UUID REFERENCES personas(id) ON DELETE SET NULL,
  sequence INT NOT NULL DEFAULT 0,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, variable_id)
);
CREATE INDEX IF NOT EXISTS idx_msv_session ON mcp_session_variables(session_id);

-- 5b. Goal completion audit log (sequence of goal events for analytics)
CREATE TABLE IF NOT EXISTS mcp_session_goal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES mcp_sessions(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('goal_completed','goal_activated','goal_cancelled','session_terminating')),
  persona_id UUID REFERENCES personas(id) ON DELETE SET NULL,
  nord_id UUID REFERENCES nords(id) ON DELETE SET NULL,
  sequence INT NOT NULL DEFAULT 0,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_msge_session ON mcp_session_goal_events(session_id);

-- 6. Graph Only flag
ALTER TABLE projects ADD COLUMN IF NOT EXISTS graph_only BOOLEAN NOT NULL DEFAULT false;

-- 7. Migrate demo project's source:'mcp' properties to project_variables
INSERT INTO project_variables (project_id, name, description, type, options, required, tags, hint, priority, sort_order)
SELECT DISTINCT ON (nt.project_id, prop->>'name')
  nt.project_id,
  prop->>'name',
  COALESCE(prop->>'description', ''),
  COALESCE(prop->>'type', 'string'),
  prop->'options',
  COALESCE((prop->>'required')::boolean, false),
  ARRAY[nt.name],
  COALESCE(prop->>'hint', ''),
  COALESCE((prop->>'priority')::int, 0),
  ROW_NUMBER() OVER (PARTITION BY nt.project_id ORDER BY nt.name, prop->>'name')
FROM nord_types nt
JOIN projects p ON p.id = nt.project_id AND p.is_demo = true
CROSS JOIN LATERAL jsonb_array_elements(nt.properties_schema) AS prop
WHERE (prop->>'source') = 'mcp'
  AND nt.deleted_at IS NULL
ON CONFLICT (project_id, name) DO NOTHING;

-- 8. Remove source:'mcp' properties from demo project nord type schemas
UPDATE nord_types nt SET
  properties_schema = (
    SELECT COALESCE(jsonb_agg(prop), '[]'::jsonb)
    FROM jsonb_array_elements(nt.properties_schema) AS prop
    WHERE (prop->>'source') IS DISTINCT FROM 'mcp'
  )
FROM projects p
WHERE nt.project_id = p.id
  AND p.is_demo = true
  AND nt.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(nt.properties_schema) AS prop
    WHERE (prop->>'source') = 'mcp'
  );

-- 9. Drop old goal_properties table (replaced by goal_variable_bindings)
DROP TABLE IF EXISTS goal_properties CASCADE;

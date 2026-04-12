-- 003_nord_types.sql

CREATE TABLE nord_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  accent_color TEXT,
  properties_schema JSONB DEFAULT '[]'::jsonb,
  scale_property TEXT NULL,
  sort_order INT DEFAULT 0,
  deleted_at TIMESTAMPTZ NULL
);

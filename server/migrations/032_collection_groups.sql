-- ══════════════════════════════════════════════════════════
-- 032: Collection Groups — Grouped containers for project variables
-- ══════════════════════════════════════════════════════════
-- Restructures Collections from flat lists to grouped containers,
-- matching the Types and Categories pattern. Each project has
-- collection groups, and project_variables belong to groups.

BEGIN;

INSERT INTO schema_migrations (version) VALUES ('032_collection_groups');

-- 1. Collection Groups table
CREATE TABLE IF NOT EXISTS collection_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'Layers',
  accent_color TEXT DEFAULT '#a78bfa',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  UNIQUE(project_id, name)
);
CREATE INDEX IF NOT EXISTS idx_cg_project ON collection_groups(project_id) WHERE deleted_at IS NULL;

-- 2. Add collection_group_id FK to existing project_variables
ALTER TABLE project_variables
  ADD COLUMN IF NOT EXISTS collection_group_id UUID REFERENCES collection_groups(id) ON DELETE SET NULL;

-- 3. Migrate: create a default "General" group per project for any existing variables
INSERT INTO collection_groups (project_id, name, description, icon, accent_color, sort_order)
SELECT DISTINCT project_id, 'General', 'Default collection group', 'Layers', '#a78bfa', 0
FROM project_variables
ON CONFLICT (project_id, name) DO NOTHING;

-- 4. Assign orphaned variables to their project's "General" group
UPDATE project_variables pv
SET collection_group_id = cg.id
FROM collection_groups cg
WHERE pv.project_id = cg.project_id
  AND cg.name = 'General'
  AND pv.collection_group_id IS NULL;

-- 5. updated_at trigger for collection_groups
CREATE OR REPLACE FUNCTION trg_collection_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_collection_groups_updated_at ON collection_groups;
CREATE TRIGGER trg_collection_groups_updated_at
  BEFORE UPDATE ON collection_groups
  FOR EACH ROW
  EXECUTE FUNCTION trg_collection_groups_updated_at();

COMMIT;

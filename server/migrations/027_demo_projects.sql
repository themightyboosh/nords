-- ═══════════════════════════════════════════════════════════
-- Migration 027: Demo Projects flag
-- ═══════════════════════════════════════════════════════════
-- Allows admins to flag projects as "Demo". 
-- Demo projects are auto-cloned for new users on first login.

BEGIN;

INSERT INTO schema_migrations (version) VALUES ('027_demo_projects');

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE projects ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_demo ON projects(is_demo) WHERE is_demo = true;

COMMIT;

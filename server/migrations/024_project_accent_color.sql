-- ═══════════════════════════════════════════════════════════
-- Migration 024: Add accent_color to projects table
-- ═══════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#6b7aed';

COMMIT;

-- Migration 040: Add 'scoring' status to test_runs
-- Supports the new post-facto scoring pipeline where the conversation finishes
-- before scoring begins.

-- Drop the old CHECK constraint and add one that includes 'scoring'
ALTER TABLE test_runs DROP CONSTRAINT IF EXISTS test_runs_status_check;
ALTER TABLE test_runs ADD CONSTRAINT test_runs_status_check
  CHECK (status IN ('running', 'scoring', 'completed', 'failed', 'cancelled'));

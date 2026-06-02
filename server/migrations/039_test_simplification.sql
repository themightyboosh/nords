-- Migration 039: Simplify test termination + add hallucination scoring
--
-- Plan Items 7 & 9:
-- 1. Remove stop_on_completion_pct and min_completion_pct from test_scenarios
-- 2. Add hallucination_score and hallucination_details to test_runs

-- ── Item 9: Remove completion-based termination/pass columns ──
ALTER TABLE test_scenarios DROP COLUMN IF EXISTS stop_on_completion_pct;
ALTER TABLE test_scenarios DROP COLUMN IF EXISTS min_completion_pct;

-- ── Item 7: Add hallucination scoring to test runs ──
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS hallucination_score INT;
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS hallucination_details TEXT;

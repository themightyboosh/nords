-- ═══════════════════════════════════════════════════════════
-- Migration 011: Accounts & Billing Infrastructure
-- ═══════════════════════════════════════════════════════════
-- Introduces the billing entity layer: accounts own organizations,
-- usage_events track API consumption, and account_invoices store
-- monthly cost-allocation records.
--
-- Stripe fields are placeholders — no Stripe dependency yet.

BEGIN;

INSERT INTO schema_migrations (version) VALUES ('011_accounts_billing');

-- ═══════════════════════════════════════════════════════════
-- ACCOUNTS — billing entity that owns organizations
-- ═══════════════════════════════════════════════════════════
CREATE TABLE accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  owner_user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  billing_email       TEXT,
  stripe_customer_id  TEXT UNIQUE,            -- placeholder for future Stripe integration
  plan                TEXT NOT NULL DEFAULT 'free',  -- free | pro | enterprise
  status              TEXT NOT NULL DEFAULT 'active', -- active | suspended | closed
  created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_owner ON accounts (owner_user_id) WHERE status = 'active';

-- ═══════════════════════════════════════════════════════════
-- Link organizations → accounts
-- ═══════════════════════════════════════════════════════════
ALTER TABLE organizations
  ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX idx_orgs_account ON organizations (account_id);

-- ═══════════════════════════════════════════════════════════
-- USAGE EVENTS — lightweight request log for cost attribution
-- ═══════════════════════════════════════════════════════════
CREATE TABLE usage_events (
  id          BIGSERIAL PRIMARY KEY,
  account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL DEFAULT 'api_request',
  quantity    INTEGER NOT NULL DEFAULT 1,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Optimized for monthly aggregation queries
CREATE INDEX idx_usage_account_month ON usage_events (account_id, created_at);
CREATE INDEX idx_usage_type_month ON usage_events (event_type, created_at);

-- ═══════════════════════════════════════════════════════════
-- ACCOUNT INVOICES — monthly cost-allocation records
-- ═══════════════════════════════════════════════════════════
CREATE TABLE account_invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  total_requests      BIGINT NOT NULL DEFAULT 0,
  gcp_cost_share_usd  NUMERIC(10,4) NOT NULL DEFAULT 0,
  markup_pct          NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  total_billed_usd    NUMERIC(10,4) NOT NULL DEFAULT 0,
  stripe_invoice_id   TEXT,                    -- placeholder for future Stripe integration
  status              TEXT NOT NULL DEFAULT 'draft', -- draft | sent | paid | void
  created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(account_id, period_start)
);

CREATE INDEX idx_invoices_account ON account_invoices (account_id, period_start DESC);

-- ═══════════════════════════════════════════════════════════
-- Seed a default account for single-user dev mode
-- ═══════════════════════════════════════════════════════════
INSERT INTO accounts (id, name, billing_email, plan, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Dev Account',
  'dev@nords.local',
  'free',
  'active'
)
ON CONFLICT DO NOTHING;

-- Link the placeholder org (if it exists) to the dev account
UPDATE organizations
SET account_id = '00000000-0000-0000-0000-000000000001'
WHERE id = '00000000-0000-0000-0000-000000000000'
  AND account_id IS NULL;

COMMIT;

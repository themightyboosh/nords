import { query, queryOne } from '../db.js';
import type { Account, UsageEvent, AccountInvoice } from '../types/entities.js';

// ═══════════════════════════════════════════════════════════
// Account CRUD
// ═══════════════════════════════════════════════════════════

export async function findById(id: string): Promise<Account | null> {
  return queryOne<Account>('SELECT * FROM accounts WHERE id = $1', [id]);
}

export async function findAll(): Promise<Account[]> {
  return query<Account>('SELECT * FROM accounts WHERE status != $1 ORDER BY created_at DESC', ['closed']);
}

export async function findByOwner(userId: string): Promise<Account | null> {
  return queryOne<Account>('SELECT * FROM accounts WHERE owner_user_id = $1 AND status = $2', [userId, 'active']);
}

export async function create(account: Pick<Account, 'name' | 'owner_user_id' | 'billing_email'>): Promise<Account> {
  return queryOne<Account>(`
    INSERT INTO accounts (name, owner_user_id, billing_email)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [account.name, account.owner_user_id, account.billing_email]) as Promise<Account>;
}

type UpdatableAccountFields = Pick<Account, 'name' | 'billing_email' | 'plan' | 'status'>;

export async function update(id: string, updates: Partial<UpdatableAccountFields>): Promise<Account | null> {
  const allowedKeys: (keyof UpdatableAccountFields)[] = ['name', 'billing_email', 'plan', 'status'];
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (!allowedKeys.includes(key as keyof UpdatableAccountFields)) continue;
    setClauses.push(`${key} = $${paramIdx}`);
    values.push(value);
    paramIdx++;
  }

  if (setClauses.length === 0) return findById(id);

  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  return queryOne<Account>(`
    UPDATE accounts SET ${setClauses.join(', ')}
    WHERE id = $${paramIdx}
    RETURNING *
  `, values);
}

// ═══════════════════════════════════════════════════════════
// Usage Metering
// ═══════════════════════════════════════════════════════════

export async function recordUsage(
  accountId: string,
  eventType: string,
  projectId?: string | null,
  quantity: number = 1,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await query(
    `INSERT INTO usage_events (account_id, project_id, event_type, quantity, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [accountId, projectId || null, eventType, quantity, JSON.stringify(metadata)],
  );
}

export interface UsageSummary {
  account_id: string;
  event_type: string;
  total_quantity: number;
  event_count: number;
}

export async function getUsageSummary(
  accountId: string,
  periodStart: string,
  periodEnd: string,
): Promise<UsageSummary[]> {
  return query<UsageSummary>(`
    SELECT account_id, event_type,
           SUM(quantity)::int AS total_quantity,
           COUNT(*)::int AS event_count
    FROM usage_events
    WHERE account_id = $1
      AND created_at >= $2
      AND created_at < $3
    GROUP BY account_id, event_type
  `, [accountId, periodStart, periodEnd]);
}

// ═══════════════════════════════════════════════════════════
// Invoices
// ═══════════════════════════════════════════════════════════

export async function getInvoices(accountId: string): Promise<AccountInvoice[]> {
  return query<AccountInvoice>(
    'SELECT * FROM account_invoices WHERE account_id = $1 ORDER BY period_start DESC',
    [accountId],
  );
}

export async function upsertInvoice(invoice: Omit<AccountInvoice, 'id' | 'created_at'>): Promise<AccountInvoice> {
  return queryOne<AccountInvoice>(`
    INSERT INTO account_invoices
      (account_id, period_start, period_end, total_requests, gcp_cost_share_usd, markup_pct, total_billed_usd, stripe_invoice_id, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (account_id, period_start) DO UPDATE SET
      period_end = EXCLUDED.period_end,
      total_requests = EXCLUDED.total_requests,
      gcp_cost_share_usd = EXCLUDED.gcp_cost_share_usd,
      total_billed_usd = EXCLUDED.total_billed_usd,
      stripe_invoice_id = EXCLUDED.stripe_invoice_id,
      status = EXCLUDED.status
    RETURNING *
  `, [
    invoice.account_id,
    invoice.period_start,
    invoice.period_end,
    invoice.total_requests,
    invoice.gcp_cost_share_usd,
    invoice.markup_pct,
    invoice.total_billed_usd,
    invoice.stripe_invoice_id,
    invoice.status,
  ]) as Promise<AccountInvoice>;
}

/**
 * metering.ts — Lightweight API request metering middleware.
 *
 * Logs every authenticated API request to the usage_events table
 * for cost attribution. Inserts are fire-and-forget so metering
 * never blocks or crashes the request pipeline.
 *
 * The middleware expects `req.accountId` to be set by the
 * account-resolution step in auth (or a dev placeholder).
 */

import { Request, Response, NextFunction } from 'express';
import { query } from '../db.js';
import logger from '../lib/logger.js';

// Dev-mode default account (matches 011_accounts_billing.sql seed)
const DEV_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

// Extend Express Request to include accountId
declare global {
  namespace Express {
    interface Request {
      accountId?: string;
    }
  }
}

/**
 * Resolves the accountId for the current request.
 *
 * In production this would look up the user's account via org_members → organizations → accounts.
 * For now it uses a dev placeholder so we can start collecting usage data immediately.
 */
export async function resolveAccount(req: Request, _res: Response, next: NextFunction): Promise<void> {
  // If already set (e.g. by a future auth integration), skip
  if (req.accountId) return next();

  // TODO: Production path — resolve from user.uid → accounts (when billing is implemented)
  // const userId = req.user?.uid;
  // if (userId) {
  //   const row = await queryOne<{ id: string }>(
  //     `SELECT a.id FROM accounts a
  //      WHERE a.owner_user_id = (SELECT id FROM users WHERE firebase_uid = $1)
  //      LIMIT 1`, [userId]
  //   );
  //   if (row) { req.accountId = row.id; return next(); }
  // }

  // Dev fallback
  req.accountId = DEV_ACCOUNT_ID;
  next();
}

/**
 * Records the API request as a usage event.
 * Fire-and-forget — errors are logged but never propagated.
 */
export function meteringMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const accountId = req.accountId;
  if (!accountId) return next();

  // Extract a project ID from common route patterns
  const projectId = req.params.projectId || req.params.id || null;

  // Fire-and-forget insert
  query(
    `INSERT INTO usage_events (account_id, project_id, event_type, quantity, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      accountId,
      projectId,
      'api_request',
      1,
      JSON.stringify({ method: req.method, path: req.path }),
    ],
  ).catch((err) => {
    // Swallow — metering must never break the app
    logger.debug('Metering insert failed (non-fatal)', { error: (err as Error).message });
  });

  next();
}

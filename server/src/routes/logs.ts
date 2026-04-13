import { Router, Request, Response } from 'express';
import logger from '../lib/logger.js';

export const logsRouter = Router();

/**
 * POST /api/logs
 * Receives batched log entries from the client and pipes them into
 * the server's Winston instance. Each entry is tagged with service: 'nords-client'
 * so server-side and client-side logs are distinguishable in the same stream.
 *
 * Body: { entries: Array<{ level, message, timestamp, service, meta?, stack? }> }
 *
 * Rate-limited to 50 entries per batch to prevent abuse.
 */
logsRouter.post('/logs', (req: Request, res: Response) => {
  const { entries } = req.body;

  if (!Array.isArray(entries) || entries.length === 0) {
    res.status(400).json({ error: 'entries array is required' });
    return;
  }

  // Cap batch size to prevent abuse
  const batch = entries.slice(0, 50);
  let ingested = 0;

  for (const entry of batch) {
    const { level, message, timestamp: clientTs, meta, stack } = entry;

    // Validate level
    if (!['error', 'warn', 'info', 'debug'].includes(level)) continue;
    if (typeof message !== 'string' || !message) continue;

    const logMeta = {
      service: 'nords-client',
      clientTimestamp: clientTs,
      ...(meta || {}),
      ...(stack ? { clientStack: stack } : {}),
      userId: (req as any).user?.uid || 'anonymous',
    };

    // Pipe into Winston at the correct level
    (logger as any)[level](message, logMeta);
    ingested++;
  }

  res.json({ ingested });
});

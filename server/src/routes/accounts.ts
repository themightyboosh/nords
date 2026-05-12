/**
 * accounts.ts — Account CRUD and usage/billing endpoints.
 *
 * Routes:
 *   GET    /accounts                — list all accounts
 *   GET    /accounts/:id            — get account by id
 *   POST   /accounts                — create account
 *   PUT    /accounts/:id            — update account
 *   GET    /accounts/:id/usage      — usage summary for current period
 *   GET    /accounts/:id/invoices   — invoice history
 */

import { Router, Request, Response } from 'express';
import * as accountsRepo from '../repositories/accounts.js';
import logger from '../lib/logger.js';
import { validate } from '../middleware/validate.js';
import { CreateAccountSchema, UpdateAccountSchema } from '../schemas/accounts.js';

export const accountsRouter = Router();

/**
 * @openapi
 * /api/accounts:
 *   get:
 *     tags: [Accounts]
 *     summary: List all accounts
 *     description: Returns all active (non-closed) billing accounts.
 *     responses:
 *       200:
 *         description: Array of accounts
 */
accountsRouter.get('/accounts', async (_req: Request, res: Response) => {
  try {
    const accounts = await accountsRepo.findAll();
    res.json(accounts);
  } catch (err: any) {
    logger.error('Failed to list accounts', { error: err.message });
    res.status(500).json({ error: 'Failed to list accounts' });
  }
});

/**
 * @openapi
 * /api/accounts/{id}:
 *   get:
 *     tags: [Accounts]
 *     summary: Get account by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Account object
 *       404:
 *         description: Not found
 */
accountsRouter.get('/accounts/:id', async (req: Request, res: Response) => {
  try {
    const account = await accountsRepo.findById(req.params.id as string);
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.json(account);
  } catch (err: any) {
    logger.error('Failed to get account', { error: err.message });
    res.status(500).json({ error: 'Failed to get account' });
  }
});

/**
 * @openapi
 * /api/accounts:
 *   post:
 *     tags: [Accounts]
 *     summary: Create a billing account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               billing_email:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: Created account
 *       400:
 *         description: Validation error
 */
accountsRouter.post('/accounts', validate(CreateAccountSchema), async (req: Request, res: Response) => {
  try {
    const { name, billing_email } = req.body;
    const account = await accountsRepo.create({
      name,
      owner_user_id: req.user?.uid || null,
      billing_email: billing_email || null,
    });
    res.status(201).json(account);
  } catch (err: any) {
    logger.error('Failed to create account', { error: err.message });
    res.status(500).json({ error: 'Failed to create account' });
  }
});

/**
 * @openapi
 * /api/accounts/{id}:
 *   put:
 *     tags: [Accounts]
 *     summary: Update account
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Updated account
 *       404:
 *         description: Not found
 */
accountsRouter.put('/accounts/:id', validate(UpdateAccountSchema), async (req: Request, res: Response) => {
  try {
    const account = await accountsRepo.update(req.params.id as string, req.body);
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.json(account);
  } catch (err: any) {
    logger.error('Failed to update account', { error: err.message });
    res.status(500).json({ error: 'Failed to update account' });
  }
});

/**
 * @openapi
 * /api/accounts/{id}/usage:
 *   get:
 *     tags: [Accounts]
 *     summary: Usage summary for billing period
 *     description: Returns aggregated API request counts per event type for the specified or current billing period.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date
 *         description: Period start (YYYY-MM-DD). Defaults to first of current month.
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date
 *         description: Period end (YYYY-MM-DD). Defaults to first of next month.
 *     responses:
 *       200:
 *         description: Usage summary with event counts
 */
accountsRouter.get('/accounts/:id/usage', async (req: Request, res: Response) => {
  try {
    // Default to current month
    const now = new Date();
    const periodStart = req.query.start as string ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const periodEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const periodEnd = req.query.end as string ||
      `${periodEndDate.getFullYear()}-${String(periodEndDate.getMonth() + 1).padStart(2, '0')}-01`;

    const id = req.params.id as string;
    const summary = await accountsRepo.getUsageSummary(id, periodStart, periodEnd);
    res.json({
      account_id: id,
      period_start: periodStart,
      period_end: periodEnd,
      usage: summary,
    });
  } catch (err: any) {
    logger.error('Failed to get usage summary', { error: err.message });
    res.status(500).json({ error: 'Failed to get usage summary' });
  }
});

/**
 * @openapi
 * /api/accounts/{id}/invoices:
 *   get:
 *     tags: [Accounts]
 *     summary: Invoice history
 *     description: Returns all invoices for the account, most recent first.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Array of invoices
 */
accountsRouter.get('/accounts/:id/invoices', async (req: Request, res: Response) => {
  try {
    const invoices = await accountsRepo.getInvoices(req.params.id as string);
    res.json(invoices);
  } catch (err: any) {
    logger.error('Failed to get invoices', { error: err.message });
    res.status(500).json({ error: 'Failed to get invoices' });
  }
});

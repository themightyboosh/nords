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

export const accountsRouter = Router();

// ── List all accounts ──
accountsRouter.get('/accounts', async (_req: Request, res: Response) => {
  try {
    const accounts = await accountsRepo.findAll();
    res.json(accounts);
  } catch (err: any) {
    logger.error('Failed to list accounts', { error: err.message });
    res.status(500).json({ error: 'Failed to list accounts' });
  }
});

// ── Get account by ID ──
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

// ── Create account ──
accountsRouter.post('/accounts', async (req: Request, res: Response) => {
  try {
    const { name, billing_email } = req.body;
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
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

// ── Update account ──
accountsRouter.put('/accounts/:id', async (req: Request, res: Response) => {
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

// ── Usage summary for current period ──
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

// ── Invoice history ──
accountsRouter.get('/accounts/:id/invoices', async (req: Request, res: Response) => {
  try {
    const invoices = await accountsRepo.getInvoices(req.params.id as string);
    res.json(invoices);
  } catch (err: any) {
    logger.error('Failed to get invoices', { error: err.message });
    res.status(500).json({ error: 'Failed to get invoices' });
  }
});

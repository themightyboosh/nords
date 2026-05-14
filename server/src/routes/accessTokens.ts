/**
 * accessTokens.ts — API routes for per-project access token management.
 *
 *   POST   /api/projects/:id/tokens          — Generate new token
 *   GET    /api/projects/:id/tokens          — List active tokens
 *   DELETE /api/tokens/:id                   — Revoke a token
 */

import { Router, Request, Response } from 'express';
import { accessTokensRepo } from '../repositories/accessTokens.js';
import logger from '../lib/logger.js';

export const accessTokensRouter = Router();

/**
 * @openapi
 * /api/projects/{id}/tokens:
 *   post:
 *     tags: [Access Tokens]
 *     summary: Generate a new access token
 *     description: Creates a new API access token for the project. The raw token is returned exactly once in the response — it cannot be retrieved again.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label:
 *                 type: string
 *               scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Token created (raw token included once)
 */
accessTokensRouter.post('/projects/:id/tokens', async (req: Request, res: Response) => {
  try {
    const { label = 'API Key', scopes = ['read'] } = req.body || {};
    const result = await accessTokensRepo.create(req.params.id as string, label, scopes);
    res.status(201).json({
      token: result.rawToken,     // Shown once!
      id: result.token.id,
      label: result.token.label,
      token_prefix: result.token.token_prefix,
      scopes: result.token.scopes,
      created_at: result.token.created_at,
    });
  } catch (err: any) {
    logger.error('Failed to create access token', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to create access token' });
  }
});

/**
 * @openapi
 * /api/projects/{id}/tokens:
 *   get:
 *     tags: [Access Tokens]
 *     summary: List active tokens
 *     description: Returns all non-revoked tokens for a project. Token hashes are NOT returned — only prefixes for identification.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Array of active tokens (without hashes)
 */
accessTokensRouter.get('/projects/:id/tokens', async (req: Request, res: Response) => {
  try {
    const tokens = await accessTokensRepo.findByProject(req.params.id as string);
    // Strip token_hash from response — never expose
    const safe = tokens.map(({ token_hash, ...rest }) => rest);
    res.json(safe);
  } catch (err: any) {
    logger.error('Failed to list access tokens', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to list access tokens' });
  }
});

/**
 * @openapi
 * /api/tokens/{id}:
 *   delete:
 *     tags: [Access Tokens]
 *     summary: Revoke an access token
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Token revoked
 *       404:
 *         description: Token not found or already revoked
 */
accessTokensRouter.delete('/tokens/:id', async (req: Request, res: Response) => {
  try {
    const revoked = await accessTokensRepo.revoke(req.params.id as string);
    if (!revoked) return res.status(404).json({ error: 'Token not found or already revoked' });
    res.json({ success: true, id: revoked.id });
  } catch (err: any) {
    logger.error('Failed to revoke token', { error: err.message, id: req.params.id });
    res.status(500).json({ error: 'Failed to revoke token' });
  }
});

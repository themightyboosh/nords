/**
 * accessTokens.ts — Repository for per-project API access tokens.
 *
 * Tokens are hashed (SHA-256) before storage. The raw token is returned
 * exactly once at creation time. Lookup is done by hash.
 */

import { createHash, randomBytes } from 'crypto';
import { query, queryOne } from '../db.js';
import type { ProjectAccessToken } from '../types/entities.js';

const TOKEN_PREFIX = 'nrd_';

/** Generate a cryptographically secure token string */
function generateRawToken(): string {
  return TOKEN_PREFIX + randomBytes(32).toString('hex');
}

/** Hash a raw token for storage/lookup */
function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export const accessTokensRepo = {

  /** Create a new token. Returns the raw token (shown once) + the stored record. */
  async create(projectId: string, label: string, scopes: string[] = ['read']): Promise<{ rawToken: string; token: ProjectAccessToken }> {
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const tokenPrefix = rawToken.slice(0, 12) + '…';

    const token = await queryOne<ProjectAccessToken>(`
      INSERT INTO project_access_tokens (project_id, label, token_hash, token_prefix, scopes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [projectId, label, tokenHash, tokenPrefix, scopes]) as ProjectAccessToken;

    return { rawToken, token };
  },

  /** Find all active (non-revoked) tokens for a project */
  async findByProject(projectId: string): Promise<ProjectAccessToken[]> {
    return query<ProjectAccessToken>(
      'SELECT * FROM project_access_tokens WHERE project_id = $1 AND revoked_at IS NULL ORDER BY created_at DESC',
      [projectId]
    );
  },

  /** Verify a raw token — returns the matching token record or null */
  async verify(rawToken: string): Promise<ProjectAccessToken | null> {
    const tokenHash = hashToken(rawToken);
    return queryOne<ProjectAccessToken>(
      'SELECT * FROM project_access_tokens WHERE token_hash = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())',
      [tokenHash]
    );
  },

  /** Touch last_used_at timestamp */
  async touchLastUsed(id: string): Promise<void> {
    await queryOne(
      'UPDATE project_access_tokens SET last_used_at = NOW() WHERE id = $1',
      [id]
    );
  },

  /** Revoke a token */
  async revoke(id: string): Promise<ProjectAccessToken | null> {
    return queryOne<ProjectAccessToken>(
      'UPDATE project_access_tokens SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL RETURNING *',
      [id]
    );
  },

  /** Hash utility exposed for middleware use */
  hashToken,
};

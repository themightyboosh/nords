/**
 * shareLinks.ts — Repository for share link CRUD and validation.
 */

import { query, queryOne } from '../db.js';
import crypto from 'crypto';

export interface ShareLink {
  id: string;
  project_id: string;
  label: string;
  token: string;
  welcome_message_override: string | null;
  model: string;
  persona_id_override: string | null;
  max_sessions: number | null;
  expires_at: Date | null;
  created_by: string | null;
  created_at: Date;
  revoked_at: Date | null;
}

export interface ShareLinkPrefill {
  id: string;
  share_link_id: string;
  nord_id: string;
  property_name: string;
  property_value: string;
}

/** Generate a random share token: nrd_<24 hex chars> */
function generateToken(): string {
  return `nrd_${crypto.randomBytes(12).toString('hex')}`;
}

export async function create(
  projectId: string,
  data: {
    label: string;
    welcome_message_override?: string | null;
    model?: string;
    persona_id_override?: string | null;
    max_sessions?: number | null;
    expires_at?: string | null;
    created_by?: string | null;
    prefills?: Array<{ nord_id: string; property_name: string; property_value: string }>;
  }
): Promise<ShareLink & { prefills: ShareLinkPrefill[] }> {
  const token = generateToken();

  const link = await queryOne<ShareLink>(`
    INSERT INTO share_links (project_id, label, token, welcome_message_override, model, persona_id_override, max_sessions, expires_at, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9)
    RETURNING *
  `, [
    projectId,
    data.label,
    token,
    data.welcome_message_override || null,
    data.model || 'gemini-2.5-flash',
    data.persona_id_override || null,
    data.max_sessions || null,
    data.expires_at || null,
    data.created_by || null,
  ]);

  if (!link) throw new Error('Failed to create share link');

  // Insert prefills
  const prefills: ShareLinkPrefill[] = [];
  if (data.prefills?.length) {
    for (const p of data.prefills) {
      const pf = await queryOne<ShareLinkPrefill>(`
        INSERT INTO share_link_prefills (share_link_id, nord_id, property_name, property_value)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [link.id, p.nord_id, p.property_name, p.property_value]);
      if (pf) prefills.push(pf);
    }
  }

  return { ...link, prefills };
}

export async function findByProject(projectId: string): Promise<(ShareLink & { session_count: number })[]> {
  return query(`
    SELECT sl.*,
      (SELECT count(*) FROM mcp_sessions WHERE share_link_id = sl.id)::int AS session_count
    FROM share_links sl
    WHERE sl.project_id = $1 AND sl.revoked_at IS NULL
    ORDER BY sl.created_at DESC
  `, [projectId]);
}

export async function findByToken(token: string): Promise<(ShareLink & { prefills: ShareLinkPrefill[] }) | null> {
  const link = await queryOne<ShareLink>(`
    SELECT * FROM share_links
    WHERE token = $1
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
  `, [token]);

  if (!link) return null;

  const prefills = await query<ShareLinkPrefill>(
    'SELECT * FROM share_link_prefills WHERE share_link_id = $1',
    [link.id]
  );

  return { ...link, prefills };
}

export async function findById(id: string): Promise<ShareLink | null> {
  return queryOne('SELECT * FROM share_links WHERE id = $1', [id]);
}

export async function revoke(id: string): Promise<ShareLink | null> {
  return queryOne(
    'UPDATE share_links SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL RETURNING *',
    [id]
  );
}

export async function getSessionCount(linkId: string): Promise<number> {
  const row = await queryOne<{ count: string }>(
    'SELECT count(*)::int as count FROM mcp_sessions WHERE share_link_id = $1',
    [linkId]
  );
  return parseInt(row?.count || '0', 10);
}

export async function getPrefills(linkId: string): Promise<ShareLinkPrefill[]> {
  return query('SELECT * FROM share_link_prefills WHERE share_link_id = $1', [linkId]);
}

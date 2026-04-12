import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db.js';
import type { Comment } from '../types/entities.js';

export const commentsRouter = Router();

// GET /api/projects/:id/comments — List comments, optionally filtered
commentsRouter.get('/projects/:id/comments', async (req: Request, res: Response) => {
  try {
    const { target_type, target_id } = req.query;
    let sql = `SELECT * FROM comments WHERE project_id = $1 AND deleted_at IS NULL`;
    const params: unknown[] = [req.params.id];

    if (target_type && target_id) {
      sql += ` AND target_type = $2 AND target_id = $3`;
      params.push(target_type, target_id);
    } else if (target_type === 'general') {
      sql += ` AND target_type = 'general'`;
    }

    sql += ' ORDER BY created_at ASC';

    const comments = await query<Comment>(sql, params);
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load comments' });
  }
});

// POST /api/projects/:id/comments — Create comment or reply
commentsRouter.post('/projects/:id/comments', async (req: Request, res: Response) => {
  try {
    const { target_type, target_id, parent_comment_id, body, author_id } = req.body;
    if (!body) {
      res.status(400).json({ error: 'body is required' });
      return;
    }
    const comment = await queryOne<Comment>(`
      INSERT INTO comments (project_id, target_type, target_id, parent_comment_id, author_id, body)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.params.id, target_type || 'general', target_id || null, parent_comment_id || null, author_id || null, body]);
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// PUT /api/comments/:id — Update or resolve comment
commentsRouter.put('/comments/:id', async (req: Request, res: Response) => {
  try {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (req.body.body !== undefined) {
      setClauses.push(`body = $${idx++}`);
      values.push(req.body.body);
    }
    if (req.body.resolved !== undefined) {
      setClauses.push(`resolved = $${idx++}`);
      values.push(req.body.resolved);
    }

    if (setClauses.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(req.params.id);
    const comment = await queryOne<Comment>(
      `UPDATE comments SET ${setClauses.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`,
      values
    );

    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// DELETE /api/comments/:id — Soft-delete comment
commentsRouter.delete('/comments/:id', async (req: Request, res: Response) => {
  try {
    const result = await queryOne<{ id: string }>(
      'UPDATE comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING id',
      [req.params.id]
    );
    if (!result) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db.js';
import logger from '../lib/logger.js';
import type { Comment } from '../types/entities.js';

export const commentsRouter = Router();

/**
 * @openapi
 * /api/projects/{id}/comments:
 *   get:
 *     tags: [Comments]
 *     summary: List comments for a project
 *     description: Returns comments optionally filtered by target type and target ID. Comments are sorted chronologically ascending for thread rendering.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *       - in: query
 *         name: target_type
 *         schema:
 *           type: string
 *           enum: [nord, connection, general]
 *         description: Filter by target type
 *       - in: query
 *         name: target_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific target entity
 *     responses:
 *       200:
 *         description: Array of comments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 */
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
  } catch (err: any) {
    logger.error('Failed to load comments', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to load comments' });
  }
});

/**
 * @openapi
 * /api/projects/{id}/comments:
 *   post:
 *     tags: [Comments]
 *     summary: Create a comment or reply
 *     description: |
 *       Creates a comment on a nord, connection, or at the project level (general).
 *       Set `parent_comment_id` to create a threaded reply to an existing comment.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCommentRequest'
 *     responses:
 *       201:
 *         description: Comment created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Missing body
 */
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
  } catch (err: any) {
    logger.error('Failed to create comment', { error: err.message, projectId: req.params.id });
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

/**
 * @openapi
 * /api/comments/{id}:
 *   put:
 *     tags: [Comments]
 *     summary: Update or resolve a comment
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
 *               body:
 *                 type: string
 *               resolved:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated comment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       404:
 *         description: Comment not found
 */
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
  } catch (err: any) {
    logger.error('Failed to update comment', { error: err.message, commentId: req.params.id });
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

/**
 * @openapi
 * /api/comments/{id}:
 *   delete:
 *     tags: [Comments]
 *     summary: Soft-delete a comment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Comment deleted
 *       404:
 *         description: Comment not found
 */
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
  } catch (err: any) {
    logger.error('Failed to delete comment', { error: err.message, commentId: req.params.id });
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

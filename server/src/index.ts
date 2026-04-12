import express from 'express';
import cors from 'cors';
import logger from './lib/logger.js';
import { projectsRouter } from './routes/projects.js';
import { graphRouter } from './routes/graph.js';
import { snapshotsRouter } from './routes/snapshots.js';
import { commentsRouter } from './routes/comments.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ── Middleware ──
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

// ── Health Check ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'nords-api', timestamp: new Date().toISOString() });
});

// ── API Routes ──
app.use('/api', projectsRouter);
app.use('/api', graphRouter);
app.use('/api', snapshotsRouter);
app.use('/api', commentsRouter);

// ── Global Error Handler ──
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──
app.listen(PORT, () => {
  logger.info(`Nords API listening on port ${PORT}`);
});

export default app;

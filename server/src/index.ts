import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import logger from './lib/logger.js';
import { initFirebaseAdmin } from './lib/firebaseAdmin.js';
import { requireAuth } from './middleware/auth.js';
import { requestLogger } from './middleware/requestLogger.js';
import { resolveAccount, meteringMiddleware } from './middleware/metering.js';
import { swaggerSpec } from './swagger.js';
import { projectsRouter } from './routes/projects.js';
import { graphRouter } from './routes/graph.js';
import { snapshotsRouter } from './routes/snapshots.js';
import { commentsRouter } from './routes/comments.js';
import { seedRouter } from './routes/seed.js';
import { typesRouter } from './routes/types.js';
import { logsRouter } from './routes/logs.js';
import { personasRouter } from './routes/personas.js';
import { accountsRouter } from './routes/accounts.js';
import { mcpSessionsRouter } from './routes/mcpSessions.js';
import { accessTokensRouter } from './routes/accessTokens.js';
import { chatRouter } from './routes/chat.js';
import { goalsRouter } from './routes/goals.js';
import { testRunnerRouter } from './routes/testRunner.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ── Firebase Admin SDK ──
initFirebaseAdmin();

// ── Middleware ──
const corsOrigin = process.env.CORS_ORIGIN || [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://localhost:5179',
  'http://localhost:5180',
];
if (!process.env.CORS_ORIGIN && process.env.NODE_ENV !== 'development') {
  logger.warn('CORS_ORIGIN not set — falling back to localhost origins. Set CORS_ORIGIN in production.', { NODE_ENV: process.env.NODE_ENV });
}
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(requestLogger);

// ── Swagger UI ──
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Nords API Documentation',
}));

// ── Raw OpenAPI JSON spec ──
app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

// ── Health Check ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'nords-api', timestamp: new Date().toISOString() });
});

// ── API Routes (protected by Firebase auth) ──
app.use('/api', requireAuth);
app.use('/api', resolveAccount);
app.use('/api', meteringMiddleware);
app.use('/api', projectsRouter);
app.use('/api', graphRouter);
app.use('/api', snapshotsRouter);
app.use('/api', commentsRouter);
app.use('/api', seedRouter); // Dev only — bulk data seeding
app.use('/api', typesRouter);
app.use('/api', logsRouter);
app.use('/api', personasRouter);
app.use('/api', accountsRouter);
app.use('/api', mcpSessionsRouter);
app.use('/api', accessTokensRouter);
app.use('/api', chatRouter);
app.use('/api', goalsRouter);
app.use('/api', testRunnerRouter);

// ── Global Error Handler ──
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──
app.listen(PORT, () => {
  logger.info(`Nords API listening on port ${PORT}`);
  logger.info(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});

export default app;

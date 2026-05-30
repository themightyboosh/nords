/**
 * requireAuth — Express middleware that verifies Firebase ID tokens.
 *
 * Behavior:
 *   - Extracts Bearer token from Authorization header
 *   - Verifies with Firebase Admin SDK
 *   - Attaches decoded token to `req.user` (uid, email, etc.)
 *   - Returns 401 if token is missing or invalid
 *
 * Passthrough mode:
 *   - If Firebase Admin is not initialized (no config), the middleware
 *     logs a warning and allows the request through. This enables local
 *     development without Firebase credentials.
 *   - In passthrough mode, req.user is set to a dev placeholder.
 */

import { Request, Response, NextFunction } from 'express';
import { getFirebaseAuth, isFirebaseInitialized } from '../lib/firebaseAdmin.js';
import logger from '../lib/logger.js';

// Extend Express Request to include firebase user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        name?: string;
        picture?: string;
        email_verified?: boolean;
      };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // ── Dev bypass (SKIP_AUTH=true) — used for demo recording ──
  if (process.env.SKIP_AUTH === 'true') {
    const devUserId = req.headers['x-user-id'] as string;
    req.user = {
      uid: devUserId || 'dev-user-000',
      email: 'dev@nords.local',
      name: 'Dev User',
      email_verified: true,
    };
    return next();
  }

  // ── Passthrough mode (no Firebase config) ──
  if (!isFirebaseInitialized()) {
    // In dev without Firebase, use x-user-id header or a placeholder
    const devUserId = req.headers['x-user-id'] as string;
    req.user = {
      uid: devUserId || 'dev-user-000',
      email: 'dev@nords.local',
      name: 'Dev User',
      email_verified: true,
    };
    return next();
  }

  // ── Token verification ──
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  if (!token) {
    res.status(401).json({ error: 'Empty token' });
    return;
  }

  try {
    const auth = getFirebaseAuth()!;
    const decoded = await auth.verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      email_verified: decoded.email_verified,
    };
    next();
  } catch (err: any) {
    const errorCode = err.code || 'unknown';
    if (errorCode === 'auth/id-token-expired') {
      res.status(401).json({ error: 'Token expired' });
    } else if (errorCode === 'auth/id-token-revoked') {
      res.status(401).json({ error: 'Token revoked' });
    } else {
      logger.warn('Auth token verification failed', { error: errorCode });
      res.status(401).json({ error: 'Invalid token' });
    }
  }
}

/**
 * optionalAuth — Same as requireAuth but doesn't reject unauthenticated requests.
 * Sets req.user if token is present and valid, otherwise leaves it undefined.
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!isFirebaseInitialized()) {
    const devUserId = req.headers['x-user-id'] as string;
    if (devUserId) {
      req.user = { uid: devUserId, email: 'dev@nords.local', email_verified: true };
    }
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);
  if (!token) {
    return next();
  }

  try {
    const auth = getFirebaseAuth()!;
    const decoded = await auth.verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
      email_verified: decoded.email_verified,
    };
  } catch {
    // Token invalid — continue without auth
  }

  next();
}

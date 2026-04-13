/**
 * Firebase Admin SDK initialization.
 *
 * In production: uses GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON env var.
 * In development: if FIREBASE_PROJECT_ID is set, initializes with projectId only
 *                 (verifyIdToken will work if the Firebase project matches the client).
 *                 If no Firebase config is present, auth middleware runs in passthrough mode.
 */

import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import logger from './logger.js';

let firebaseApp: App | null = null;
let firebaseAuth: Auth | null = null;

export function initFirebaseAdmin(): void {
  if (getApps().length > 0) {
    firebaseApp = getApps()[0];
    firebaseAuth = getAuth(firebaseApp);
    return;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  try {
    if (serviceAccountJson) {
      // Production: full service account credentials
      const serviceAccount = JSON.parse(serviceAccountJson);
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      logger.info('Firebase Admin initialized with service account');
    } else if (projectId) {
      // Development: project ID only (uses Application Default Credentials)
      firebaseApp = initializeApp({ projectId });
      logger.info('Firebase Admin initialized with project ID', { projectId });
    } else {
      // No Firebase config: auth middleware will run in passthrough mode
      logger.warn('No Firebase config found. Auth middleware will run in PASSTHROUGH mode.');
      return;
    }

    firebaseAuth = getAuth(firebaseApp);
  } catch (err) {
    logger.error('Failed to initialize Firebase Admin', { error: String(err) });
  }
}

export function getFirebaseAuth(): Auth | null {
  return firebaseAuth;
}

export function isFirebaseInitialized(): boolean {
  return firebaseAuth !== null;
}

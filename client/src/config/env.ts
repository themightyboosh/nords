/**
 * Application environment configuration
 * 
 * Uses graceful fallbacks for Firebase config so the spatial engine
 * can render even when Firebase env vars are absent (local dev without auth).
 */
import logger from '../lib/logger';

function requireEnv(key: string, fallback?: string): string {
  const value = import.meta.env[key];
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) {
      logger.warn(`Environment variable missing: ${key}, using fallback`, { key });
      return fallback;
    }
    const error = new Error(`Environment variable missing: ${key}`);
    logger.error('Required environment variable missing', { key });
    throw error;
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return import.meta.env[key] || fallback;
}

export const config = {
  firebase: {
    apiKey: optionalEnv('VITE_FIREBASE_API_KEY', 'demo-api-key'),
    authDomain: optionalEnv('VITE_FIREBASE_AUTH_DOMAIN', 'demo.firebaseapp.com'),
    projectId: optionalEnv('VITE_FIREBASE_PROJECT_ID', 'demo-project'),
    storageBucket: optionalEnv('VITE_FIREBASE_STORAGE_BUCKET', 'demo.appspot.com'),
    messagingSenderId: optionalEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '000000000000'),
    appId: optionalEnv('VITE_FIREBASE_APP_ID', '1:000:web:000'),
  },
  api: {
    url: optionalEnv('VITE_API_URL', 'http://localhost:3000'),
    wsUrl: optionalEnv('VITE_WS_URL', 'ws://localhost:3000'),
  },
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};

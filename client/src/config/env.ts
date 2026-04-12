/**
 * Application environment configuration
 */

function requireEnv(key: string): string {
  const value = import.meta.env[key];
  if (value === undefined || value === null) {
    throw new Error(`Environment variable missing: ${key}`);
  }
  return value;
}

export const config = {
  firebase: {
    apiKey: requireEnv('VITE_FIREBASE_API_KEY'),
    authDomain: requireEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: requireEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: requireEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: requireEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: requireEnv('VITE_FIREBASE_APP_ID'),
  },
  api: {
    url: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:3000',
  },
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};

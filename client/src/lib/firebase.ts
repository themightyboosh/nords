import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  connectAuthEmulator, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { config } from '../config/env';
import logger from './logger';

const firebaseApp = initializeApp(config.firebase);
export const auth = getAuth(firebaseApp);

// Setup local emulator if we are in dev/test
if (config.isDev && import.meta.env.VITE_USE_EMULATORS === 'true') {
  logger.info('Connecting to Firebase Auth Emulator');
  connectAuthEmulator(auth, `http://${import.meta.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'}`);
}

const googleProvider = new GoogleAuthProvider();

export const signInGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    logger.info('Google sign-in successful', { uid: result.user.uid });
    return result;
  } catch (err) {
    logger.error('Google sign-in failed', err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
};

export const signInEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    logger.info('Email sign-in successful', { uid: result.user.uid });
    return result;
  } catch (err) {
    logger.error('Email sign-in failed', err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
};

export const signUpEmail = async (email: string, pass: string, displayName: string) => {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName });
    logger.info('Email sign-up successful', { uid: cred.user.uid, displayName });
    return cred;
  } catch (err) {
    logger.error('Email sign-up failed', err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    logger.info('User signed out');
  } catch (err) {
    logger.error('Sign-out failed', err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
};

export const sendVerification = async () => {
  if (auth.currentUser) {
    try {
      await sendEmailVerification(auth.currentUser);
      logger.info('Verification email sent', { uid: auth.currentUser.uid });
    } catch (err) {
      logger.error('Verification email failed', err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  } else {
    const error = new Error('No current user');
    logger.error('sendVerification called without user', error);
    throw error;
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    logger.info('Password reset email sent', { email });
  } catch (err) {
    logger.error('Password reset failed', err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
};

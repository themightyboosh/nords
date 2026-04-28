import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signOut } from '../lib/firebase';
import { config } from '../config/env';
import logger from '../lib/logger';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Dev bypass: set VITE_SKIP_AUTH=true in .env.local to skip auth entirely
  const isDevBypass = import.meta.env.DEV && import.meta.env.VITE_SKIP_AUTH === 'true';

  useEffect(() => {
    if (isDevBypass) {
      // Create a minimal fake user for dev mode
      setUser({ uid: 'dev-user', email: 'dev@nords.local', displayName: 'Dev User', emailVerified: true } as unknown as User);
      setLoading(false);
      logger.info('Auth dev bypass: auto-authenticated as dev-user');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        logger.info('Auth state changed: signed in', { uid: currentUser.uid });
      } else {
        logger.info('Auth state changed: signed out');
      }
    }, (error) => {
      logger.error('Auth state listener error', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [isDevBypass]);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isEmailVerified: user?.emailVerified || false, // Note: Google sign-ins auto-verify
    logout: signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    const error = new Error('useAuth must be used within an AuthProvider');
    logger.error('Context violation: useAuth outside AuthProvider', error);
    throw error;
  }
  return context;
}

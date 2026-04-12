import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signOut } from '../lib/firebase';
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

  useEffect(() => {
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
  }, []);

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

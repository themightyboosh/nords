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
  isAdmin: boolean;
  role: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  // Dev bypass: set VITE_SKIP_AUTH=true in .env.local to skip auth entirely
  const isDevBypass = import.meta.env.DEV && import.meta.env.VITE_SKIP_AUTH === 'true';

  useEffect(() => {
    if (isDevBypass) {
      // Create a minimal fake user for dev mode
      setUser({ uid: 'dev-user', email: 'dev@nords.local', displayName: 'Dev User', emailVerified: true } as unknown as User);
      setRole('admin');
      setLoading(false);
      logger.info('Auth dev bypass: auto-authenticated as dev-user');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        logger.info('Auth state changed: signed in', { uid: currentUser.uid });
        // Fetch role from server
        try {
          const token = await currentUser.getIdToken();
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          const res = await fetch(`${apiUrl}/api/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setRole(data.role || 'member');
          } else {
            setRole('member');
          }
        } catch {
          setRole('member');
        }
      } else {
        logger.info('Auth state changed: signed out');
        setRole(null);
      }
      setLoading(false);
    }, (error) => {
      logger.error('Auth state listener error', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [isDevBypass]);

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    isEmailVerified: user?.emailVerified || false,
    isAdmin: role === 'admin',
    role,
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

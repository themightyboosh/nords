import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AuthLoading } from './AuthLoading';
import { config } from '../../config/env';
import logger from '../../lib/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerification?: boolean;
}

export function ProtectedRoute({ children, requireVerification = true }: ProtectedRouteProps) {
  const { isAuthenticated, isEmailVerified, loading } = useAuth();
  const location = useLocation();

  // Dev bypass: skip auth entirely with env flag or when Firebase isn't configured
  if (config.isDev && (import.meta.env.VITE_SKIP_AUTH === 'true' || config.firebase.apiKey === 'demo-api-key')) {
    logger.warn('Auth bypassed: dev mode (VITE_SKIP_AUTH or demo-api-key)');
    return <>{children}</>;
  }

  if (loading) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    logger.info('Redirecting to login', { from: location.pathname });
    // Redirect unauthenticated users to login page, but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireVerification && !isEmailVerified && !config.skipEmailVerification) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
}

import React from 'react';
import logger from '../lib/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global Error Boundary — catches any unhandled React rendering error
 * and logs it through the structured logger before showing a fallback UI.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('React Error Boundary caught error', {
      errorMessage: error.message,
      stack: error.stack,
      componentStack: info.componentStack || 'unknown',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0f1117',
          color: '#e5e7eb',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '2rem',
        }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#f87171' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#9ca3af', maxWidth: '480px', textAlign: 'center', lineHeight: 1.6 }}>
            The spatial engine encountered an unexpected error. 
            This has been logged automatically.
          </p>
          <code style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: '#1a1d27',
            borderRadius: '6px',
            fontSize: '0.8rem',
            color: '#f87171',
            maxWidth: '600px',
            overflow: 'auto',
          }}>
            {this.state.error?.message}
          </code>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem',
              padding: '0.6rem 1.5rem',
              background: '#4da6ff',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthProvider } from '../../context/AuthContext';
import * as AuthContextModule from '../../context/AuthContext';
import { vi } from 'vitest';

// Mock the Auth hook since Firebase is heavy
vi.mock('../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthContextModule>();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

const mockUseAuth = vi.mocked(AuthContextModule.useAuth);

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRouter = (ui: React.ReactNode, initialEntry = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/verify-email" element={<div>Verify Email Page</div>} />
          <Route path="/" element={ui} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders loading fallback when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      isAuthenticated: false,
      isEmailVerified: false,
      logout: vi.fn(),
    });

    const { container } = renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    // Loading spinner should be present
    expect(container.querySelector('.auth-spinner')).toBeInTheDocument();
  });

  it('redirects to /login when unauthenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      isEmailVerified: false,
      logout: vi.fn(),
    });

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to /verify-email when authenticated but not verified', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'test@example.com' } as any,
      loading: false,
      isAuthenticated: true,
      isEmailVerified: false,
      logout: vi.fn(),
    });

    renderWithRouter(
      <ProtectedRoute requireVerification={true}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Verify Email Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated and verified', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'test@example.com' } as any,
      loading: false,
      isAuthenticated: true,
      isEmailVerified: true,
      logout: vi.fn(),
    });

    renderWithRouter(
      <ProtectedRoute requireVerification={true}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Verify Email Page')).not.toBeInTheDocument();
  });
});

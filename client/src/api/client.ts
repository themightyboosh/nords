/**
 * Nords API Client
 *
 * Thin fetch wrapper that automatically injects the Firebase auth
 * token into every request. All frontend hooks use this client
 * instead of calling fetch() directly.
 */

import { auth } from '../lib/firebase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Single-user mode: skip Firebase token injection entirely
  if (import.meta.env.VITE_SKIP_AUTH === 'true') {
    return headers;
  }

  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // Silently continue without auth header if token fetch fails
    }
  }

  return headers;
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, ...fetchOptions } = options;
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers: {
      ...headers,
      ...fetchOptions.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(errorBody.error || response.statusText, response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ── Convenience Methods ──

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),

  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body }),

  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body }),

  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
};

export { ApiError };

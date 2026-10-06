import { supabase } from './supabase';
import { ApiResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Standard fetch wrapper that forwards the current authenticated Supabase session JWT
 * in the Authorization header to the Flask REST API.
 * Includes a lightweight retry for transient network drops or server restarts.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 1
): Promise<ApiResponse<T>> {
  const session = (await supabase.auth.getSession()).data.session;
  const token = session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json();

    // If server returned a 500 internal error on a GET request and we have retries left, retry once
    if (!res.ok && res.status >= 500 && retryCount > 0 && (!options.method || options.method === 'GET')) {
      await new Promise((r) => setTimeout(r, 250));
      return apiClient<T>(endpoint, options, retryCount - 1);
    }

    return data as ApiResponse<T>;
  } catch (error) {
    if (retryCount > 0 && (!options.method || options.method === 'GET')) {
      await new Promise((r) => setTimeout(r, 250));
      return apiClient<T>(endpoint, options, retryCount - 1);
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
      },
    };
  }
}

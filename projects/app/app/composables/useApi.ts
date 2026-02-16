/**
 * API client composable for making requests to the SquadScript server API.
 *
 * Wraps $fetch with:
 * - Base URL configuration (from runtime config)
 * - JWT token injection from auth state
 * - Automatic error handling (401 → redirect to login)
 * - Type-safe request/response generics
 */

interface ApiOptions {
  /** Override the auth token (otherwise pulled from session/cookie). */
  token?: string;
  /** Skip redirect on 401 errors. */
  skipAuthRedirect?: boolean;
}

/**
 * Composable that provides type-safe API methods for the SquadScript server.
 */
export function useApi(options: ApiOptions = {}) {
  const baseUrl = '/api/proxy';

  /**
   * Internal fetch wrapper with auth and error handling.
   */
  async function apiFetch<T>(
    path: string,
    fetchOptions: Parameters<typeof $fetch>[1] = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(fetchOptions.headers as Record<string, string> ?? {}),
    };

    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    try {
      return await $fetch<T>(`${baseUrl}${path}`, {
        ...fetchOptions,
        headers,
      });
    } catch (error: unknown) {
      // Handle 401 by redirecting to login
      if (
        !options.skipAuthRedirect &&
        error instanceof Error &&
        'statusCode' in error &&
        (error as Error & { statusCode: number }).statusCode === 401
      ) {
        await navigateTo('/login');
      }
      throw error;
    }
  }

  return {
    /**
     * GET request.
     */
    get<T>(path: string, query?: Record<string, string | number | undefined>) {
      return apiFetch<T>(path, { method: 'GET', query });
    },

    /**
     * POST request.
     */
    post<T>(path: string, body?: unknown) {
      return apiFetch<T>(path, { method: 'POST', body });
    },

    /**
     * PUT request.
     */
    put<T>(path: string, body?: unknown) {
      return apiFetch<T>(path, { method: 'PUT', body });
    },

    /**
     * PATCH request.
     */
    patch<T>(path: string, body?: unknown) {
      return apiFetch<T>(path, { method: 'PATCH', body });
    },

    /**
     * DELETE request.
     */
    delete<T>(path: string) {
      return apiFetch<T>(path, { method: 'DELETE' });
    },

    /**
     * Raw fetch with full control.
     */
    fetch: apiFetch,
  };
}

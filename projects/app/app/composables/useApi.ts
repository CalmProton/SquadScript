/**
 * API client composable for making requests to the SquadScript server API.
 *
 * Wraps $fetch with:
 * - Base URL configuration (proxied through Nuxt server)
 * - Automatic error handling (401 → redirect to login)
 * - Type-safe request/response generics
 *
 * Note: The JWT token is injected server-side by the proxy route
 * from the secure session. Client-side requests go through /api/proxy/.
 */

interface ApiOptions {
  /** Skip redirect on 401 errors. */
  skipAuthRedirect?: boolean;
}

/**
 * Composable that provides type-safe API methods for the SquadScript server.
 */
export function useApi(options: ApiOptions = {}) {
  const baseUrl = '/api/proxy';

  /**
   * Internal fetch wrapper with error handling.
   */
  async function apiFetch<T>(
    path: string,
    fetchOptions: Parameters<typeof $fetch>[1] = {},
  ): Promise<T> {
    try {
      return await $fetch<T>(`${baseUrl}${path}`, {
        ...fetchOptions,
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
    post<T>(path: string, body?: Record<string, any> | null) {
      return apiFetch<T>(path, { method: 'POST', body });
    },

    /**
     * PUT request.
     */
    put<T>(path: string, body?: Record<string, any> | null) {
      return apiFetch<T>(path, { method: 'PUT', body });
    },

    /**
     * PATCH request.
     */
    patch<T>(path: string, body?: Record<string, any> | null) {
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

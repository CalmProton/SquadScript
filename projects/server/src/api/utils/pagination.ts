/**
 * @squadscript/server
 *
 * Shared pagination helpers for API endpoints.
 *
 * @module
 */

/**
 * Parse pagination query parameters with defaults.
 */
export function parsePagination(query: {
  limit?: string | number;
  offset?: string | number;
}): { limit: number; offset: number } {
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
  const offset = Math.max(Number(query.offset) || 0, 0);
  return { limit, offset };
}

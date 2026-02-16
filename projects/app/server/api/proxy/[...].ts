/**
 * Catch-all proxy: /api/proxy/** → SquadScript server API /**
 *
 * Proxies all requests from the Nuxt app to the SquadScript server API.
 * This avoids CORS issues and keeps the SquadScript API URL server-side only.
 *
 * The Authorization header is forwarded as-is from the client request.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const apiUrl = config.squadscriptApiUrl || 'http://127.0.0.1:3001';

  // Get the proxied path (everything after /api/proxy/)
  const path = event.path.replace(/^\/api\/proxy/, '');

  // Build the target URL
  const targetUrl = `${apiUrl}/api${path}`;

  // Forward the request
  try {
    const response = await proxyRequest(event, targetUrl);
    return response;
  } catch (error) {
    // If the upstream is unreachable, return a 502 Bad Gateway
    if (error instanceof Error && ('code' in error || error.message.includes('fetch'))) {
      throw createError({
        statusCode: 502,
        statusMessage: 'SquadScript API unavailable',
      });
    }
    throw error;
  }
});

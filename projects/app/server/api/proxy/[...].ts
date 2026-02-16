/**
 * Catch-all proxy: /api/proxy/** → SquadScript server API /**
 *
 * Proxies all requests from the Nuxt app to the SquadScript server API.
 * Injects the JWT token from the secure session into the Authorization header.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const apiUrl = config.squadscriptApiUrl || 'http://127.0.0.1:3001';

  // Get the proxied path (everything after /api/proxy/)
  const path = event.path.replace(/^\/api\/proxy/, '');

  // Build the target URL
  const targetUrl = `${apiUrl}/api${path}`;

  // Inject JWT token from secure session
  const session = await getUserSession(event);
  const apiToken = session.secure?.apiToken;

  if (apiToken) {
    // Set the Authorization header for the upstream request
    event.node.req.headers.authorization = `Bearer ${apiToken}`;
  }

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

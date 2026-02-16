/**
 * Returns the API token from the secure session.
 * Used by the client to connect to WebSocket and display user info.
 */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session.user || !session.secure?.apiToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Not authenticated',
    });
  }

  return {
    token: session.secure.apiToken,
    expiresAt: session.secure.apiTokenExpiresAt ?? null,
    user: session.user,
  };
});

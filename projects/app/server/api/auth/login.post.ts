export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { username, password } = body;

  const config = useRuntimeConfig();
  const apiUrl = config.squadscriptApiUrl || 'http://127.0.0.1:3001';

  try {
    // Forward credentials to the SquadScript server API
    const response = await $fetch<{
      token: string;
      expiresAt: string;
      user: { id: string; username: string; role: string };
    }>(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      body: { username, password },
    });

    // Store JWT token in secure session data (not accessible from client)
    await setUserSession(event, {
      user: {
        id: response.user.id,
        username: response.user.username,
        role: response.user.role as 'admin' | 'moderator' | 'viewer',
      },
      secure: {
        apiToken: response.token,
        apiTokenExpiresAt: response.expiresAt,
      },
    });

    // Return token and user info to the client for Pinia store
    return {
      success: true,
      token: response.token,
      expiresAt: response.expiresAt,
      user: response.user,
    };
  } catch (error: unknown) {
    const statusCode =
      error instanceof Error && 'statusCode' in error
        ? (error as Error & { statusCode: number }).statusCode
        : 401;

    throw createError({
      statusCode: statusCode === 401 ? 401 : 502,
      statusMessage:
        statusCode === 401
          ? 'Invalid credentials'
          : 'Unable to reach authentication server',
    });
  }
});

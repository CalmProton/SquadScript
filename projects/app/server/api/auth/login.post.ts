export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { username, password } = body;

  // Simple password-based auth - in production, use proper hash comparison
  // These credentials should be configured via environment variables
  const config = useRuntimeConfig();
  const validUsername = config.adminUsername || 'admin';
  const validPassword = config.adminPassword || 'admin';

  if (username === validUsername && password === validPassword) {
    await setUserSession(event, {
      user: {
        id: '1',
        username,
        role: 'admin',
      },
    });
    return { success: true };
  }

  throw createError({
    statusCode: 401,
    statusMessage: 'Invalid credentials',
  });
});

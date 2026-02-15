export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, fetch } = useUserSession();

  // Allow access to login page
  if (to.path === '/login') {
    return;
  }

  if (!loggedIn.value) {
    await fetch();
  }

  // Redirect to login if not authenticated
  if (!loggedIn.value) {
    return navigateTo('/login');
  }
});

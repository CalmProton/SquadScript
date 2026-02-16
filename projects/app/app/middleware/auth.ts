import { useAuthStore } from '~/stores/auth';

export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, fetch } = useUserSession();
  const authStore = useAuthStore();

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

  // Restore JWT token from server session if Pinia state was lost (page reload)
  if (!authStore.isAuthenticated) {
    await authStore.restoreSession();
  }
});

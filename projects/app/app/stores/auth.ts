import { defineStore } from 'pinia';
import type { AuthTokenResponse, DashboardUserDTO } from '@squadscript/types/api';

/**
 * Authentication store.
 * Manages JWT token and current user session.
 */
export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null);
  const user = ref<DashboardUserDTO | null>(null);
  const expiresAt = ref<string | null>(null);
  const initialized = ref(false);

  const isAuthenticated = computed(() => token.value !== null);

  function setAuth(response: AuthTokenResponse) {
    token.value = response.token;
    user.value = response.user;
    expiresAt.value = response.expiresAt;
    initialized.value = true;
  }

  function clearAuth() {
    token.value = null;
    user.value = null;
    expiresAt.value = null;
  }

  /**
   * Restores the JWT token from the server session on page reload.
   * This is needed because Pinia state is lost on refresh.
   */
  async function restoreSession(): Promise<boolean> {
    if (token.value) return true;

    try {
      const data = await $fetch<{
        token: string;
        expiresAt: string | null;
        user: DashboardUserDTO;
      }>('/api/auth/session');

      token.value = data.token;
      user.value = data.user;
      expiresAt.value = data.expiresAt;
      initialized.value = true;
      return true;
    } catch {
      initialized.value = true;
      return false;
    }
  }

  return {
    token,
    user,
    expiresAt,
    isAuthenticated,
    initialized,
    setAuth,
    clearAuth,
    restoreSession,
  };
});

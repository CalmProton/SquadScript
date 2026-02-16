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

  const isAuthenticated = computed(() => token.value !== null);

  function setAuth(response: AuthTokenResponse) {
    token.value = response.token;
    user.value = response.user;
    expiresAt.value = response.expiresAt;
  }

  function clearAuth() {
    token.value = null;
    user.value = null;
    expiresAt.value = null;
  }

  return {
    token,
    user,
    expiresAt,
    isAuthenticated,
    setAuth,
    clearAuth,
  };
});

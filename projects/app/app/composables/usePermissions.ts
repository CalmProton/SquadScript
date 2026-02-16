import { useAuthStore } from '~/stores/auth';

/**
 * Role-based permission checks for the dashboard UI.
 * Uses the authenticated user's role from the auth store.
 */
export function usePermissions() {
  const authStore = useAuthStore();

  const role = computed(() => authStore.user?.role ?? 'viewer');

  const isAdmin = computed(() => role.value === 'admin');
  const isModerator = computed(() => role.value === 'moderator' || role.value === 'admin');
  const isViewer = computed(() => true); // all authenticated users are at least viewers

  /**
   * Check if the current user has at least the given role level.
   * Role hierarchy: admin > moderator > viewer
   */
  function hasRole(requiredRole: string): boolean {
    const hierarchy: Record<string, number> = {
      admin: 3,
      moderator: 2,
      viewer: 1,
    };
    const userLevel = hierarchy[role.value] ?? 0;
    const requiredLevel = hierarchy[requiredRole] ?? 0;
    return userLevel >= requiredLevel;
  }

  /** Can manage players (warn, kick, ban) */
  const canManagePlayers = computed(() => hasRole('moderator'));

  /** Can manage plugins (enable/disable, configure) */
  const canManagePlugins = computed(() => hasRole('admin'));

  /** Can access RCON console */
  const canAccessRcon = computed(() => hasRole('moderator'));

  /** Can manage users (CRUD) */
  const canManageUsers = computed(() => hasRole('admin'));

  /** Can edit server configuration */
  const canEditConfig = computed(() => hasRole('admin'));

  return {
    role,
    isAdmin,
    isModerator,
    isViewer,
    hasRole,
    canManagePlayers,
    canManagePlugins,
    canAccessRcon,
    canManageUsers,
    canEditConfig,
  };
}

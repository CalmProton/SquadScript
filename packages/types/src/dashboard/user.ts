/**
 * @squadscript/types
 *
 * Dashboard user types.
 *
 * @module
 */

/**
 * Dashboard user role.
 */
export type DashboardRole = 'admin' | 'moderator' | 'viewer';

/**
 * Dashboard user (server-side representation).
 */
export interface DashboardUser {
  readonly id: string;
  readonly username: string;
  readonly password: string;
  readonly role: DashboardRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

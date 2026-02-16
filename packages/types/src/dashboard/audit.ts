/**
 * @squadscript/types
 *
 * Audit log entry types.
 *
 * @module
 */

/**
 * Audit actions tracked by the system.
 */
export type AuditAction =
  | 'login'
  | 'logout'
  | 'kick'
  | 'ban'
  | 'warn'
  | 'broadcast'
  | 'rcon_command'
  | 'config_change'
  | 'plugin_toggle'
  | 'plugin_configure'
  | 'user_create'
  | 'user_update'
  | 'user_delete'
  | 'role_update'
  | 'map_change'
  | 'squad_disband'
  | string;

/**
 * Audit log entry.
 */
export interface AuditLogEntry {
  readonly id: number;
  readonly userId: string | null;
  readonly action: AuditAction;
  readonly target: string | null;
  readonly details: Record<string, unknown> | null;
  readonly createdAt: Date;
}

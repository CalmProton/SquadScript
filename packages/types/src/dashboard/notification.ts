/**
 * @squadscript/types
 *
 * Notification types.
 *
 * @module
 */

/**
 * Notification severity level.
 */
export type NotificationSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Notification type identifiers.
 */
export type NotificationType =
  | 'server_down'
  | 'server_up'
  | 'plugin_error'
  | 'player_report'
  | 'high_ping'
  | 'server_full'
  | 'rcon_disconnect'
  | string;

/**
 * Notification record.
 */
export interface Notification {
  readonly id: number;
  readonly type: NotificationType;
  readonly severity: NotificationSeverity;
  readonly title: string;
  readonly message: string | null;
  readonly read: boolean;
  readonly createdAt: Date;
}

/**
 * @squadscript/types
 *
 * Base event interface and event type constants.
 *
 * @module
 */

/**
 * Event type constants.
 *
 * Using const object instead of enum for better tree-shaking
 * and compatibility with the `as const` pattern.
 */
export const EventType = {
  // Player lifecycle events
  PLAYER_CONNECTED: 'PLAYER_CONNECTED',
  PLAYER_DISCONNECTED: 'PLAYER_DISCONNECTED',
  PLAYER_JOIN_SUCCEEDED: 'PLAYER_JOIN_SUCCEEDED',
  PLAYER_POSSESS: 'PLAYER_POSSESS',
  PLAYER_UNPOSSESS: 'PLAYER_UNPOSSESS',

  // Combat events
  PLAYER_DAMAGED: 'PLAYER_DAMAGED',
  PLAYER_WOUNDED: 'PLAYER_WOUNDED',
  PLAYER_DIED: 'PLAYER_DIED',
  PLAYER_REVIVED: 'PLAYER_REVIVED',

  // Chat events
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  CHAT_COMMAND: 'CHAT_COMMAND',

  // Game events
  NEW_GAME: 'NEW_GAME',
  ROUND_ENDED: 'ROUND_ENDED',
  ROUND_TICKETS: 'ROUND_TICKETS',
  ROUND_WINNER: 'ROUND_WINNER',
  SERVER_TICK_RATE: 'SERVER_TICK_RATE',

  // Squad events
  SQUAD_CREATED: 'SQUAD_CREATED',

  // Admin events
  ADMIN_BROADCAST: 'ADMIN_BROADCAST',
  ADMIN_CAMERA: 'ADMIN_CAMERA',
  PLAYER_KICKED: 'PLAYER_KICKED',
  PLAYER_WARNED: 'PLAYER_WARNED',
  PLAYER_BANNED: 'PLAYER_BANNED',

  // Deployable events
  DEPLOYABLE_DAMAGED: 'DEPLOYABLE_DAMAGED',

  // RCON events
  RCON_CONNECTED: 'RCON_CONNECTED',
  RCON_DISCONNECTED: 'RCON_DISCONNECTED',
  RCON_ERROR: 'RCON_ERROR',
} as const;

/**
 * Union type of all event type values.
 */
export type EventType = (typeof EventType)[keyof typeof EventType];

/**
 * Base interface that all events must extend.
 *
 * All event data objects are readonly to prevent mutation
 * of event data by plugins, which can cause issues when
 * multiple plugins handle the same event.
 */
export interface BaseEvent {
  /**
   * Timestamp when the event occurred.
   * For log-parsed events, this is extracted from the log line.
   * For RCON events, this is when the message was received.
   */
  readonly time: Date;

  /**
   * The raw log line or packet that generated this event.
   * Useful for debugging and advanced parsing.
   */
  readonly raw: string;
}

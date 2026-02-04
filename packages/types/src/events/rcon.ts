/**
 * @squadscript/types
 *
 * RCON-specific event types.
 *
 * @module
 */

import type { BaseEvent } from './base.js';

/**
 * Emitted when RCON connection is established.
 */
export interface RconConnectedEvent extends BaseEvent {
  /** The RCON host. */
  readonly host: string;

  /** The RCON port. */
  readonly port: number;

  /** Whether this was a reconnection. */
  readonly reconnect: boolean;
}

/**
 * Emitted when RCON connection is lost.
 */
export interface RconDisconnectedEvent extends BaseEvent {
  /** The reason for disconnection. */
  readonly reason: string;

  /** Whether a reconnection will be attempted. */
  readonly willReconnect: boolean;
}

/**
 * Emitted when an RCON error occurs.
 */
export interface RconErrorEvent extends BaseEvent {
  /** The error that occurred. */
  readonly error: Error;

  /** The command that caused the error (if applicable). */
  readonly command: string | null;

  /** Whether this is a fatal error. */
  readonly fatal: boolean;
}

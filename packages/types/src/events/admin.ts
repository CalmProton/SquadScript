/**
 * @squadscript/types
 *
 * Admin event types (broadcasts, kicks, bans, camera, etc.).
 *
 * @module
 */

import type { BaseEvent } from './base.js';
import type { Player, PartialPlayer } from '../player.js';
import type { EOSID, SteamID } from '../branded.js';

/**
 * Emitted when an admin broadcast is sent.
 */
export interface AdminBroadcastEvent extends BaseEvent {
  /** The broadcast message. */
  readonly message: string;

  /** Duration in seconds the message is displayed. */
  readonly duration: number | null;
}

/**
 * Emitted when an admin enters or exits admin camera mode.
 */
export interface AdminCameraEvent extends BaseEvent {
  /** The admin player. */
  readonly player: Player;

  /** Whether the admin is entering (true) or exiting (false) admin cam. */
  readonly entering: boolean;
}

/**
 * Emitted when a player is kicked from the server.
 */
export interface PlayerKickedEvent extends BaseEvent {
  /** The player who was kicked. */
  readonly player: Player | PartialPlayer;

  /** The kick reason. */
  readonly reason: string;

  /** The admin who performed the kick (if known). */
  readonly admin: Player | null;
}

/**
 * Emitted when a player is warned.
 */
export interface PlayerWarnedEvent extends BaseEvent {
  /** The player who was warned. */
  readonly player: Player;

  /** The warning message. */
  readonly message: string;

  /** The admin who issued the warning (if known). */
  readonly admin: Player | null;
}

/**
 * Emitted when a player is banned.
 */
export interface PlayerBannedEvent extends BaseEvent {
  /** The banned player's Steam ID (if available). */
  readonly steamID: SteamID | null;

  /** The banned player's EOS ID. */
  readonly eosID: EOSID | null;

  /** The banned player's name at time of ban. */
  readonly name: string;

  /** The ban reason. */
  readonly reason: string;

  /** Ban duration in seconds (0 = permanent). */
  readonly duration: number;

  /** The admin who issued the ban (if known). */
  readonly admin: Player | null;
}

/**
 * Emitted when a squad is created.
 */
export interface SquadCreatedEvent extends BaseEvent {
  /** The player who created the squad. */
  readonly player: Player;

  /** The squad name. */
  readonly squadName: string;

  /** The squad ID. */
  readonly squadID: number;

  /** The team the squad was created on. */
  readonly teamID: number;
}

/**
 * @squadscript/types
 *
 * Player lifecycle event types.
 *
 * @module
 */

import type { BaseEvent } from './base.js';
import type { Player, PartialPlayer } from '../player.js';
import type { EOSID, SteamID, PlayerController } from '../branded.js';

/**
 * Emitted when a player connects to the server.
 *
 * At this point, the player may not be fully spawned in-game.
 * Use PLAYER_JOIN_SUCCEEDED for when the player is fully loaded.
 */
export interface PlayerConnectedEvent extends BaseEvent {
  /** The connected player information. */
  readonly player: PartialPlayer;

  /** The player's IP address. */
  readonly ip: string;
}

/**
 * Emitted when a player disconnects from the server.
 */
export interface PlayerDisconnectedEvent extends BaseEvent {
  /** The disconnected player (may be partial if disconnect was abrupt). */
  readonly player: Player | PartialPlayer;
}

/**
 * Emitted when a player has fully joined and loaded into the game.
 */
export interface PlayerJoinSucceededEvent extends BaseEvent {
  /** The player that joined. */
  readonly player: PartialPlayer;

  /** The player's Steam ID. */
  readonly steamID: SteamID;

  /** The player's EOS ID. */
  readonly eosID: EOSID;
}

/**
 * Emitted when a player possesses a pawn (e.g., spawns, enters vehicle).
 */
export interface PlayerPossessEvent extends BaseEvent {
  /** The player who possessed the pawn. */
  readonly player: Player;

  /** The possessing controller ID. */
  readonly controller: PlayerController;

  /** The pawn class that was possessed. */
  readonly pawnClass: string;

  /** Whether this is a valid pawn (not admin cam, etc.). */
  readonly isValidPawn: boolean;
}

/**
 * Emitted when a player unpossesses a pawn (e.g., exits vehicle, dies).
 */
export interface PlayerUnpossessEvent extends BaseEvent {
  /** The player who unpossessed. */
  readonly player: Player;

  /** The controller ID that unpossessed. */
  readonly controller: PlayerController;

  /** The time the player was in the previous pawn (if known). */
  readonly possessTimeMs: number | null;
}

/**
 * @squadscript/types
 *
 * Player domain types.
 *
 * @module
 */

import type {
  SteamID,
  EOSID,
  PlayerID,
  TeamID,
  SquadID,
  PlayerController,
} from './branded.js';

/**
 * Represents a fully-identified player on the server.
 *
 * All properties are readonly to prevent mutation of player state
 * outside of the proper update mechanisms.
 */
export interface Player {
  /** In-game player ID assigned by the server (0-100). */
  readonly playerID: PlayerID;

  /** 17-digit Steam ID. May be null for console players. */
  readonly steamID: SteamID | null;

  /** 32-character Epic Online Services ID. Primary identifier. */
  readonly eosID: EOSID;

  /** Player's display name. */
  readonly name: string;

  /** The team the player is on (1 or 2). Null if unassigned. */
  readonly teamID: TeamID | null;

  /** The squad the player is in. Null if not in a squad. */
  readonly squadID: SquadID | null;

  /** Whether the player is a squad leader. */
  readonly isSquadLeader: boolean;

  /** The player's current role/kit. */
  readonly role: string | null;

  /** Player controller identifier from game logs. */
  readonly controller: PlayerController | null;

  /** Name suffix from logs (e.g., clan tags). */
  readonly suffix: string | null;
}

/**
 * Partial player information when full data isn't available.
 *
 * Used in events where we only have limited player identification
 * (e.g., from log parsing before the player is fully tracked).
 */
export interface PartialPlayer {
  /** Epic Online Services ID - always required. */
  readonly eosID: EOSID;

  /** Steam ID if available. */
  readonly steamID?: SteamID | undefined;

  /** Player name if known. */
  readonly name?: string | undefined;

  /** Player controller if known. */
  readonly controller?: PlayerController | undefined;
}

/**
 * Identifies a player by any supported ID type.
 * Used for lookups and commands that accept multiple ID formats.
 */
export type AnyPlayerID = SteamID | EOSID | PlayerID;

/**
 * Player connection information from RCON.
 */
export interface PlayerConnection {
  /** The player's current IP address. */
  readonly ip: string;

  /** Time connected in seconds. */
  readonly connectedTime: number;

  /** Current ping in milliseconds. */
  readonly ping: number;
}

/**
 * Extended player info combining Player with connection data.
 */
export interface PlayerWithConnection extends Player {
  /** Connection information. */
  readonly connection: PlayerConnection;
}

/**
 * Creates an empty/default Player object.
 * Useful for initializing state before data is loaded.
 */
export function createEmptyPlayer(eosID: EOSID, name: string): Player {
  return {
    playerID: 0 as PlayerID,
    steamID: null,
    eosID,
    name,
    teamID: null,
    squadID: null,
    isSquadLeader: false,
    role: null,
    controller: null,
    suffix: null,
  };
}

/**
 * Creates a partial player from minimal information.
 */
export function createPartialPlayer(
  eosID: EOSID,
  options?: {
    steamID?: SteamID;
    name?: string;
    controller?: PlayerController;
  },
): PartialPlayer {
  return {
    eosID,
    steamID: options?.steamID,
    name: options?.name,
    controller: options?.controller,
  };
}

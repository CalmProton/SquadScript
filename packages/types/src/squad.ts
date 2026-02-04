/**
 * @squadscript/types
 *
 * Squad domain types.
 *
 * @module
 */

import type { SquadID, TeamID, EOSID, SteamID } from './branded.js';

/**
 * Represents a squad on the server.
 */
export interface Squad {
  /** Squad number within the team. */
  readonly squadID: SquadID;

  /** The team this squad belongs to. */
  readonly teamID: TeamID;

  /** Squad name as displayed in-game. */
  readonly name: string;

  /** Number of players currently in the squad. */
  readonly size: number;

  /** Whether the squad is locked (invite-only). */
  readonly locked: boolean;

  /** Display name of the squad creator. */
  readonly creatorName: string;

  /** EOS ID of the squad creator. */
  readonly creatorEOSID: EOSID;

  /** Steam ID of the squad creator (if available). */
  readonly creatorSteamID: SteamID | null;
}

/**
 * Information about a squad for RCON responses.
 */
export interface RconSquadInfo {
  /** Squad ID number. */
  squadID: number;

  /** Team ID (1 or 2). */
  teamID: number;

  /** Squad name. */
  squadName: string;

  /** Current squad size. */
  size: number;

  /** Whether squad is locked. */
  locked: boolean;

  /** Creator's display name. */
  creatorName: string;

  /** Creator's Steam ID (raw string). */
  creatorSteamID: string | null;

  /** Creator's EOS ID (raw string). */
  creatorEOSID: string;
}

/**
 * Creates an empty squad object.
 */
export function createSquad(
  squadID: SquadID,
  teamID: TeamID,
  name: string,
  creatorEOSID: EOSID,
  creatorName: string,
): Squad {
  return {
    squadID,
    teamID,
    name,
    size: 1,
    locked: false,
    creatorName,
    creatorEOSID,
    creatorSteamID: null,
  };
}

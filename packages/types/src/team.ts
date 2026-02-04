/**
 * @squadscript/types
 *
 * Team domain types.
 *
 * @module
 */

import type { TeamID } from './branded.js';

/**
 * Represents a team on the server.
 */
export interface Team {
  /** Team ID (1 or 2). */
  readonly teamID: TeamID;

  /** Team display name (e.g., faction name). */
  readonly name: string;

  /** Current ticket count. */
  readonly tickets: number;

  /** Faction identifier. */
  readonly faction: string | null;
}

/**
 * Team-specific constants.
 */
export const TEAM_ONE = 1 as TeamID;
export const TEAM_TWO = 2 as TeamID;

/**
 * Creates a team object.
 */
export function createTeam(
  teamID: TeamID,
  name: string,
  faction: string | null = null,
): Team {
  return {
    teamID,
    name,
    tickets: 0,
    faction,
  };
}

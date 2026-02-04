/**
 * @squadscript/rcon
 *
 * Response parsers for RCON query commands.
 *
 * Parses the text output of commands like ListPlayers, ListSquads,
 * ShowCurrentMap, etc. into strongly-typed data structures.
 *
 * @module
 */

import { type Result, Ok, Err } from '@squadscript/types';
import {
  type SteamID,
  type EOSID,
  type TeamID,
  type SquadID,
  asSteamID,
  asEOSID,
  asPlayerID,
  asTeamID,
  asSquadID,
} from '@squadscript/types';
import type { PlayerInfo, SquadInfo, MapInfo } from '../types.js';
import { ParseError } from '../errors.js';

// =============================================================================
// Pre-compiled Regex Patterns
// =============================================================================

/**
 * Pre-compiled patterns for response parsing.
 */
const Patterns = {
  /**
   * ListPlayers entry pattern.
   * Example: ID: 1 | Online IDs:EOS: abc123 steam: 76561198012345678 | Name: PlayerName | Team ID: 1 | Squad ID: 2 | Is Leader: True | Role: Infantry
   */
  PLAYER_LINE:
    /^ID: (\d+) \| Online IDs:([^|]+)\| Name: (.+) \| Team ID: (\d+|N\/A) \| Squad ID: (\d+|N\/A) \| Is Leader: (True|False) \| Role: (.+)$/,

  /**
   * ListSquads team header pattern.
   * Example: Team ID: 1 (US Army)
   */
  SQUAD_TEAM_HEADER: /^Team ID: (\d) \((.+)\)$/,

  /**
   * ListSquads squad entry pattern.
   * Example: ID: 1 | Name: Infantry | Size: 9 | Locked: False | Creator Name: PlayerName | Creator Online IDs:EOS: abc123 steam: 76561198012345678
   */
  SQUAD_LINE:
    /^ID: (\d+) \| Name: (.+) \| Size: (\d+) \| Locked: (True|False) \| Creator Name: (.+) \| Creator Online IDs:([^|]+)$/,

  /**
   * ShowCurrentMap response pattern.
   * Example: Current level is Narva, layer is Narva_RAAS_v1
   */
  CURRENT_MAP: /^Current level is ([^,]+), layer is (.+)$/,

  /**
   * ShowNextMap response pattern.
   * Example: Next level is Narva, layer is Narva_RAAS_v1
   * Note: Layer can be "To be voted" when not set, or empty
   */
  NEXT_MAP: /^Next level is ([^,]*), layer is\s*(.*)$/,
} as const;

// =============================================================================
// ID Parsing Helpers
// =============================================================================

/**
 * Parsed online IDs from RCON.
 */
interface ParsedIDs {
  steamID: SteamID | null;
  eosID: EOSID;
}

/**
 * Parses online IDs from the format: "EOS: abc123 steam: 76561198012345678"
 */
function parseOnlineIDs(idsString: string): ParsedIDs {
  let steamID: SteamID | null = null;
  let eosID: EOSID = '' as EOSID;

  const normalized = idsString.trim();

  // Match Steam ID (17 digits)
  const steamMatch = normalized.match(/steam:\s*(\d{17})/i);
  if (steamMatch && steamMatch[1]) {
    steamID = asSteamID(steamMatch[1]);
  }

  // Match EOS ID (32 hex characters)
  const eosMatch = normalized.match(/EOS:\s*([0-9a-f]{32})/i);
  if (eosMatch && eosMatch[1]) {
    const parsed = asEOSID(eosMatch[1]);
    if (parsed) {
      eosID = parsed;
    }
  }

  return { steamID, eosID };
}

// =============================================================================
// ListPlayers Parser
// =============================================================================

/**
 * Parses the response from ListPlayers command.
 *
 * @param response - The raw command response
 * @returns Array of player info objects
 *
 * @example
 * ```typescript
 * const result = parseListPlayers(response);
 * if (result.ok) {
 *   for (const player of result.value) {
 *     console.log(`${player.name} - ${player.role}`);
 *   }
 * }
 * ```
 */
export function parseListPlayers(
  response: string,
): Result<PlayerInfo[], ParseError> {
  const players: PlayerInfo[] = [];

  // Handle empty response
  if (!response || response.trim().length === 0) {
    return Ok(players);
  }

  const lines = response.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(Patterns.PLAYER_LINE);
    if (!match) continue;

    const [
      ,
      playerIDStr,
      idsString,
      name,
      teamIDStr,
      squadIDStr,
      isLeaderStr,
      role,
    ] = match;

    // Validate required fields
    if (!playerIDStr || !idsString || !name || !role) continue;

    // Parse player ID
    const playerID = asPlayerID(parseInt(playerIDStr, 10));
    if (!playerID) continue;

    // Parse online IDs
    const { steamID, eosID } = parseOnlineIDs(idsString);

    // Parse team ID (can be N/A)
    let teamID: TeamID | null = null;
    if (teamIDStr && teamIDStr !== 'N/A') {
      const parsedTeamID = parseInt(teamIDStr, 10);
      if (parsedTeamID === 1 || parsedTeamID === 2) {
        teamID = asTeamID(parsedTeamID);
      }
    }

    // Parse squad ID (can be N/A)
    let squadID: SquadID | null = null;
    if (squadIDStr && squadIDStr !== 'N/A') {
      squadID = asSquadID(parseInt(squadIDStr, 10));
    }

    // Parse is leader
    const isLeader = isLeaderStr === 'True';

    players.push({
      playerID,
      steamID,
      eosID,
      name: name.trim(),
      teamID,
      squadID,
      isLeader,
      role: role.trim(),
    });
  }

  return Ok(players);
}

// =============================================================================
// ListSquads Parser
// =============================================================================

/**
 * Parses the response from ListSquads command.
 *
 * @param response - The raw command response
 * @returns Array of squad info objects
 *
 * @example
 * ```typescript
 * const result = parseListSquads(response);
 * if (result.ok) {
 *   for (const squad of result.value) {
 *     console.log(`Squad ${squad.squadID}: ${squad.name} (${squad.size} members)`);
 *   }
 * }
 * ```
 */
export function parseListSquads(
  response: string,
): Result<SquadInfo[], ParseError> {
  const squads: SquadInfo[] = [];

  // Handle empty response
  if (!response || response.trim().length === 0) {
    return Ok(squads);
  }

  const lines = response.split('\n');

  // Track current team context
  let currentTeamID: TeamID | null = null;
  let currentTeamName = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for team header
    const teamMatch = trimmed.match(Patterns.SQUAD_TEAM_HEADER);
    if (teamMatch) {
      const [, teamIDStr, teamName] = teamMatch;
      if (teamIDStr && teamName) {
        const parsedTeamID = parseInt(teamIDStr, 10);
        if (parsedTeamID === 1 || parsedTeamID === 2) {
          currentTeamID = asTeamID(parsedTeamID);
          currentTeamName = teamName;
        }
      }
      continue;
    }

    // Check for squad entry
    const squadMatch = trimmed.match(Patterns.SQUAD_LINE);
    if (squadMatch && currentTeamID) {
      const [
        ,
        squadIDStr,
        name,
        sizeStr,
        lockedStr,
        creatorName,
        creatorIDs,
      ] = squadMatch;

      // Validate required fields
      if (!squadIDStr || !name || !sizeStr || !creatorName || !creatorIDs) continue;

      // Parse squad ID
      const squadID = asSquadID(parseInt(squadIDStr, 10));
      if (!squadID) continue;

      // Parse creator IDs
      const { steamID: creatorSteamID, eosID: creatorEOSID } =
        parseOnlineIDs(creatorIDs);

      squads.push({
        squadID,
        teamID: currentTeamID,
        name: name.trim(),
        size: parseInt(sizeStr, 10),
        locked: lockedStr === 'True',
        creatorName: creatorName.trim(),
        creatorSteamID,
        creatorEOSID,
        teamName: currentTeamName,
      });
    }
  }

  return Ok(squads);
}

// =============================================================================
// Map Info Parsers
// =============================================================================

/**
 * Parses the response from ShowCurrentMap command.
 *
 * @param response - The raw command response
 * @returns Map info with level and layer
 *
 * @example
 * ```typescript
 * const result = parseCurrentMap(response);
 * if (result.ok) {
 *   console.log(`Current: ${result.value.level} - ${result.value.layer}`);
 * }
 * ```
 */
export function parseCurrentMap(
  response: string,
): Result<MapInfo, ParseError> {
  const trimmed = response.trim();

  const match = trimmed.match(Patterns.CURRENT_MAP);
  if (!match) {
    return Err(
      ParseError.unexpectedFormat(
        'ShowCurrentMap',
        '"Current level is <level>, layer is <layer>"',
        response,
      ),
    );
  }

  const [, level, layer] = match;

  return Ok({
    level: level?.trim() || null,
    layer: layer?.trim() || null,
  });
}

/**
 * Parses the response from ShowNextMap command.
 *
 * @param response - The raw command response
 * @returns Map info with level and layer (can be null if not set)
 *
 * @example
 * ```typescript
 * const result = parseNextMap(response);
 * if (result.ok) {
 *   if (result.value.layer) {
 *     console.log(`Next: ${result.value.layer}`);
 *   } else {
 *     console.log('Next map not set');
 *   }
 * }
 * ```
 */
export function parseNextMap(response: string): Result<MapInfo, ParseError> {
  const trimmed = response.trim();

  const match = trimmed.match(Patterns.NEXT_MAP);
  if (!match) {
    return Err(
      ParseError.unexpectedFormat(
        'ShowNextMap',
        '"Next level is <level>, layer is <layer>"',
        response,
      ),
    );
  }

  const [, level, layer] = match;

  // Handle empty or "To be voted" values
  const parsedLevel = level && level.trim() !== '' ? level.trim() : null;
  const parsedLayer =
    layer && layer.trim() !== '' && layer.trim() !== 'To be voted'
      ? layer.trim()
      : null;

  return Ok({
    level: parsedLevel,
    layer: parsedLayer,
  });
}

/**
 * @squadscript/log-parser
 *
 * Rule: Player Unpossess
 *
 * Matches when a player unpossesses a pawn (exits vehicle, dies, etc.).
 *
 * Log format:
 * [timestamp][chainID]LogSquadTrace: [DedicatedServer]ASQPlayerController::OnUnPossess(): PC=PlayerName (Online IDs:...)
 *
 * @module
 */

import type { PlayerUnpossessEvent, Player, PlayerController } from '@squadscript/types';
import { asPlayerController, asPlayerID } from '@squadscript/types';
import { defineRule, createLogRegex } from './base.js';
import { parseOnlineIDs, hasInvalidIDs } from '../utils/id-parser.js';
import { parseLogTimestamp, parseChainID } from '../utils/date-parser.js';

/**
 * Rule for PLAYER_UNPOSSESS events.
 */
export const playerUnpossessRule = defineRule<PlayerUnpossessEvent>({
  name: 'player-unpossess',
  eventName: 'PLAYER_UNPOSSESS',

  regex: createLogRegex(
    String.raw`LogSquadTrace: \[DedicatedServer\](?:ASQPlayerController::)?OnUnPossess\(\): PC=(.+) \(Online IDs:([^)]+)\)`,
  ),

  parse(match, context) {
    const [raw, timestamp, chainIDStr, playerSuffix, idsString] = match;

    // Ensure required groups matched
    if (!timestamp || !chainIDStr || !playerSuffix || !idsString) {
      context.logger.warn('player-unpossess', 'Missing required fields in player unpossess event');
      return null;
    }

    // Bail on invalid IDs
    if (hasInvalidIDs(idsString)) {
      context.logger.verbose('player-unpossess', 'Skipping player unpossess with invalid IDs');
      return null;
    }

    const time = parseLogTimestamp(timestamp);
    if (!time) {
      context.logger.warn('player-unpossess', 'Failed to parse timestamp in player unpossess event');
      return null;
    }

    // Parse chainID for future use if needed
    parseChainID(chainIDStr);
    const ids = parseOnlineIDs(idsString);

    if (!ids.eosID) {
      context.logger.warn('player-unpossess', 'Player unpossess without EOS ID');
      return null;
    }

    // Get stored player data
    const storedPlayer = context.store.getPlayer(ids.eosID);

    // Determine controller - prefer stored, fall back to parsed
    const controllerValue = storedPlayer?.controller
      ? (storedPlayer.controller as PlayerController)
      : asPlayerController(playerSuffix);

    // Build player object
    const player: Player = {
      playerID: asPlayerID(0)!, // Will be resolved by SquadServer
      eosID: ids.eosID,
      steamID: storedPlayer?.steamID ?? ids.steamID,
      name: storedPlayer?.name ?? playerSuffix ?? 'Unknown',
      teamID: null,
      squadID: null,
      isSquadLeader: false,
      role: null,
      controller: controllerValue,
      suffix: playerSuffix ?? null,
    };

    // Calculate possess time if we have session data
    // (This would require storing possess time which SquadJS doesn't do well)
    const possessTimeMs: number | null = null;

    return Object.freeze({
      time,
      raw,
      player,
      controller: controllerValue!,
      possessTimeMs,
    });
  },
});

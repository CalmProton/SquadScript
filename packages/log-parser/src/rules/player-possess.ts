/**
 * @squadscript/log-parser
 *
 * Rule: Player Possess
 *
 * Matches when a player possesses a pawn (spawns, enters vehicle, etc.).
 *
 * Log format:
 * [timestamp][chainID]LogSquadTrace: [DedicatedServer]ASQPlayerController::OnPossess(): PC=PlayerName (Online IDs:...) Pawn=PawnClass_C
 *
 * @module
 */

import type { PlayerPossessEvent, Player, PlayerController } from '@squadscript/types';
import { asPlayerController, asPlayerID } from '@squadscript/types';
import { defineRule, createLogRegex } from './base.js';
import { parseOnlineIDs, hasInvalidIDs } from '../utils/id-parser.js';
import { parseLogTimestamp } from '../utils/date-parser.js';

// Pawns that are not valid player spawns (admin cam, etc.)
const INVALID_PAWNS = [
  'intCamera',
  'intCameraAdminCamera',
  'intCameraCommanderCamera',
  'intCameraFreeCamera',
];

/**
 * Rule for PLAYER_POSSESS events.
 */
export const playerPossessRule = defineRule<PlayerPossessEvent>({
  name: 'player-possess',
  eventName: 'PLAYER_POSSESS',

  regex: createLogRegex(
    String.raw`LogSquadTrace: \[DedicatedServer\](?:ASQPlayerController::)?OnPossess\(\): PC=(.+) \(Online IDs:([^)]+)\) Pawn=([A-Za-z0-9_]+)_C`,
  ),

  parse(match, context) {
    const [raw, timestamp, , playerSuffix, idsString, pawnClass] = match;

    // Bail on invalid IDs
    if (hasInvalidIDs(idsString)) {
      context.logger.verbose('player-possess', 'Skipping player possess with invalid IDs');
      return null;
    }

    const time = parseLogTimestamp(timestamp);
    if (!time) {
      context.logger.warn('player-possess', 'Failed to parse timestamp in player possess event');
      return null;
    }

    const ids = parseOnlineIDs(idsString);
    if (!ids.eosID) {
      context.logger.warn('player-possess', 'Player possess without EOS ID');
      return null;
    }

    const isValidPawn = !INVALID_PAWNS.some((p) =>
      pawnClass.toLowerCase().includes(p.toLowerCase()),
    );

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
      name: storedPlayer?.name ?? playerSuffix,
      teamID: null,
      squadID: null,
      isSquadLeader: false,
      role: null,
      controller: controllerValue,
      suffix: playerSuffix,
    };

    return Object.freeze({
      time,
      raw,
      player,
      controller: controllerValue!,
      pawnClass,
      isValidPawn,
    });
  },
});

/**
 * @squadscript/log-parser
 *
 * Rule: Player Connected
 *
 * Matches when a player connects to the server.
 * At this point, the player is not yet fully loaded.
 *
 * Log format:
 * [timestamp][chainID]LogSquad: PostLogin: NewPlayer: BP_PlayerController_C ... (IP: x.x.x.x | Online IDs: EOS: xxx steam: xxx)
 *
 * @module
 */

import type { PlayerConnectedEvent, PartialPlayer } from '@squadscript/types';
import { asPlayerController } from '@squadscript/types';
import { defineRule, createLogRegex } from './base.js';
import { parseOnlineIDs, hasInvalidIDs } from '../utils/id-parser.js';
import { parseLogTimestamp, parseChainID } from '../utils/date-parser.js';

/**
 * Rule for PLAYER_CONNECTED events.
 */
export const playerConnectedRule = defineRule<PlayerConnectedEvent>({
  name: 'player-connected',
  eventName: 'PLAYER_CONNECTED',

  regex: createLogRegex(
    String.raw`LogSquad: PostLogin: NewPlayer: (?:BP_)?PlayerController(?:|.+)_C .+PersistentLevel\.([^\s]+) \(IP: ([\d.]+) \| Online IDs:([^)|]+)\)`,
  ),

  parse(match, context) {
    const [raw, timestamp, chainIDStr, controller, ip, idsString] = match;

    // Ensure required groups matched
    if (!timestamp || !chainIDStr || !controller || !ip || !idsString) {
      context.logger.warn('player-connected', 'Missing required fields in player connected event');
      return null;
    }

    // Bail on invalid IDs
    if (hasInvalidIDs(idsString)) {
      context.logger.verbose('player-connected', 'Skipping player connected with invalid IDs');
      return null;
    }

    const time = parseLogTimestamp(timestamp);
    if (!time) {
      context.logger.warn('player-connected', 'Failed to parse timestamp in player connected event');
      return null;
    }

    const chainID = parseChainID(chainIDStr);
    const ids = parseOnlineIDs(idsString);

    if (!ids.eosID) {
      context.logger.warn('player-connected', 'Player connected without EOS ID');
      return null;
    }

    const player: PartialPlayer = {
      eosID: ids.eosID,
      steamID: ids.steamID ?? undefined,
      controller: asPlayerController(controller) ?? undefined,
    };

    // Store join request for correlation with JOIN_SUCCEEDED
    if (chainID) {
      context.store.setJoinRequest(chainID, {
        player: {
          eosID: ids.eosID,
          steamID: ids.steamID ?? undefined,
          controller: asPlayerController(controller) ?? undefined,
        },
        ip,
        chainID,
      });
    }

    // Store/update player data
    context.store.setPlayer(ids.eosID, {
      eosID: ids.eosID,
      steamID: ids.steamID ?? undefined,
      controller: asPlayerController(controller) ?? undefined,
      ip,
    });

    // Clear disconnected flag if reconnecting
    if (context.store.isDisconnected(ids.eosID)) {
      context.store.clearDisconnected(ids.eosID);
    }

    return Object.freeze({
      time,
      raw,
      player,
      ip,
    });
  },
});

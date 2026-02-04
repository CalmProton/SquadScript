/**
 * @squadscript/log-parser
 *
 * Rule: Player Join Succeeded
 *
 * Matches when a player has fully joined and loaded into the game.
 * Correlates with PLAYER_CONNECTED via ChainID.
 *
 * Log format:
 * [timestamp][chainID]LogNet: Join succeeded: PlayerName
 *
 * @module
 */

import type { PlayerJoinSucceededEvent, PlayerController } from '@squadscript/types';
import { defineRule, createLogRegex } from './base.js';
import { parseLogTimestamp, parseChainID } from '../utils/date-parser.js';

/**
 * Rule for PLAYER_JOIN_SUCCEEDED events.
 */
export const playerJoinSucceededRule = defineRule<PlayerJoinSucceededEvent>({
  name: 'player-join-succeeded',
  eventName: 'PLAYER_JOIN_SUCCEEDED',

  regex: createLogRegex(
    String.raw`LogNet: Join succeeded: (.+)`,
  ),

  parse(match, context) {
    const [raw, timestamp, chainIDStr, playerSuffix] = match;

    // Ensure required groups matched
    if (!timestamp || !chainIDStr || !playerSuffix) {
      context.logger.warn('player-join-succeeded', 'Missing required fields in join succeeded event');
      return null;
    }

    const time = parseLogTimestamp(timestamp);
    if (!time) {
      context.logger.warn('player-join-succeeded', 'Failed to parse timestamp in join succeeded event');
      return null;
    }

    const chainID = parseChainID(chainIDStr);
    if (!chainID) {
      context.logger.warn('player-join-succeeded', 'Failed to parse chain ID in join succeeded event');
      return null;
    }

    // Get join request from store
    const joinRequest = context.store.getJoinRequest(chainID);
    if (!joinRequest) {
      context.logger.verbose('player-join-succeeded', `No join request found for chain ID ${chainID}`);
      return null;
    }

    // Remove join request (no longer needed)
    context.store.deleteJoinRequest(chainID);

    // Update player data with suffix
    context.store.updatePlayer(joinRequest.player.eosID, {
      suffix: playerSuffix,
      name: playerSuffix,
    });

    const player = {
      eosID: joinRequest.player.eosID,
      steamID: joinRequest.player.steamID,
      controller: joinRequest.player.controller as PlayerController | undefined,
      name: playerSuffix,
    };

    return Object.freeze({
      time,
      raw,
      player,
      steamID: joinRequest.player.steamID!,
      eosID: joinRequest.player.eosID,
    });
  },
});

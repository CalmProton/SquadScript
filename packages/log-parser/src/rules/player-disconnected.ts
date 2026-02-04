/**
 * @squadscript/log-parser
 *
 * Rule: Player Disconnected
 *
 * Matches when a player disconnects from the server.
 *
 * Log format:
 * [timestamp][chainID]LogNet: UChannel::Close: Sending CloseBunch... RemoteAddr: x.x.x.x ... PC: BP_PlayerController_C_xxx ... UniqueId: RedpointEOS:xxx
 *
 * @module
 */

import type { PlayerDisconnectedEvent, PartialPlayer, PlayerController } from '@squadscript/types';
import { asEOSID } from '@squadscript/types';
import { defineRule, createLogRegex } from './base.js';
import { parseLogTimestamp } from '../utils/date-parser.js';

/**
 * Rule for PLAYER_DISCONNECTED events.
 */
export const playerDisconnectedRule = defineRule<PlayerDisconnectedEvent>({
  name: 'player-disconnected',
  eventName: 'PLAYER_DISCONNECTED',

  regex: createLogRegex(
    String.raw`LogNet: UChannel::Close: Sending CloseBunch\..+RemoteAddr: ([\d.]+).+PC: (\w+PlayerController(?:|.+)_C_\d+),.+UniqueId: RedpointEOS:([0-9a-f]+)`,
  ),

  parse(match, context) {
    const [raw, timestamp, , _ip, _playerController, eosIDStr] = match;

    const time = parseLogTimestamp(timestamp);
    if (!time) {
      context.logger.warn('player-disconnected', 'Failed to parse timestamp in player disconnected event');
      return null;
    }

    const eosID = asEOSID(eosIDStr);
    if (!eosID) {
      context.logger.warn('player-disconnected', 'Invalid EOS ID in player disconnected event');
      return null;
    }

    // Mark player as disconnected (will be removed on map change)
    context.store.markDisconnected(eosID);

    // Get stored player data for the event
    const storedPlayer = context.store.getPlayer(eosID);

    // Build a proper PartialPlayer object
    const player: PartialPlayer = {
      eosID,
      steamID: storedPlayer?.steamID,
      name: storedPlayer?.name,
      controller: (storedPlayer?.controller as PlayerController | undefined),
    };

    return Object.freeze({
      time,
      raw,
      player,
    });
  },
});

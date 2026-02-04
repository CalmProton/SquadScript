/**
 * @squadscript/log-parser
 *
 * Rule: Player Revived
 *
 * Matches when a player is revived by a medic.
 *
 * Log format:
 * [timestamp][chainID]LogSquad: ReviverName (Online IDs:...) has revived VictimName (Online IDs:...).
 *
 * @module
 */

import type { PlayerRevivedEvent, Player, PlayerController } from '@squadscript/types';
import { asPlayerID } from '@squadscript/types';
import { defineRule, createLogRegex } from './base.js';
import { parseOnlineIDs, hasInvalidIDs } from '../utils/id-parser.js';
import { parseLogTimestamp } from '../utils/date-parser.js';

/**
 * Rule for PLAYER_REVIVED events.
 */
export const playerRevivedRule = defineRule<PlayerRevivedEvent>({
  name: 'player-revived',
  eventName: 'PLAYER_REVIVED',

  regex: createLogRegex(
    String.raw`LogSquad: (.+) \(Online IDs:([^)]+)\) has revived (.+) \(Online IDs:([^)]+)\)\.`,
  ),

  parse(match, context) {
    const [raw, timestamp, , reviverName, reviverIdsString, victimName, victimIdsString] = match;

    // Bail on invalid IDs
    if (hasInvalidIDs(reviverIdsString) || hasInvalidIDs(victimIdsString)) {
      context.logger.verbose('player-revived', 'Skipping player revived with invalid IDs');
      return null;
    }

    const time = parseLogTimestamp(timestamp);
    if (!time) {
      context.logger.warn('player-revived', 'Failed to parse timestamp in player revived event');
      return null;
    }

    const reviverIds = parseOnlineIDs(reviverIdsString);
    const victimIds = parseOnlineIDs(victimIdsString);

    if (!reviverIds.eosID || !victimIds.eosID) {
      context.logger.warn('player-revived', 'Player revived without EOS IDs');
      return null;
    }

    // Get stored player data
    const storedReviver = context.store.getPlayer(reviverIds.eosID);
    const storedVictim = context.store.getPlayer(victimIds.eosID);

    // Build reviver player object
    const reviver: Player = {
      playerID: asPlayerID(0)!,
      eosID: reviverIds.eosID,
      steamID: storedReviver?.steamID ?? reviverIds.steamID,
      name: storedReviver?.name ?? reviverName,
      teamID: null,
      squadID: null,
      isSquadLeader: false,
      role: null,
      controller: (storedReviver?.controller as PlayerController | undefined) ?? null,
      suffix: null,
    };

    // Build victim player object
    const victim: Player = {
      playerID: asPlayerID(0)!,
      eosID: victimIds.eosID,
      steamID: storedVictim?.steamID ?? victimIds.steamID,
      name: storedVictim?.name ?? victimName,
      teamID: null,
      squadID: null,
      isSquadLeader: false,
      role: null,
      controller: (storedVictim?.controller as PlayerController | undefined) ?? null,
      suffix: null,
    };

    // Clean up victim's session data
    context.store.deleteSession(victimName);

    return Object.freeze({
      time,
      raw,
      victim,
      reviver,
      reviverController: String(storedReviver?.controller ?? ''),
      victimController: String(storedVictim?.controller ?? ''),
    });
  },
});

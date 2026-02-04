/**
 * @squadscript/log-parser
 *
 * Rule: Player Damaged
 *
 * Matches when a player takes damage.
 *
 * Log format:
 * [timestamp][chainID]LogSquad: Player:VictimName ActualDamage=X.X from AttackerName (Online IDs:...) caused by Weapon_C
 *
 * @module
 */

import type { PlayerDamagedEvent, Player } from '@squadscript/types';
import { asChainID, asPlayerID, asPlayerController } from '@squadscript/types';
import { defineRule, createLogRegex } from './base.js';
import { parseOnlineIDs, hasInvalidIDs } from '../utils/id-parser.js';
import { parseLogTimestamp, parseChainID } from '../utils/date-parser.js';

/**
 * Rule for PLAYER_DAMAGED events.
 */
export const playerDamagedRule = defineRule<PlayerDamagedEvent>({
  name: 'player-damaged',
  eventName: 'PLAYER_DAMAGED',

  regex: createLogRegex(
    String.raw`LogSquad: Player:(.+) ActualDamage=([0-9.]+) from (.+) \(Online IDs:([^|]+)\| Player Controller ID: ([^ ]+)\)caused by ([A-Za-z_0-9-]+)_C`,
  ),

  parse(match, context) {
    const [raw, timestamp, chainIDStr, victimName, damageStr, attackerName, idsString, attackerController, weapon] = match;

    // Bail on invalid IDs
    if (hasInvalidIDs(idsString)) {
      context.logger.verbose('player-damaged', 'Skipping player damaged with invalid IDs');
      return null;
    }

    const time = parseLogTimestamp(timestamp);
    if (!time) {
      context.logger.warn('player-damaged', 'Failed to parse timestamp in player damaged event');
      return null;
    }

    const chainID = parseChainID(chainIDStr);
    const damage = parseFloat(damageStr);
    const ids = parseOnlineIDs(idsString);

    if (!ids.eosID) {
      context.logger.warn('player-damaged', 'Player damaged without attacker EOS ID');
      return null;
    }

    // Update attacker's controller in store
    context.store.updatePlayer(ids.eosID, {
      controller: asPlayerController(attackerController) ?? undefined,
    });

    // Store session data for wound/death correlation
    context.store.setSession(victimName, {
      chainID: chainID ?? asChainID(0)!,
      victimName,
      lastDamage: {
        damage,
        weapon,
        attackerEOSID: ids.eosID,
        attackerSteamID: ids.steamID ?? undefined,
        attackerController,
        attackerName,
      },
    });

    // Get stored attacker data
    const storedAttacker = context.store.getPlayer(ids.eosID);

    // Build attacker player object
    const attacker: Player = {
      playerID: asPlayerID(0)!,
      eosID: ids.eosID,
      steamID: storedAttacker?.steamID ?? ids.steamID,
      name: storedAttacker?.name ?? attackerName,
      teamID: null,
      squadID: null,
      isSquadLeader: false,
      role: null,
      controller: asPlayerController(attackerController),
      suffix: null,
    };

    // Build victim player object (we don't have victim's EOS ID from this log line)
    // The victim will be resolved by SquadServer from player state
    const victim: Player = {
      playerID: asPlayerID(0)!,
      eosID: ids.eosID, // Placeholder - will be resolved
      steamID: null,
      name: victimName,
      teamID: null,
      squadID: null,
      isSquadLeader: false,
      role: null,
      controller: null,
      suffix: null,
    };

    // Determine if teamkill (requires SquadServer context)
    const teamkill = false; // Will be determined by SquadServer

    return Object.freeze({
      time,
      raw,
      chainID: chainID ?? asChainID(0)!,
      attacker,
      victim,
      weapon,
      damage,
      teamkill,
    });
  },
});

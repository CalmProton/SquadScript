/**
 * @squadscript/log-parser
 *
 * Rule: Player Wounded
 *
 * Matches when a player is wounded (downed but not dead).
 *
 * Log format:
 * [timestamp][chainID]LogSquadTrace: [DedicatedServer]ASQSoldier::Wound(): Player:VictimName KillingDamage=X from AttackerController (Online IDs:...) caused by Weapon_C
 *
 * @module
 */

import type { PlayerWoundedEvent, Player } from '@squadscript/types';
import { asChainID, asPlayerID, asPlayerController } from '@squadscript/types';
import { defineRule, createLogRegex } from './base.js';
import { parseOnlineIDs, hasInvalidIDs } from '../utils/id-parser.js';
import { parseLogTimestamp, parseChainID } from '../utils/date-parser.js';

/**
 * Rule for PLAYER_WOUNDED events.
 */
export const playerWoundedRule = defineRule<PlayerWoundedEvent>({
  name: 'player-wounded',
  eventName: 'PLAYER_WOUNDED',

  regex: createLogRegex(
    String.raw`LogSquadTrace: \[DedicatedServer\](?:ASQSoldier::)?Wound\(\): Player:(.+) KillingDamage=(?:-)*([0-9.]+) from ([A-Za-z_0-9]+) \(Online IDs:([^)|]+)\| Controller ID: ([\w\d]+)\) caused by ([A-Za-z_0-9-]+)_C`,
  ),

  parse(match, context) {
    const [raw, timestamp, chainIDStr, victimName, damageStr, _attackerPlayerController, idsString, attackerController, weapon] = match;

    // Bail on invalid IDs
    if (hasInvalidIDs(idsString)) {
      context.logger.verbose('player-wounded', 'Skipping player wounded with invalid IDs');
      return null;
    }

    const time = parseLogTimestamp(timestamp);
    if (!time) {
      context.logger.warn('player-wounded', 'Failed to parse timestamp in player wounded event');
      return null;
    }

    const chainID = parseChainID(chainIDStr);
    const damage = parseFloat(damageStr);
    const ids = parseOnlineIDs(idsString);

    if (!ids.eosID) {
      context.logger.warn('player-wounded', 'Player wounded without attacker EOS ID');
      return null;
    }

    // Get session data from previous damage event
    const session = context.store.getSession(victimName);

    // Update session with wound data
    context.store.updateSession(victimName, {
      lastWound: {
        time,
        damage,
        weapon,
        attackerController,
      },
    });

    // Get stored attacker data
    const storedAttacker = context.store.getPlayer(ids.eosID);

    // Build attacker player object
    const attacker: Player = {
      playerID: asPlayerID(0)!,
      eosID: ids.eosID,
      steamID: storedAttacker?.steamID ?? ids.steamID,
      name: storedAttacker?.name ?? session?.lastDamage?.attackerName ?? 'Unknown',
      teamID: null,
      squadID: null,
      isSquadLeader: false,
      role: null,
      controller: asPlayerController(attackerController),
      suffix: null,
    };

    // Build victim player object
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
      attackerController,
    });
  },
});

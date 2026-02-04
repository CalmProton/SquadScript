/**
 * @squadscript/log-parser
 *
 * Rule: Player Died
 *
 * Matches when a player dies (gives up or bleeds out).
 *
 * Log format:
 * [timestamp][chainID]LogSquadTrace: [DedicatedServer]ASQSoldier::Die(): Player:VictimName KillingDamage=X from AttackerController (Online IDs:...) caused by Weapon_C
 *
 * @module
 */

import type { PlayerDiedEvent, Player } from '@squadscript/types';
import { asChainID, asPlayerID, asPlayerController } from '@squadscript/types';
import { defineRule, createLogRegex } from './base.js';
import { parseOnlineIDs, hasInvalidIDs } from '../utils/id-parser.js';
import { parseLogTimestamp, parseChainID } from '../utils/date-parser.js';

/**
 * Rule for PLAYER_DIED events.
 */
export const playerDiedRule = defineRule<PlayerDiedEvent>({
  name: 'player-died',
  eventName: 'PLAYER_DIED',

  regex: createLogRegex(
    String.raw`LogSquadTrace: \[DedicatedServer\](?:ASQSoldier::)?Die\(\): Player:(.+) KillingDamage=(?:-)*([0-9.]+) from ([A-Za-z_0-9]+) \(Online IDs:([^)|]+)\| Contoller ID: ([\w\d]+)\) caused by ([A-Za-z_0-9-]+)_C`,
  ),

  parse(match, context) {
    const [raw, timestamp, chainIDStr, victimName, damageStr, _attackerPlayerController, idsString, attackerController, weapon] = match;

    // Ensure required groups matched
    if (!timestamp || !chainIDStr || !victimName || !damageStr || !idsString || !attackerController || !weapon) {
      context.logger.warn('player-died', 'Missing required fields in player died event');
      return null;
    }

    // Bail on invalid IDs
    if (hasInvalidIDs(idsString)) {
      context.logger.verbose('player-died', 'Skipping player died with invalid IDs');
      return null;
    }

    const time = parseLogTimestamp(timestamp);
    if (!time) {
      context.logger.warn('player-died', 'Failed to parse timestamp in player died event');
      return null;
    }

    const chainID = parseChainID(chainIDStr);
    const damage = parseFloat(damageStr);
    const ids = parseOnlineIDs(idsString);

    if (!ids.eosID) {
      context.logger.warn('player-died', 'Player died without attacker EOS ID');
      return null;
    }

    // Get session data from previous damage/wound events - use fallback for type safety
    const session = context.store.getSession(victimName ?? '');

    // Clean up session data - use fallback for type safety
    context.store.deleteSession(victimName ?? '');

    // Get stored attacker data
    const storedAttacker = context.store.getPlayer(ids.eosID);

    // Build attacker player object (may be null for suicide)
    const isSuicide = (victimName ?? '') === (storedAttacker?.name ?? session?.lastDamage?.attackerName);

    const attacker: Player | null = isSuicide ? null : {
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
      name: victimName ?? 'Unknown',
      teamID: null,
      squadID: null,
      isSquadLeader: false,
      role: null,
      controller: null,
      suffix: null,
    };

    return Object.freeze({
      time,
      raw,
      chainID: chainID ?? asChainID(0)!,
      attacker,
      victim,
      weapon: weapon ?? null,
      damage,
      suicide: isSuicide,
    });
  },
});

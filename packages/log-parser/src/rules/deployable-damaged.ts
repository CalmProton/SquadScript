/**
 * @squadscript/log-parser
 *
 * Rule: Deployable Damaged
 *
 * Matches when a deployable (FOB, HAB, etc.) takes damage.
 *
 * Log format:
 * [timestamp][chainID]LogSquadTrace: [DedicatedServer]ASQDeployable::TakeDamage(): DeployableClass_C_XXX: Y.Y damage attempt by causer Weapon_C_XXX instigator PlayerName with damage type DamageType_C health remaining Z.Z
 *
 * @module
 */

import type { DeployableDamagedEvent, Player, PlayerController } from '@squadscript/types';
import { asPlayerID } from '@squadscript/types';
import { defineRule, createLogRegex } from './base.js';
import { parseLogTimestamp } from '../utils/date-parser.js';

/**
 * Rule for DEPLOYABLE_DAMAGED events.
 */
export const deployableDamagedRule = defineRule<DeployableDamagedEvent>({
  name: 'deployable-damaged',
  eventName: 'DEPLOYABLE_DAMAGED',

  regex: createLogRegex(
    String.raw`LogSquadTrace: \[DedicatedServer\](?:ASQDeployable::)?TakeDamage\(\): ([A-Za-z0-9_]+)_C_[0-9]+: ([0-9.]+) damage attempt by causer ([A-Za-z0-9_]+)_C_[0-9]+ instigator (.+) with damage type ([A-Za-z0-9_]+)_C health remaining ([0-9.]+)`,
  ),

  parse(match, context) {
    const [raw, timestamp, , deployable, damageStr, weapon, playerSuffix, _damageType, _healthRemaining] = match;

    // Ensure required groups matched
    if (!timestamp || !deployable || !damageStr || !weapon || !playerSuffix) {
      context.logger.warn('deployable-damaged', 'Missing required fields in deployable damaged event');
      return null;
    }

    const time = parseLogTimestamp(timestamp);
    if (!time) {
      context.logger.warn('deployable-damaged', 'Failed to parse timestamp in deployable damaged event');
      return null;
    }

    const damage = parseFloat(damageStr);

    // Try to find attacker by suffix
    let attacker: Player | null = null;

    // Look through stored players to find match
    for (const [eosID, storedPlayer] of context.store.getAllPlayers()) {
      if (storedPlayer.suffix === playerSuffix || storedPlayer.name === playerSuffix) {
        attacker = {
          playerID: asPlayerID(0)!,
          eosID,
          steamID: storedPlayer.steamID ?? null,
          name: storedPlayer.name ?? playerSuffix,
          teamID: null,
          squadID: null,
          isSquadLeader: false,
          role: null,
          controller: (storedPlayer.controller as PlayerController | undefined) ?? null,
          suffix: storedPlayer.suffix ?? null,
        };
        break;
      }
    }

    return Object.freeze({
      time,
      raw,
      deployable,
      weapon,
      damage,
      attacker,
    });
  },
});

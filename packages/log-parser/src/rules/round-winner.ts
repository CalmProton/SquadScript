/**
 * @squadscript/log-parser
 *
 * Rule: Round Winner
 *
 * Matches when a round winner is determined.
 * This stores data for correlation with ROUND_ENDED.
 *
 * Log format:
 * [timestamp][chainID]LogSquadTrace: [DedicatedServer]ASQGameMode::DetermineMatchWinner(): TeamName won on LayerName
 *
 * @module
 */

import type { RoundWinnerEvent } from '@squadscript/types';
import { asTeamID } from '@squadscript/types';
import { defineRule, createLogRegex } from './base.js';
import { parseLogTimestamp } from '../utils/date-parser.js';

/**
 * Rule for ROUND_WINNER events.
 *
 * Note: This rule stores data in the event store but doesn't emit an event
 * directly. The data is consumed by the round tickets rule or round ended.
 */
export const roundWinnerRule = defineRule<RoundWinnerEvent>({
  name: 'round-winner',
  eventName: 'ROUND_WINNER',

  regex: createLogRegex(
    String.raw`LogSquadTrace: \[DedicatedServer\](?:ASQGameMode::)?DetermineMatchWinner\(\): (.+) won on (.+)`,
  ),

  parse(match, context) {
    const [raw, timestamp, , winner, layer] = match;

    // Ensure required groups matched
    if (!timestamp || !winner || !layer) {
      context.logger.warn('round-winner', 'Missing required fields in round winner event');
      return null;
    }

    const time = parseLogTimestamp(timestamp);
    if (!time) {
      context.logger.warn('round-winner', 'Failed to parse timestamp in round winner event');
      return null;
    }

    // Store for correlation with round ended/tickets
    const existing = context.store.getRoundResult();
    if (existing) {
      // Already have a winner stored (draw scenario?)
      context.store.setRoundResult({
        ...existing,
        winner: undefined, // Clear winner on second call (draw)
        layer,
      });
    } else {
      context.store.setRoundResult({
        winner: {
          team: winner,
          faction: '',
          subfaction: '',
          tickets: 0,
        },
        layer,
      });
    }

    return Object.freeze({
      time,
      raw,
      winner: asTeamID(1)!, // Will be resolved by SquadServer
      winnerFaction: winner,
      loserFaction: null,
    });
  },
});

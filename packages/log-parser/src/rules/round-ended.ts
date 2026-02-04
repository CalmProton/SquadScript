/**
 * @squadscript/log-parser
 *
 * Rule: Round Ended
 *
 * Matches when a round ends (transitions to scoreboard).
 *
 * Log format:
 * [timestamp][chainID]LogGameState: Match State Changed from InProgress to WaitingPostMatch
 *
 * @module
 */

import type { RoundEndedEvent } from '@squadscript/types';
import { asTeamID } from '@squadscript/types';
import { defineRule, createLogRegex } from './base.js';
import { parseLogTimestamp } from '../utils/date-parser.js';

/**
 * Rule for ROUND_ENDED events.
 */
export const roundEndedRule = defineRule<RoundEndedEvent>({
  name: 'round-ended',
  eventName: 'ROUND_ENDED',

  regex: createLogRegex(
    String.raw`LogGameState: Match State Changed from InProgress to WaitingPostMatch`,
  ),

  parse(match, context) {
    const [raw, timestamp] = match;

    const time = parseLogTimestamp(timestamp);
    if (!time) {
      context.logger.warn('round-ended', 'Failed to parse timestamp in round ended event');
      return null;
    }

    // Get round result from store
    const roundResult = context.store.getRoundResult();

    // Clear round result
    context.store.clearRoundResult();

    // Determine winner
    let winner = null;
    let team1Tickets = 0;
    let team2Tickets = 0;

    if (roundResult?.winner) {
      const winnerTeam = parseInt(roundResult.winner.team, 10);
      if (winnerTeam === 1 || winnerTeam === 2) {
        winner = asTeamID(winnerTeam);
      }
      team1Tickets = roundResult.winner.team === '1' ? roundResult.winner.tickets : 0;
      team2Tickets = roundResult.winner.team === '2' ? roundResult.winner.tickets : 0;
    }

    if (roundResult?.loser) {
      team1Tickets = roundResult.loser.team === '1' ? roundResult.loser.tickets : team1Tickets;
      team2Tickets = roundResult.loser.team === '2' ? roundResult.loser.tickets : team2Tickets;
    }

    // Duration would require tracking game start time
    const durationSeconds = 0;

    return Object.freeze({
      time,
      raw,
      winner,
      team1Tickets,
      team2Tickets,
      durationSeconds,
      layer: null, // Will be resolved by SquadServer
    });
  },
});

/**
 * @squadscript/log-parser
 *
 * Rule: Round Tickets
 *
 * Matches when ticket counts are logged (win/loss with ticket info).
 * This stores data for correlation with ROUND_ENDED.
 *
 * Log format:
 * [timestamp][chainID]LogSquadGameEvents: Display: Team X, Faction (Subfaction) has won/lost the match with Y Tickets on layer Z (level W)!
 *
 * @module
 */

import type { RoundTicketsEvent } from '@squadscript/types';
import { defineRule, createLogRegex } from './base.js';
import { parseLogTimestamp } from '../utils/date-parser.js';

/**
 * Rule for ROUND_TICKETS events.
 *
 * This rule captures the ticket information when a team wins or loses.
 * It stores data in the event store for the ROUND_ENDED event.
 */
export const roundTicketsRule = defineRule<RoundTicketsEvent>({
  name: 'round-tickets',
  eventName: 'ROUND_TICKETS',

  regex: createLogRegex(
    String.raw`LogSquadGameEvents: Display: Team ([0-9]), (.*) \( ?(.*?) ?\) has (won|lost) the match with ([0-9]+) Tickets on layer (.*) \(level (.*)\)!`,
  ),

  parse(match, context) {
    const [raw, timestamp, , team, subfaction, faction, action, ticketsStr, layer, level] = match;

    // Ensure required groups matched
    if (!timestamp || !team || !subfaction || !faction || !action || !ticketsStr || !layer || !level) {
      context.logger.warn('round-tickets', 'Missing required fields in round tickets event');
      return null;
    }

    const time = parseLogTimestamp(timestamp);
    if (!time) {
      context.logger.warn('round-tickets', 'Failed to parse timestamp in round tickets event');
      return null;
    }

    const tickets = parseInt(ticketsStr, 10);
    const teamNum = parseInt(team, 10);

    // Get existing round result
    const existing = context.store.getRoundResult();

    // Build team data
    const teamData = {
      team,
      faction,
      subfaction,
      tickets,
    };

    if (action === 'won') {
      context.store.setRoundResult({
        ...existing,
        winner: teamData,
        layer,
        level,
      });
    } else {
      context.store.setRoundResult({
        ...existing,
        loser: teamData,
        layer,
        level,
      });
    }

    // Build ticket event
    // We emit this with just the info we have; SquadServer will track both teams
    const team1Tickets = teamNum === 1 ? tickets : 0;
    const team2Tickets = teamNum === 2 ? tickets : 0;

    return Object.freeze({
      time,
      raw,
      team1Tickets,
      team2Tickets,
    });
  },
});

/**
 * @squadscript/log-parser
 *
 * Rule: Server Tick Rate
 *
 * Matches periodic server tick rate logs.
 *
 * Log format:
 * [timestamp][chainID]LogSquad: USQGameState: Server Tick Rate: X.XX
 *
 * @module
 */

import type { ServerTickRateEvent } from '@squadscript/types';
import { defineRule, createLogRegex } from './base.js';
import { parseLogTimestamp } from '../utils/date-parser.js';

/**
 * Rule for SERVER_TICK_RATE events.
 */
export const serverTickRateRule = defineRule<ServerTickRateEvent>({
  name: 'server-tick-rate',
  eventName: 'SERVER_TICK_RATE',

  regex: createLogRegex(
    String.raw`LogSquad: USQGameState: Server Tick Rate: ([0-9.]+)`,
  ),

  parse(match, context) {
    const [raw, timestamp, , tickRateStr] = match;

    const time = parseLogTimestamp(timestamp);
    if (!time) {
      context.logger.warn('server-tick-rate', 'Failed to parse timestamp in server tick rate event');
      return null;
    }

    const tickRate = parseFloat(tickRateStr);

    return Object.freeze({
      time,
      raw,
      tickRate,
      averageTickRate: tickRate, // Single sample, no averaging
    });
  },
});

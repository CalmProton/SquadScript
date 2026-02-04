/**
 * @squadscript/log-parser
 *
 * Rule: Admin Broadcast
 *
 * Matches when an admin broadcasts a message.
 *
 * Log format:
 * [timestamp][chainID]LogSquad: ADMIN COMMAND: Message broadcasted <message> from AdminName
 *
 * @module
 */

import type { AdminBroadcastEvent } from '@squadscript/types';
import { defineRule, createLogRegex } from './base.js';
import { parseLogTimestamp } from '../utils/date-parser.js';

/**
 * Rule for ADMIN_BROADCAST events.
 */
export const adminBroadcastRule = defineRule<AdminBroadcastEvent>({
  name: 'admin-broadcast',
  eventName: 'ADMIN_BROADCAST',

  regex: createLogRegex(
    String.raw`LogSquad: ADMIN COMMAND: Message broadcasted <(.+)> from (.+)`,
  ),

  parse(match, context) {
    const [raw, timestamp, , message, _from] = match;

    // Ensure required groups matched
    if (!timestamp || !message) {
      context.logger.warn('admin-broadcast', 'Missing required fields in admin broadcast event');
      return null;
    }

    const time = parseLogTimestamp(timestamp);
    if (!time) {
      context.logger.warn('admin-broadcast', 'Failed to parse timestamp in admin broadcast event');
      return null;
    }

    return Object.freeze({
      time,
      raw,
      message,
      duration: null, // Duration is not in the log line
    });
  },
});

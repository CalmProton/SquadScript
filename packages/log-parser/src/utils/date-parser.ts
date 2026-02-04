/**
 * @squadscript/log-parser
 *
 * Date/time parsing utilities for Squad log timestamps.
 *
 * Squad log timestamps have a specific format:
 * [2024.01.15-12.30.45:123]
 *
 * @module
 */

import { type ChainID, asChainID } from '@squadscript/types';

// =============================================================================
// Constants
// =============================================================================

/**
 * Pattern for Squad log timestamps.
 * Format: YYYY.MM.DD-HH.MM.SS:mmm
 */
const TIMESTAMP_PATTERN = /^(\d{4})\.(\d{2})\.(\d{2})-(\d{2})\.(\d{2})\.(\d{2}):(\d{3})$/;

// =============================================================================
// Functions
// =============================================================================

/**
 * Parses a Squad log timestamp string to a Date object.
 *
 * Squad timestamps are in UTC and follow the format:
 * YYYY.MM.DD-HH.MM.SS:mmm
 *
 * @param timestamp - The timestamp string from a log line
 * @returns Parsed Date or null if invalid
 *
 * @example
 * ```typescript
 * const date = parseLogTimestamp('2024.01.15-12.30.45:123');
 * // date is Date representing 2024-01-15T12:30:45.123Z
 * ```
 */
export function parseLogTimestamp(timestamp: string): Date | null {
  const match = TIMESTAMP_PATTERN.exec(timestamp);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second, ms] = match;

  // Parse as integers
  const y = parseInt(year, 10);
  const mo = parseInt(month, 10) - 1; // JavaScript months are 0-indexed
  const d = parseInt(day, 10);
  const h = parseInt(hour, 10);
  const mi = parseInt(minute, 10);
  const s = parseInt(second, 10);
  const milliseconds = parseInt(ms, 10);

  // Validate ranges
  if (mo < 0 || mo > 11) return null;
  if (d < 1 || d > 31) return null;
  if (h < 0 || h > 23) return null;
  if (mi < 0 || mi > 59) return null;
  if (s < 0 || s > 59) return null;
  if (milliseconds < 0 || milliseconds > 999) return null;

  // Create date in UTC
  const date = new Date(Date.UTC(y, mo, d, h, mi, s, milliseconds));

  // Verify the date is valid (handles things like Feb 30)
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Parses a chain ID string from a log line.
 *
 * Chain IDs may have leading spaces in the log format.
 *
 * @param chainIDStr - The chain ID string (e.g., " 42" or "123")
 * @returns Parsed ChainID or null if invalid
 *
 * @example
 * ```typescript
 * const chainID = parseChainID(' 42');
 * // chainID is ChainID with value 42
 * ```
 */
export function parseChainID(chainIDStr: string): ChainID | null {
  const trimmed = chainIDStr.trim();
  const value = parseInt(trimmed, 10);

  if (isNaN(value)) {
    return null;
  }

  return asChainID(value);
}

/**
 * Formats a Date to a Squad log timestamp string.
 *
 * Useful for generating test fixtures or logging.
 *
 * @param date - The date to format
 * @returns Formatted timestamp string
 *
 * @example
 * ```typescript
 * const timestamp = formatLogTimestamp(new Date('2024-01-15T12:30:45.123Z'));
 * // '2024.01.15-12.30.45:123'
 * ```
 */
export function formatLogTimestamp(date: Date): string {
  const pad2 = (n: number): string => n.toString().padStart(2, '0');
  const pad3 = (n: number): string => n.toString().padStart(3, '0');

  const year = date.getUTCFullYear();
  const month = pad2(date.getUTCMonth() + 1);
  const day = pad2(date.getUTCDate());
  const hour = pad2(date.getUTCHours());
  const minute = pad2(date.getUTCMinutes());
  const second = pad2(date.getUTCSeconds());
  const ms = pad3(date.getUTCMilliseconds());

  return `${year}.${month}.${day}-${hour}.${minute}.${second}:${ms}`;
}

/**
 * Calculates the time difference in milliseconds between two log timestamps.
 *
 * @param start - Start timestamp string
 * @param end - End timestamp string
 * @returns Difference in milliseconds, or null if either timestamp is invalid
 */
export function timestampDifference(start: string, end: string): number | null {
  const startDate = parseLogTimestamp(start);
  const endDate = parseLogTimestamp(end);

  if (!startDate || !endDate) {
    return null;
  }

  return endDate.getTime() - startDate.getTime();
}

/**
 * @squadscript/logger
 *
 * Log levels enumeration.
 *
 * @module
 */

/**
 * Log level constants.
 *
 * Lower values are more severe/important.
 * Use these to control verbosity of logging output.
 */
export const LogLevel = {
  /** Critical errors that prevent operation. */
  ERROR: 0,

  /** Warning conditions that should be addressed. */
  WARN: 1,

  /** Informational messages about normal operation. */
  INFO: 2,

  /** Verbose information for troubleshooting. */
  VERBOSE: 3,

  /** Debug information for development. */
  DEBUG: 4,

  /** Trace-level information for detailed debugging. */
  TRACE: 5,
} as const;

/**
 * Log level type.
 */
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * Log level names for display.
 */
const LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.VERBOSE]: 'VERBOSE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.TRACE]: 'TRACE',
};

/**
 * Get the string name for a log level.
 *
 * @param level - The log level
 * @returns The level name string
 */
export function levelToString(level: LogLevel): string {
  return LEVEL_NAMES[level] ?? 'UNKNOWN';
}

/**
 * Parse a string to a log level.
 *
 * @param str - The string to parse (case-insensitive)
 * @returns The log level or null if invalid
 */
export function parseLogLevel(str: string): LogLevel | null {
  const normalized = str.toUpperCase();
  const entry = Object.entries(LEVEL_NAMES).find(([_, name]) => name === normalized);
  return entry ? (Number(entry[0]) as LogLevel) : null;
}

/**
 * Check if a log level should be logged given the current verbosity.
 *
 * @param level - The level of the message
 * @param verbosity - The current verbosity setting
 * @returns True if the message should be logged
 */
export function shouldLog(level: LogLevel, verbosity: LogLevel): boolean {
  return level <= verbosity;
}

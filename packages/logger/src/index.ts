/**
 * @squadscript/logger
 *
 * Structured logging utility for SquadScript.
 *
 * This package provides a flexible, type-safe logging system with:
 * - Log levels with module-based verbosity control
 * - Multiple output transports (console, buffer, null)
 * - Customizable formatters (default, JSON)
 * - Child loggers for module isolation
 *
 * @example
 * ```typescript
 * import { Logger, LogLevel } from '@squadscript/logger';
 *
 * // Create a logger with default console output
 * const logger = new Logger({
 *   defaultLevel: LogLevel.INFO,
 *   moduleVerbosity: {
 *     'rcon': LogLevel.DEBUG,
 *     'log-parser': LogLevel.VERBOSE,
 *   },
 * });
 *
 * // Create a module-specific logger
 * const rconLog = logger.child('rcon');
 * rconLog.info('Connected to server');
 * rconLog.debug('Sending command', { command: 'ListPlayers' });
 *
 * // Log with error
 * rconLog.error('Connection failed', new Error('ECONNREFUSED'));
 * ```
 *
 * @packageDocumentation
 */

// Log levels
export {
  LogLevel,
  type LogLevel as LogLevelType,
  levelToString,
  parseLogLevel,
  shouldLog,
} from './levels.js';

// Formatters
export {
  type LogEntry,
  type LogFormatter,
  type DefaultFormatterOptions,
  DefaultFormatter,
  JsonFormatter,
} from './formatter.js';

// Transports
export {
  type LogTransport,
  type ConsoleTransportOptions,
  ConsoleTransport,
  BufferTransport,
  NullTransport,
} from './transports/index.js';

// Main logger
export {
  type LoggerConfig,
  Logger,
  ModuleLogger,
} from './logger.js';

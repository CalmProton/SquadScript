/**
 * @squadscript/logger
 *
 * Main Logger implementation.
 *
 * @module
 */

import { type LogLevel, shouldLog, LogLevel as LogLevelEnum } from './levels.js';
import {
  type LogEntry,
  type LogFormatter,
  DefaultFormatter,
} from './formatter.js';
import {
  type LogTransport,
  ConsoleTransport,
} from './transports/index.js';

/**
 * Logger configuration options.
 */
export interface LoggerConfig {
  /** Default log level for all modules. */
  defaultLevel?: LogLevel;

  /** Module-specific log levels. */
  moduleVerbosity?: Record<string, LogLevel>;

  /** Log transports to use. */
  transports?: LogTransport[];

  /** Default formatter for transports without one. */
  formatter?: LogFormatter;
}

/**
 * Main Logger class.
 *
 * Provides structured logging with:
 * - Module-based verbosity control
 * - Multiple output transports
 * - Customizable formatting
 *
 * This class uses dependency injection - all dependencies are
 * passed via the constructor rather than accessed as singletons.
 *
 * @example
 * ```typescript
 * const logger = new Logger({
 *   defaultLevel: LogLevel.INFO,
 *   moduleVerbosity: {
 *     'rcon': LogLevel.DEBUG,
 *     'log-parser': LogLevel.VERBOSE,
 *   },
 * });
 *
 * const rconLogger = logger.child('rcon');
 * rconLogger.debug('Connection attempt'); // Will log
 * rconLogger.trace('Packet bytes'); // Won't log
 * ```
 */
export class Logger {
  private readonly defaultLevel: LogLevel;
  private readonly moduleVerbosity: Map<string, LogLevel>;
  private readonly transports: LogTransport[];
  private readonly formatter: LogFormatter;

  constructor(config: LoggerConfig = {}) {
    this.defaultLevel = config.defaultLevel ?? LogLevelEnum.INFO;
    this.moduleVerbosity = new Map(
      Object.entries(config.moduleVerbosity ?? {}),
    );
    this.transports = config.transports ?? [new ConsoleTransport()];
    this.formatter = config.formatter ?? new DefaultFormatter();
  }

  /**
   * Create a child logger for a specific module.
   *
   * Child loggers inherit the parent's configuration but
   * can have module-specific verbosity levels.
   *
   * @param module - The module name
   * @returns A ModuleLogger instance
   */
  child(module: string): ModuleLogger {
    return new ModuleLogger(this, module);
  }

  /**
   * Set verbosity level for a specific module.
   *
   * @param module - The module name
   * @param level - The log level
   */
  setModuleVerbosity(module: string, level: LogLevel): void {
    this.moduleVerbosity.set(module, level);
  }

  /**
   * Get verbosity level for a specific module.
   *
   * @param module - The module name
   * @returns The effective log level for the module
   */
  getModuleVerbosity(module: string): LogLevel {
    return this.moduleVerbosity.get(module) ?? this.defaultLevel;
  }

  /**
   * Check if a message at the given level would be logged for a module.
   *
   * @param module - The module name
   * @param level - The log level
   * @returns True if the message would be logged
   */
  isEnabled(module: string, level: LogLevel): boolean {
    return shouldLog(level, this.getModuleVerbosity(module));
  }

  /**
   * Log a message.
   *
   * @param level - Log level
   * @param module - Module name
   * @param message - Log message
   * @param data - Optional structured data
   * @param error - Optional error object
   */
  log(
    level: LogLevel,
    module: string,
    message: string,
    data?: unknown,
    error?: Error,
  ): void {
    if (!this.isEnabled(module, level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      module,
      message,
      ...(data !== undefined && { data }),
      ...(error !== undefined && { error }),
    };

    const formatted = this.formatter.format(entry);

    for (const transport of this.transports) {
      try {
        transport.write(entry, formatted);
      } catch {
        // Don't let transport errors break logging
        console.error(`Logger transport ${transport.name} failed`);
      }
    }
  }

  /**
   * Log an error message.
   */
  error(module: string, message: string, error?: Error, data?: unknown): void {
    this.log(LogLevelEnum.ERROR, module, message, data, error);
  }

  /**
   * Log a warning message.
   */
  warn(module: string, message: string, data?: unknown): void {
    this.log(LogLevelEnum.WARN, module, message, data);
  }

  /**
   * Log an info message.
   */
  info(module: string, message: string, data?: unknown): void {
    this.log(LogLevelEnum.INFO, module, message, data);
  }

  /**
   * Log a verbose message.
   */
  verbose(module: string, message: string, data?: unknown): void {
    this.log(LogLevelEnum.VERBOSE, module, message, data);
  }

  /**
   * Log a debug message.
   */
  debug(module: string, message: string, data?: unknown): void {
    this.log(LogLevelEnum.DEBUG, module, message, data);
  }

  /**
   * Log a trace message.
   */
  trace(module: string, message: string, data?: unknown): void {
    this.log(LogLevelEnum.TRACE, module, message, data);
  }

  /**
   * Flush all transports.
   */
  async flush(): Promise<void> {
    await Promise.all(
      this.transports.map((t) => t.flush?.()),
    );
  }

  /**
   * Close all transports.
   */
  async close(): Promise<void> {
    await Promise.all(
      this.transports.map((t) => t.close?.()),
    );
  }
}

/**
 * Module-specific logger.
 *
 * Provides a cleaner API for logging within a specific module,
 * without needing to pass the module name to each log call.
 *
 * @example
 * ```typescript
 * const log = logger.child('my-plugin');
 *
 * log.info('Plugin loaded');
 * log.debug('Processing event', { eventId: 123 });
 * log.error('Failed to connect', error);
 * ```
 */
export class ModuleLogger {
  constructor(
    private readonly parent: Logger,
    private readonly module: string,
  ) {}

  /**
   * Check if a message at the given level would be logged.
   */
  isEnabled(level: LogLevel): boolean {
    return this.parent.isEnabled(this.module, level);
  }

  /**
   * Log a message at the specified level.
   */
  log(level: LogLevel, message: string, data?: unknown, error?: Error): void {
    this.parent.log(level, this.module, message, data, error);
  }

  /**
   * Log an error message.
   */
  error(message: string, error?: Error, data?: unknown): void {
    this.parent.error(this.module, message, error, data);
  }

  /**
   * Log a warning message.
   */
  warn(message: string, data?: unknown): void {
    this.parent.warn(this.module, message, data);
  }

  /**
   * Log an info message.
   */
  info(message: string, data?: unknown): void {
    this.parent.info(this.module, message, data);
  }

  /**
   * Log a verbose message.
   */
  verbose(message: string, data?: unknown): void {
    this.parent.verbose(this.module, message, data);
  }

  /**
   * Log a debug message.
   */
  debug(message: string, data?: unknown): void {
    this.parent.debug(this.module, message, data);
  }

  /**
   * Log a trace message.
   */
  trace(message: string, data?: unknown): void {
    this.parent.trace(this.module, message, data);
  }

  /**
   * Create a child logger with a prefixed module name.
   *
   * @param submodule - The submodule name
   * @returns A new ModuleLogger
   */
  child(submodule: string): ModuleLogger {
    return this.parent.child(`${this.module}:${submodule}`);
  }
}

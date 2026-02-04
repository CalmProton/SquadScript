/**
 * @squadscript/logger
 *
 * Log transports - output destinations for logs.
 *
 * @module
 */

import type { LogEntry, LogFormatter } from '../formatter.js';
import { DefaultFormatter } from '../formatter.js';
import { type LogLevel, shouldLog } from '../levels.js';

/**
 * Interface for log transports.
 *
 * Transports are responsible for outputting formatted log entries
 * to their destination (console, file, etc.).
 */
export interface LogTransport {
  /**
   * Unique name for this transport.
   */
  readonly name: string;

  /**
   * Write a log entry to this transport.
   *
   * @param entry - The log entry to write
   * @param formatted - The pre-formatted string (from the formatter)
   */
  write(entry: LogEntry, formatted: string): void;

  /**
   * Flush any buffered output.
   */
  flush?(): Promise<void>;

  /**
   * Close the transport and release resources.
   */
  close?(): Promise<void>;
}

/**
 * Console transport options.
 */
export interface ConsoleTransportOptions {
  /** Minimum log level for this transport. */
  level?: LogLevel;

  /** Custom formatter. */
  formatter?: LogFormatter;

  /** Whether to use stderr for errors/warnings. */
  useStderr?: boolean;
}

/**
 * Console transport implementation.
 *
 * Writes log entries to stdout/stderr.
 */
export class ConsoleTransport implements LogTransport {
  readonly name = 'console';

  private readonly level: LogLevel;
  private readonly formatter: LogFormatter;
  private readonly useStderr: boolean;

  constructor(options: ConsoleTransportOptions = {}) {
    this.level = options.level ?? 2; // INFO
    this.formatter = options.formatter ?? new DefaultFormatter();
    this.useStderr = options.useStderr ?? true;
  }

  write(entry: LogEntry, _formatted: string): void {
    if (!shouldLog(entry.level, this.level)) {
      return;
    }

    const formatted = this.formatter.format(entry);

    // Use stderr for ERROR and WARN levels
    if (this.useStderr && entry.level <= 1) {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  }
}

/**
 * Buffer transport for testing.
 *
 * Collects log entries in memory for inspection.
 */
export class BufferTransport implements LogTransport {
  readonly name = 'buffer';

  private readonly _entries: LogEntry[] = [];
  private readonly _formatted: string[] = [];

  /**
   * Get all collected entries.
   */
  get entries(): readonly LogEntry[] {
    return this._entries;
  }

  /**
   * Get all formatted log strings.
   */
  get formatted(): readonly string[] {
    return this._formatted;
  }

  write(entry: LogEntry, formatted: string): void {
    this._entries.push(entry);
    this._formatted.push(formatted);
  }

  /**
   * Clear all collected entries.
   */
  clear(): void {
    this._entries.length = 0;
    this._formatted.length = 0;
  }
}

/**
 * Null transport that discards all output.
 *
 * Useful for testing or disabling logging.
 */
export class NullTransport implements LogTransport {
  readonly name = 'null';

  write(_entry: LogEntry, _formatted: string): void {
    // Intentionally empty - discards all output
  }
}

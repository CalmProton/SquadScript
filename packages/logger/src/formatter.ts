/**
 * @squadscript/logger
 *
 * Log entry formatting.
 *
 * @module
 */

import { type LogLevel, levelToString } from './levels.js';

/**
 * Represents a log entry with all associated metadata.
 */
export interface LogEntry {
  /** Timestamp when the log entry was created. */
  readonly timestamp: Date;

  /** Log level of the entry. */
  readonly level: LogLevel;

  /** Module or component that generated the log. */
  readonly module: string;

  /** The log message. */
  readonly message: string;

  /** Additional structured data. */
  readonly data?: unknown;

  /** Error object if logging an error. */
  readonly error?: Error;
}

/**
 * Interface for log formatters.
 *
 * Formatters convert log entries into strings for output.
 */
export interface LogFormatter {
  /**
   * Format a log entry into a string.
   *
   * @param entry - The log entry to format
   * @returns The formatted string
   */
  format(entry: LogEntry): string;
}

/**
 * ANSI color codes for terminal output.
 */
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
  magenta: '\x1b[35m',
} as const;

/**
 * Color mapping for log levels.
 */
const LEVEL_COLORS: Record<LogLevel, string> = {
  0: COLORS.red, // ERROR
  1: COLORS.yellow, // WARN
  2: COLORS.blue, // INFO
  3: COLORS.cyan, // VERBOSE
  4: COLORS.magenta, // DEBUG
  5: COLORS.gray, // TRACE
};

/**
 * Default formatter configuration.
 */
export interface DefaultFormatterOptions {
  /** Whether to include colors in output. */
  colors?: boolean;

  /** Whether to include timestamps. */
  timestamps?: boolean;

  /** Timestamp format ('iso' | 'short' | 'time'). */
  timestampFormat?: 'iso' | 'short' | 'time';

  /** Whether to include module names. */
  showModule?: boolean;

  /** Maximum width of module name (will be padded/truncated). */
  moduleWidth?: number;

  /** Whether to include structured data. */
  showData?: boolean;

  /** Whether to include error stack traces. */
  showStack?: boolean;
}

/**
 * Default log formatter implementation.
 *
 * Produces human-readable log output with optional colors and timestamps.
 */
export class DefaultFormatter implements LogFormatter {
  private readonly options: Required<DefaultFormatterOptions>;

  constructor(options: DefaultFormatterOptions = {}) {
    this.options = {
      colors: options.colors ?? true,
      timestamps: options.timestamps ?? true,
      timestampFormat: options.timestampFormat ?? 'time',
      showModule: options.showModule ?? true,
      moduleWidth: options.moduleWidth ?? 15,
      showData: options.showData ?? true,
      showStack: options.showStack ?? true,
    };
  }

  format(entry: LogEntry): string {
    const parts: string[] = [];

    // Timestamp
    if (this.options.timestamps) {
      const ts = this.formatTimestamp(entry.timestamp);
      parts.push(this.colorize(ts, COLORS.gray));
    }

    // Level
    const levelStr = levelToString(entry.level).padEnd(7);
    const levelColor = LEVEL_COLORS[entry.level] ?? COLORS.white;
    parts.push(this.colorize(levelStr, levelColor));

    // Module
    if (this.options.showModule && entry.module) {
      const module = this.truncateOrPad(entry.module, this.options.moduleWidth);
      parts.push(this.colorize(`[${module}]`, COLORS.cyan));
    }

    // Message
    parts.push(entry.message);

    // Data
    if (this.options.showData && entry.data !== undefined) {
      try {
        const dataStr = JSON.stringify(entry.data, null, 2);
        parts.push(this.colorize(dataStr, COLORS.gray));
      } catch {
        parts.push(this.colorize('[unserializable data]', COLORS.gray));
      }
    }

    // Error stack
    if (this.options.showStack && entry.error?.stack) {
      parts.push('\n' + this.colorize(entry.error.stack, COLORS.red));
    }

    return parts.join(' ');
  }

  private formatTimestamp(date: Date): string {
    switch (this.options.timestampFormat) {
      case 'iso':
        return date.toISOString();
      case 'short':
        return date.toISOString().slice(5, 19).replace('T', ' ');
      case 'time':
      default:
        return date.toTimeString().slice(0, 8);
    }
  }

  private colorize(text: string, color: string): string {
    if (!this.options.colors) {
      return text;
    }
    return `${color}${text}${COLORS.reset}`;
  }

  private truncateOrPad(text: string, width: number): string {
    if (text.length > width) {
      return text.slice(0, width - 1) + '…';
    }
    return text.padEnd(width);
  }
}

/**
 * JSON formatter for structured logging.
 *
 * Produces JSON output suitable for log aggregation systems.
 */
export class JsonFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const obj = {
      timestamp: entry.timestamp.toISOString(),
      level: levelToString(entry.level),
      module: entry.module,
      message: entry.message,
      ...(entry.data !== undefined && { data: entry.data }),
      ...(entry.error && {
        error: {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack,
        },
      }),
    };
    return JSON.stringify(obj);
  }
}

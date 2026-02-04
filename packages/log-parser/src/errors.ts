/**
 * @squadscript/log-parser
 *
 * Error types for log parser operations.
 *
 * All errors in this module extend the base Error class and include
 * an error code for programmatic handling.
 *
 * @module
 */

// =============================================================================
// Error Codes
// =============================================================================

/**
 * Error codes for log parser operations.
 */
export type LogParserErrorCode =
  | 'PARSE_ERROR'
  | 'RULE_ERROR'
  | 'QUEUE_FULL'
  | 'STORE_ERROR'
  | 'ALREADY_WATCHING'
  | 'NOT_WATCHING';

/**
 * Error codes for log reader operations.
 */
export type LogReaderErrorCode =
  | 'WATCH_FAILED'
  | 'READ_FAILED'
  | 'CONNECTION_FAILED'
  | 'AUTH_FAILED'
  | 'FILE_NOT_FOUND'
  | 'ALREADY_WATCHING'
  | 'NOT_WATCHING'
  | 'PERMISSION_DENIED';

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Base error for log parser operations.
 *
 * @example
 * ```typescript
 * throw new LogParserError(
 *   'PARSE_ERROR',
 *   'Failed to parse log line',
 *   { line: 'invalid line data' }
 * );
 * ```
 */
export class LogParserError extends Error {
  /** The error code for programmatic handling. */
  readonly code: LogParserErrorCode;

  /** Additional context about the error. */
  readonly context?: Record<string, unknown> | undefined;

  constructor(
    code: LogParserErrorCode,
    message: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, { cause });
    this.name = 'LogParserError';
    this.code = code;
    this.context = context;

    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LogParserError);
    }
  }

  /**
   * Creates a string representation including context.
   */
  override toString(): string {
    const contextStr = this.context
      ? ` (${JSON.stringify(this.context)})`
      : '';
    return `${this.name} [${this.code}]: ${this.message}${contextStr}`;
  }

  /**
   * Creates a JSON-serializable representation.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Error for log reader operations.
 *
 * Used when there are issues with reading log files from any source
 * (local filesystem, FTP, SFTP).
 *
 * @example
 * ```typescript
 * throw new LogReaderError(
 *   'CONNECTION_FAILED',
 *   'Failed to connect to FTP server',
 *   { host: 'server.example.com', port: 21 }
 * );
 * ```
 */
export class LogReaderError extends Error {
  /** The error code for programmatic handling. */
  readonly code: LogReaderErrorCode;

  /** Additional context about the error. */
  readonly context?: Record<string, unknown> | undefined;

  constructor(
    code: LogReaderErrorCode,
    message: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, { cause });
    this.name = 'LogReaderError';
    this.code = code;
    this.context = context;

    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LogReaderError);
    }
  }

  /**
   * Creates a string representation including context.
   */
  override toString(): string {
    const contextStr = this.context
      ? ` (${JSON.stringify(this.context)})`
      : '';
    return `${this.name} [${this.code}]: ${this.message}${contextStr}`;
  }

  /**
   * Creates a JSON-serializable representation.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      stack: this.stack,
    };
  }
}

// =============================================================================
// Error Factory Functions
// =============================================================================

/**
 * Creates a LogParserError for parse failures.
 */
export function createParseError(
  message: string,
  line?: string,
  cause?: Error,
): LogParserError {
  return new LogParserError(
    'PARSE_ERROR',
    message,
    line ? { line } : undefined,
    cause,
  );
}

/**
 * Creates a LogParserError for rule execution failures.
 */
export function createRuleError(
  ruleName: string,
  message: string,
  cause?: Error,
): LogParserError {
  return new LogParserError(
    'RULE_ERROR',
    message,
    { ruleName },
    cause,
  );
}

/**
 * Creates a LogReaderError for connection failures.
 */
export function createConnectionError(
  host: string,
  port: number,
  message: string,
  cause?: Error,
): LogReaderError {
  return new LogReaderError(
    'CONNECTION_FAILED',
    message,
    { host, port },
    cause,
  );
}

/**
 * Creates a LogReaderError for authentication failures.
 */
export function createAuthError(
  host: string,
  username: string,
  message: string,
  cause?: Error,
): LogReaderError {
  return new LogReaderError(
    'AUTH_FAILED',
    message,
    { host, username },
    cause,
  );
}

/**
 * Creates a LogReaderError for file not found.
 */
export function createFileNotFoundError(
  filePath: string,
  cause?: Error,
): LogReaderError {
  return new LogReaderError(
    'FILE_NOT_FOUND',
    `Log file not found: ${filePath}`,
    { filePath },
    cause,
  );
}

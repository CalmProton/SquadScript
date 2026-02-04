/**
 * @squadscript/rcon
 *
 * Error types for RCON operations.
 *
 * All errors extend a base RconError class for easy catching and
 * identification. Each error type has a unique code for programmatic
 * error handling.
 *
 * @module
 */

// =============================================================================
// Base Error
// =============================================================================

/**
 * Base error class for all RCON errors.
 *
 * @example
 * ```typescript
 * try {
 *   await client.connect();
 * } catch (err) {
 *   if (err instanceof RconError) {
 *     console.error(`RCON error [${err.code}]: ${err.message}`);
 *   }
 * }
 * ```
 */
export abstract class RconError extends Error {
  /** Unique error code for programmatic handling. */
  abstract readonly code: string;

  /** Whether this error is recoverable (can retry). */
  abstract readonly recoverable: boolean;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Creates a serializable representation of the error.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      stack: this.stack,
    };
  }
}

// =============================================================================
// Connection Errors
// =============================================================================

/**
 * Error codes for connection-related failures.
 */
export type ConnectionErrorCode =
  | 'CONNECTION_FAILED'
  | 'CONNECTION_TIMEOUT'
  | 'CONNECTION_REFUSED'
  | 'CONNECTION_RESET'
  | 'CONNECTION_CLOSED'
  | 'NOT_CONNECTED'
  | 'SOCKET_ERROR';

/**
 * Connection-related errors.
 *
 * These occur when establishing, maintaining, or closing the TCP
 * connection to the RCON server.
 */
export class ConnectionError extends RconError {
  readonly code: ConnectionErrorCode;
  readonly recoverable: boolean;

  /** The underlying socket error, if any. */
  override readonly cause?: Error | undefined;

  /** Server host that failed to connect. */
  readonly host?: string | undefined;

  /** Server port that failed to connect. */
  readonly port?: number | undefined;

  constructor(
    code: ConnectionErrorCode,
    message: string,
    options?: {
      cause?: Error | undefined;
      host?: string | undefined;
      port?: number | undefined;
      recoverable?: boolean | undefined;
    },
  ) {
    super(message);
    this.code = code;
    this.cause = options?.cause;
    this.host = options?.host;
    this.port = options?.port;

    // Most connection errors are recoverable
    this.recoverable = options?.recoverable ?? true;
  }

  /**
   * Creates a connection refused error.
   */
  static refused(host: string, port: number, cause?: Error): ConnectionError {
    return new ConnectionError(
      'CONNECTION_REFUSED',
      `Connection refused to ${host}:${port}`,
      { cause, host, port, recoverable: true },
    );
  }

  /**
   * Creates a connection timeout error.
   */
  static timeout(host: string, port: number, timeoutMs: number): ConnectionError {
    return new ConnectionError(
      'CONNECTION_TIMEOUT',
      `Connection to ${host}:${port} timed out after ${timeoutMs}ms`,
      { host, port, recoverable: true },
    );
  }

  /**
   * Creates a not connected error.
   */
  static notConnected(): ConnectionError {
    return new ConnectionError(
      'NOT_CONNECTED',
      'Not connected to RCON server',
      { recoverable: false },
    );
  }

  /**
   * Creates a connection closed error.
   */
  static closed(reason?: string): ConnectionError {
    return new ConnectionError(
      'CONNECTION_CLOSED',
      `Connection closed${reason ? `: ${reason}` : ''}`,
      { recoverable: true },
    );
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      host: this.host,
      port: this.port,
      cause: this.cause?.message,
    };
  }
}

// =============================================================================
// Authentication Errors
// =============================================================================

/**
 * Error codes for authentication failures.
 */
export type AuthErrorCode =
  | 'AUTH_FAILED'
  | 'AUTH_TIMEOUT'
  | 'AUTH_NO_RESPONSE'
  | 'INVALID_PASSWORD';

/**
 * Authentication-related errors.
 *
 * These occur during the RCON authentication handshake.
 */
export class AuthenticationError extends RconError {
  readonly code: AuthErrorCode;
  readonly recoverable: boolean = false;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.code = code;
  }

  /**
   * Creates an authentication failed error.
   */
  static failed(): AuthenticationError {
    return new AuthenticationError(
      'AUTH_FAILED',
      'RCON authentication failed - check password',
    );
  }

  /**
   * Creates an authentication timeout error.
   */
  static timeout(timeoutMs: number): AuthenticationError {
    return new AuthenticationError(
      'AUTH_TIMEOUT',
      `Authentication timed out after ${timeoutMs}ms`,
    );
  }
}

// =============================================================================
// Command Errors
// =============================================================================

/**
 * Error codes for command execution failures.
 */
export type CommandErrorCode =
  | 'COMMAND_TIMEOUT'
  | 'COMMAND_FAILED'
  | 'COMMAND_ABORTED'
  | 'INVALID_COMMAND'
  | 'RESPONSE_MISMATCH';

/**
 * Command execution errors.
 *
 * These occur when sending commands or processing responses.
 */
export class CommandError extends RconError {
  readonly code: CommandErrorCode;
  readonly recoverable: boolean;

  /** The command that was being executed. */
  readonly command?: string | undefined;

  /** Sequence number for request tracking. */
  readonly sequence?: number | undefined;

  constructor(
    code: CommandErrorCode,
    message: string,
    options?: {
      command?: string | undefined;
      sequence?: number | undefined;
      recoverable?: boolean | undefined;
    },
  ) {
    super(message);
    this.code = code;
    this.command = options?.command;
    this.sequence = options?.sequence;

    // Timeouts are recoverable, other errors usually aren't
    this.recoverable = options?.recoverable ?? code === 'COMMAND_TIMEOUT';
  }

  /**
   * Creates a command timeout error.
   */
  static timeout(command: string, timeoutMs: number): CommandError {
    return new CommandError(
      'COMMAND_TIMEOUT',
      `Command '${command}' timed out after ${timeoutMs}ms`,
      { command, recoverable: true },
    );
  }

  /**
   * Creates a command aborted error (e.g., disconnect during execution).
   */
  static aborted(command: string, reason?: string): CommandError {
    return new CommandError(
      'COMMAND_ABORTED',
      `Command '${command}' aborted${reason ? `: ${reason}` : ''}`,
      { command, recoverable: false },
    );
  }

  /**
   * Creates an invalid command error.
   */
  static invalid(command: string, reason?: string): CommandError {
    return new CommandError(
      'INVALID_COMMAND',
      `Invalid command '${command}'${reason ? `: ${reason}` : ''}`,
      { command, recoverable: false },
    );
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      command: this.command,
      sequence: this.sequence,
    };
  }
}

// =============================================================================
// Parse Errors
// =============================================================================

/**
 * Error codes for response parsing failures.
 */
export type ParseErrorCode =
  | 'INVALID_RESPONSE'
  | 'UNEXPECTED_FORMAT'
  | 'MISSING_FIELD'
  | 'INVALID_ID';

/**
 * Response parsing errors.
 *
 * These occur when the server response cannot be parsed into the
 * expected data structure.
 */
export class ParseError extends RconError {
  readonly code: ParseErrorCode;
  readonly recoverable: boolean = false;

  /** The command that produced the unparseable response. */
  readonly command?: string | undefined;

  /** The raw response that failed to parse. */
  readonly rawResponse?: string | undefined;

  constructor(
    code: ParseErrorCode,
    message: string,
    options?: {
      command?: string | undefined;
      rawResponse?: string | undefined;
    },
  ) {
    super(message);
    this.code = code;
    this.command = options?.command;

    // Truncate very long responses for storage
    if (options?.rawResponse) {
      this.rawResponse =
        options.rawResponse.length > 1000
          ? `${options.rawResponse.slice(0, 1000)}...`
          : options.rawResponse;
    }
  }

  /**
   * Creates an unexpected format error.
   */
  static unexpectedFormat(
    command: string,
    expected: string,
    rawResponse: string,
  ): ParseError {
    return new ParseError(
      'UNEXPECTED_FORMAT',
      `Unexpected response format for '${command}': expected ${expected}`,
      { command, rawResponse },
    );
  }

  /**
   * Creates a missing field error.
   */
  static missingField(
    command: string,
    field: string,
    rawResponse: string,
  ): ParseError {
    return new ParseError(
      'MISSING_FIELD',
      `Missing required field '${field}' in response for '${command}'`,
      { command, rawResponse },
    );
  }

  /**
   * Creates an invalid ID format error.
   */
  static invalidId(
    idType: 'SteamID' | 'EOSID' | 'PlayerID',
    value: string,
  ): ParseError {
    return new ParseError(
      'INVALID_ID',
      `Invalid ${idType} format: '${value}'`,
    );
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      command: this.command,
      rawResponse: this.rawResponse,
    };
  }
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Checks if an error is any RCON error.
 */
export function isRconError(error: unknown): error is RconError {
  return error instanceof RconError;
}

/**
 * Checks if an error is a connection error.
 */
export function isConnectionError(error: unknown): error is ConnectionError {
  return error instanceof ConnectionError;
}

/**
 * Checks if an error is an authentication error.
 */
export function isAuthenticationError(
  error: unknown,
): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Checks if an error is a command error.
 */
export function isCommandError(error: unknown): error is CommandError {
  return error instanceof CommandError;
}

/**
 * Checks if an error is a parse error.
 */
export function isParseError(error: unknown): error is ParseError {
  return error instanceof ParseError;
}

/**
 * Checks if an error is recoverable.
 */
export function isRecoverableError(error: unknown): boolean {
  if (isRconError(error)) {
    return error.recoverable;
  }
  return false;
}

/**
 * @squadscript/server
 *
 * Error definitions for SquadServer.
 *
 * @module
 */

// =============================================================================
// Error Codes
// =============================================================================

/**
 * Error codes for SquadServer errors.
 */
export const ErrorCode = {
  // Connection errors
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  CONNECTION_LOST: 'CONNECTION_LOST',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',

  // State errors
  INVALID_STATE: 'INVALID_STATE',
  ALREADY_RUNNING: 'ALREADY_RUNNING',
  NOT_RUNNING: 'NOT_RUNNING',

  // Update errors
  PLAYER_UPDATE_FAILED: 'PLAYER_UPDATE_FAILED',
  SQUAD_UPDATE_FAILED: 'SQUAD_UPDATE_FAILED',
  LAYER_UPDATE_FAILED: 'LAYER_UPDATE_FAILED',
  SERVER_INFO_UPDATE_FAILED: 'SERVER_INFO_UPDATE_FAILED',

  // Admin errors
  ADMIN_LIST_LOAD_FAILED: 'ADMIN_LIST_LOAD_FAILED',
  ADMIN_LIST_PARSE_FAILED: 'ADMIN_LIST_PARSE_FAILED',

  // Layer errors
  LAYER_DATABASE_FETCH_FAILED: 'LAYER_DATABASE_FETCH_FAILED',
  LAYER_PARSE_FAILED: 'LAYER_PARSE_FAILED',

  // Command errors
  COMMAND_FAILED: 'COMMAND_FAILED',
  COMMAND_TIMEOUT: 'COMMAND_TIMEOUT',

  // Generic
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// =============================================================================
// Base Error Class
// =============================================================================

/**
 * Base error class for all SquadServer errors.
 *
 * Provides structured error information with:
 * - Error code for programmatic handling
 * - Recoverable flag indicating if auto-recovery is possible
 * - Optional context data for debugging
 *
 * @example
 * ```typescript
 * const error = new SquadServerError(
 *   'CONNECTION_FAILED',
 *   'Failed to connect to RCON server',
 *   { host: '127.0.0.1', port: 21114 },
 *   originalError,
 * );
 *
 * if (error.recoverable) {
 *   // Attempt retry
 * }
 * ```
 */
export class SquadServerError extends Error {
  /**
   * Creates a new SquadServerError.
   *
   * @param code - Error code for programmatic handling
   * @param message - Human-readable error message
   * @param context - Optional contextual data for debugging
   * @param cause - Original error that caused this error
   */
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, { cause });
    this.name = 'SquadServerError';

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SquadServerError);
    }
  }

  /**
   * Whether this error is recoverable through automatic retry.
   */
  get recoverable(): boolean {
    switch (this.code) {
      case ErrorCode.CONNECTION_LOST:
      case ErrorCode.PLAYER_UPDATE_FAILED:
      case ErrorCode.SQUAD_UPDATE_FAILED:
      case ErrorCode.LAYER_UPDATE_FAILED:
      case ErrorCode.SERVER_INFO_UPDATE_FAILED:
      case ErrorCode.ADMIN_LIST_LOAD_FAILED:
      case ErrorCode.COMMAND_TIMEOUT:
        return true;
      default:
        return false;
    }
  }

  /**
   * Formats the error for logging.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      context: this.context,
      cause: this.cause instanceof Error ? this.cause.message : undefined,
    };
  }
}

// =============================================================================
// Specific Error Classes
// =============================================================================

/**
 * Error thrown when a connection operation fails.
 */
export class ConnectionError extends SquadServerError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(ErrorCode.CONNECTION_FAILED, message, context, cause);
    this.name = 'ConnectionError';
  }
}

/**
 * Error thrown when authentication fails.
 */
export class AuthenticationError extends SquadServerError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(ErrorCode.AUTHENTICATION_FAILED, message, context, cause);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when an operation is attempted in an invalid state.
 */
export class InvalidStateError extends SquadServerError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(ErrorCode.INVALID_STATE, message, context, cause);
    this.name = 'InvalidStateError';
  }
}

/**
 * Error thrown when a state update operation fails.
 */
export class StateUpdateError extends SquadServerError {
  constructor(
    code:
      | typeof ErrorCode.PLAYER_UPDATE_FAILED
      | typeof ErrorCode.SQUAD_UPDATE_FAILED
      | typeof ErrorCode.LAYER_UPDATE_FAILED
      | typeof ErrorCode.SERVER_INFO_UPDATE_FAILED,
    message: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(code, message, context, cause);
    this.name = 'StateUpdateError';
  }
}

/**
 * Error thrown when admin list operations fail.
 */
export class AdminListError extends SquadServerError {
  constructor(
    code:
      | typeof ErrorCode.ADMIN_LIST_LOAD_FAILED
      | typeof ErrorCode.ADMIN_LIST_PARSE_FAILED,
    message: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(code, message, context, cause);
    this.name = 'AdminListError';
  }
}

/**
 * Error thrown when layer operations fail.
 */
export class LayerError extends SquadServerError {
  constructor(
    code:
      | typeof ErrorCode.LAYER_DATABASE_FETCH_FAILED
      | typeof ErrorCode.LAYER_PARSE_FAILED,
    message: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(code, message, context, cause);
    this.name = 'LayerError';
  }
}

/**
 * Error thrown when a command execution fails.
 */
export class CommandError extends SquadServerError {
  constructor(
    code: typeof ErrorCode.COMMAND_FAILED | typeof ErrorCode.COMMAND_TIMEOUT,
    message: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(code, message, context, cause);
    this.name = 'CommandError';
  }
}

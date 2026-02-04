/**
 * @squadscript/config
 *
 * Config-specific error types.
 *
 * @module
 */

/**
 * Configuration error codes.
 */
export type ConfigErrorCode =
  | 'FILE_READ_ERROR'
  | 'FILE_NOT_FOUND'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'MISSING_REQUIRED'
  | 'INVALID_TYPE';

/**
 * Details about a validation error.
 */
export interface ValidationErrorDetail {
  /** Path to the invalid field (dot-separated). */
  path: string;

  /** Error message. */
  message: string;

  /** Expected value or type. */
  expected?: string;

  /** Received value. */
  received?: unknown;
}

/**
 * Configuration error class.
 *
 * Provides structured error information for configuration issues.
 */
export class ConfigError extends Error {
  /**
   * Create a new ConfigError.
   *
   * @param message - Error message
   * @param code - Error code
   * @param details - Additional error details
   * @param cause - Original error that caused this
   */
  readonly originalCause: Error | undefined;

  constructor(
    message: string,
    public readonly code: ConfigErrorCode,
    public readonly details?: ValidationErrorDetail[],
    originalCause?: Error,
  ) {
    super(message, { cause: originalCause });
    this.name = 'ConfigError';
    this.originalCause = originalCause;

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConfigError);
    }
  }

  /**
   * Create a file not found error.
   */
  static fileNotFound(path: string): ConfigError {
    return new ConfigError(
      `Configuration file not found: ${path}`,
      'FILE_NOT_FOUND',
    );
  }

  /**
   * Create a file read error.
   */
  static fileReadError(path: string, cause: Error): ConfigError {
    return new ConfigError(
      `Failed to read configuration file: ${path}`,
      'FILE_READ_ERROR',
      undefined,
      cause,
    );
  }

  /**
   * Create a parse error.
   */
  static parseError(message: string, cause?: Error): ConfigError {
    return new ConfigError(
      `Failed to parse configuration: ${message}`,
      'PARSE_ERROR',
      undefined,
      cause,
    );
  }

  /**
   * Create a validation error.
   */
  static validationError(details: ValidationErrorDetail[]): ConfigError {
    const paths = details.map((d) => d.path).join(', ');
    return new ConfigError(
      `Configuration validation failed: ${paths}`,
      'VALIDATION_ERROR',
      details,
    );
  }

  /**
   * Format error details as a human-readable string.
   */
  formatDetails(): string {
    if (!this.details || this.details.length === 0) {
      return this.message;
    }

    const lines = [this.message, ''];
    for (const detail of this.details) {
      lines.push(`  • ${detail.path}: ${detail.message}`);
      if (detail.expected) {
        lines.push(`    Expected: ${detail.expected}`);
      }
      if (detail.received !== undefined) {
        lines.push(`    Received: ${JSON.stringify(detail.received)}`);
      }
    }
    return lines.join('\n');
  }
}

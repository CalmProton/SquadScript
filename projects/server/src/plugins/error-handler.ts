/**
 * @squadscript/server
 *
 * Plugin Error Handler with circuit breaker pattern.
 *
 * Provides error isolation and recovery mechanisms for plugins
 * to prevent one failing plugin from affecting others.
 *
 * @module
 */

/**
 * Types of plugin errors.
 */
export const PluginErrorType = {
  /** Error during plugin lifecycle (mount/unmount). */
  LIFECYCLE: 'LIFECYCLE',
  /** Error during event handling. */
  EVENT: 'EVENT',
  /** Error during connector interaction. */
  CONNECTOR: 'CONNECTOR',
  /** Error during RCON command execution. */
  RCON: 'RCON',
  /** Error during option validation. */
  VALIDATION: 'VALIDATION',
  /** Unknown/unclassified error. */
  UNKNOWN: 'UNKNOWN',
} as const;

export type PluginErrorType = (typeof PluginErrorType)[keyof typeof PluginErrorType];

/**
 * Plugin error with context.
 */
export class PluginError extends Error {
  /** The plugin that caused the error. */
  readonly pluginName: string;

  /** The type of error. */
  readonly errorType: PluginErrorType;

  /** The underlying error. */
  readonly cause: Error | undefined;

  /** When the error occurred. */
  readonly timestamp: Date;

  /** Additional context about the error. */
  readonly context: Record<string, unknown> | undefined;

  constructor(
    pluginName: string,
    message: string,
    errorType: PluginErrorType,
    cause?: Error,
    context?: Record<string, unknown>,
  ) {
    super(`[${pluginName}] ${message}`);

    this.name = 'PluginError';
    this.pluginName = pluginName;
    this.errorType = errorType;
    this.cause = cause;
    this.timestamp = new Date();
    this.context = context;

    // Maintain stack trace
    if (cause?.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }

  /**
   * Creates a lifecycle error.
   */
  static lifecycle(
    pluginName: string,
    phase: string,
    cause?: Error,
  ): PluginError {
    return new PluginError(
      pluginName,
      `Error during ${phase}`,
      PluginErrorType.LIFECYCLE,
      cause,
      { phase },
    );
  }

  /**
   * Creates an event handler error.
   */
  static event(
    pluginName: string,
    eventName: string,
    cause?: Error,
  ): PluginError {
    return new PluginError(
      pluginName,
      `Error handling event "${eventName}"`,
      PluginErrorType.EVENT,
      cause,
      { eventName },
    );
  }

  /**
   * Creates a connector error.
   */
  static connector(
    pluginName: string,
    connectorName: string,
    cause?: Error,
  ): PluginError {
    return new PluginError(
      pluginName,
      `Connector "${connectorName}" error`,
      PluginErrorType.CONNECTOR,
      cause,
      { connectorName },
    );
  }

  /**
   * Creates an RCON error.
   */
  static rcon(
    pluginName: string,
    command: string,
    cause?: Error,
  ): PluginError {
    return new PluginError(
      pluginName,
      `RCON command failed: ${command}`,
      PluginErrorType.RCON,
      cause,
      { command },
    );
  }
}

/**
 * Circuit breaker state.
 */
export const CircuitState = {
  /** Circuit is closed, requests pass through normally. */
  CLOSED: 'CLOSED',
  /** Circuit is open, requests are blocked. */
  OPEN: 'OPEN',
  /** Circuit is testing if service recovered. */
  HALF_OPEN: 'HALF_OPEN',
} as const;

export type CircuitState = (typeof CircuitState)[keyof typeof CircuitState];

/**
 * Circuit breaker configuration.
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit (default: 5). */
  readonly failureThreshold: number;
  /** Time in ms before attempting to close circuit (default: 60000). */
  readonly resetTimeout: number;
  /** Number of successes in half-open state to close circuit (default: 2). */
  readonly successThreshold: number;
}

/**
 * Default circuit breaker configuration.
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60_000,
  successThreshold: 2,
};

/**
 * Circuit breaker for a single plugin.
 *
 * Tracks errors and can temporarily disable a plugin that's
 * consistently failing to prevent cascading failures.
 */
export class PluginCircuitBreaker {
  /** Plugin name. */
  readonly pluginName: string;

  /** Configuration. */
  private readonly config: CircuitBreakerConfig;

  /** Current state. */
  private state: CircuitState = CircuitState.CLOSED;

  /** Number of consecutive failures. */
  private failureCount = 0;

  /** Number of consecutive successes (in half-open state). */
  private successCount = 0;

  /** Timer for transitioning from OPEN to HALF_OPEN. */
  private resetTimer: ReturnType<typeof setTimeout> | undefined;

  /** Last error that occurred. */
  private lastError: PluginError | undefined;

  /** Timestamp of last state change. */
  private lastStateChange: Date = new Date();

  constructor(
    pluginName: string,
    config: Partial<CircuitBreakerConfig> = {},
  ) {
    this.pluginName = pluginName;
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  /**
   * Gets the current circuit state.
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Whether requests should be allowed through.
   */
  isAllowed(): boolean {
    return this.state !== CircuitState.OPEN;
  }

  /**
   * Records a successful operation.
   */
  recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  /**
   * Records a failed operation.
   */
  recordFailure(error: PluginError): void {
    this.lastError = error;
    this.failureCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state reopens the circuit
      this.transitionTo(CircuitState.OPEN);
    } else if (
      this.state === CircuitState.CLOSED &&
      this.failureCount >= this.config.failureThreshold
    ) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  /**
   * Gets the last error.
   */
  getLastError(): PluginError | undefined {
    return this.lastError;
  }

  /**
   * Gets the current failure count.
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Gets the timestamp of the last state change.
   */
  getLastStateChange(): Date {
    return this.lastStateChange;
  }

  /**
   * Resets the circuit breaker to initial state.
   */
  reset(): void {
    this.clearResetTimer();
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastError = undefined;
    this.lastStateChange = new Date();
  }

  /**
   * Cleans up resources.
   */
  dispose(): void {
    this.clearResetTimer();
  }

  /**
   * Transitions to a new state.
   */
  private transitionTo(newState: CircuitState): void {
    this.clearResetTimer();

    this.state = newState;
    this.lastStateChange = new Date();

    if (newState === CircuitState.OPEN) {
      // Schedule transition to half-open
      this.resetTimer = setTimeout(() => {
        this.transitionTo(CircuitState.HALF_OPEN);
      }, this.config.resetTimeout);
    } else if (newState === CircuitState.HALF_OPEN) {
      this.successCount = 0;
    } else if (newState === CircuitState.CLOSED) {
      this.failureCount = 0;
      this.successCount = 0;
    }
  }

  /**
   * Clears the reset timer if set.
   */
  private clearResetTimer(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
  }
}

/**
 * Error handler configuration.
 */
export interface ErrorHandlerConfig {
  /** Whether to continue running other plugins on error. */
  readonly isolatePlugins: boolean;
  /** Circuit breaker configuration. */
  readonly circuitBreaker: Partial<CircuitBreakerConfig>;
  /** Error callback for logging/monitoring. */
  readonly onError?: (error: PluginError) => void;
}

/**
 * Default error handler configuration.
 */
export const DEFAULT_ERROR_HANDLER_CONFIG: ErrorHandlerConfig = {
  isolatePlugins: true,
  circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
};

/**
 * Plugin error handler with circuit breaker support.
 *
 * Manages error tracking and circuit breakers for all plugins,
 * providing isolation between plugins so one failing plugin
 * doesn't affect others.
 */
export class PluginErrorHandler {
  /** Configuration. */
  private readonly config: ErrorHandlerConfig;

  /** Circuit breakers per plugin. */
  private readonly circuitBreakers = new Map<string, PluginCircuitBreaker>();

  /** Error history (most recent first). */
  private readonly errorHistory: PluginError[] = [];

  /** Maximum error history size. */
  private readonly maxHistorySize = 100;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_ERROR_HANDLER_CONFIG, ...config };
  }

  /**
   * Gets or creates a circuit breaker for a plugin.
   */
  getCircuitBreaker(pluginName: string): PluginCircuitBreaker {
    let breaker = this.circuitBreakers.get(pluginName);
    if (!breaker) {
      breaker = new PluginCircuitBreaker(pluginName, this.config.circuitBreaker);
      this.circuitBreakers.set(pluginName, breaker);
    }
    return breaker;
  }

  /**
   * Handles an error from a plugin.
   *
   * @param error - The plugin error
   * @returns Whether the error should prevent further execution
   */
  handleError(error: PluginError): boolean {
    // Add to history
    this.errorHistory.unshift(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.pop();
    }

    // Record failure in circuit breaker
    const breaker = this.getCircuitBreaker(error.pluginName);
    breaker.recordFailure(error);

    // Call error callback if configured
    this.config.onError?.(error);

    // Return whether to continue (based on isolation config)
    return this.config.isolatePlugins;
  }

  /**
   * Records a successful operation for a plugin.
   */
  recordSuccess(pluginName: string): void {
    const breaker = this.circuitBreakers.get(pluginName);
    breaker?.recordSuccess();
  }

  /**
   * Checks if a plugin is allowed to execute.
   */
  isPluginAllowed(pluginName: string): boolean {
    const breaker = this.circuitBreakers.get(pluginName);
    return !breaker || breaker.isAllowed();
  }

  /**
   * Gets recent errors for a plugin.
   */
  getPluginErrors(pluginName: string, limit = 10): readonly PluginError[] {
    return this.errorHistory
      .filter((e) => e.pluginName === pluginName)
      .slice(0, limit);
  }

  /**
   * Gets all recent errors.
   */
  getAllErrors(limit = 10): readonly PluginError[] {
    return this.errorHistory.slice(0, limit);
  }

  /**
   * Resets a plugin's circuit breaker.
   */
  resetPlugin(pluginName: string): void {
    const breaker = this.circuitBreakers.get(pluginName);
    breaker?.reset();
  }

  /**
   * Resets all circuit breakers and clears error history.
   */
  reset(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset();
    }
    this.errorHistory.length = 0;
  }

  /**
   * Cleans up all resources.
   */
  dispose(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.dispose();
    }
    this.circuitBreakers.clear();
    this.errorHistory.length = 0;
  }

  /**
   * Wraps an async function with error handling.
   *
   * @param pluginName - The plugin name
   * @param errorType - The type of error if one occurs
   * @param fn - The function to wrap
   * @param context - Additional error context
   * @returns The function result, or undefined if an error occurred
   */
  async wrap<T>(
    pluginName: string,
    errorType: PluginErrorType,
    fn: () => Promise<T>,
    context?: Record<string, unknown>,
  ): Promise<T | undefined> {
    // Check if plugin is allowed to run
    if (!this.isPluginAllowed(pluginName)) {
      return undefined;
    }

    try {
      const result = await fn();
      this.recordSuccess(pluginName);
      return result;
    } catch (error) {
      const pluginError = new PluginError(
        pluginName,
        error instanceof Error ? error.message : String(error),
        errorType,
        error instanceof Error ? error : undefined,
        context,
      );

      this.handleError(pluginError);
      return undefined;
    }
  }
}

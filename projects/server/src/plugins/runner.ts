/**
 * @squadscript/server
 *
 * Plugin Runner for executing plugin lifecycle with error isolation.
 *
 * Handles the execution of plugin lifecycle methods (prepareToMount, mount, unmount)
 * with proper error handling and state tracking.
 *
 * @module
 */

import type { PluginState, PluginContext, ResolvedOptions, OptionsSpecification } from '@squadscript/types';
import type { ModuleLogger } from '@squadscript/logger';
import type { BasePlugin } from './base-plugin.js';
import type { LoadedPlugin } from './loader.js';
import {
  PluginError,
  PluginErrorType,
  type PluginErrorHandler,
} from './error-handler.js';

/**
 * Plugin instance with runtime information.
 */
export interface PluginInstance {
  /** The plugin instance. */
  readonly plugin: BasePlugin;

  /** Loaded plugin information. */
  readonly loadedPlugin: LoadedPlugin;

  /** Current state. */
  state: PluginState;

  /** Error that caused the error state (if any). */
  error: Error | undefined;

  /** Timestamp of last state change. */
  lastStateChange: Date;
}

/**
 * Result of a lifecycle operation.
 */
export interface LifecycleResult {
  /** Whether the operation succeeded. */
  readonly success: boolean;

  /** Error if operation failed. */
  readonly error?: PluginError;

  /** Duration in milliseconds. */
  readonly durationMs: number;
}

/**
 * Plugin runner configuration.
 */
export interface PluginRunnerConfig {
  /** Logger instance. */
  readonly logger: ModuleLogger;

  /** Error handler for recording failures. */
  readonly errorHandler: PluginErrorHandler;

  /** Maximum time for mount operation in milliseconds (default: 30000). */
  readonly mountTimeout?: number;

  /** Maximum time for unmount operation in milliseconds (default: 10000). */
  readonly unmountTimeout?: number;
}

/**
 * Executes plugin lifecycle methods with error isolation.
 *
 * The runner:
 * - Creates plugin instances with proper context injection
 * - Executes lifecycle methods with timeouts
 * - Tracks plugin state through transitions
 * - Isolates errors to prevent cascade failures
 * - Records metrics for monitoring
 *
 * @example
 * ```typescript
 * const runner = new PluginRunner({
 *   logger,
 *   errorHandler,
 * });
 *
 * // Create and mount a plugin
 * const instance = await runner.create(loadedPlugin, context, options);
 * const result = await runner.mount(instance);
 *
 * if (result.success) {
 *   console.log(`Plugin mounted in ${result.durationMs}ms`);
 * } else {
 *   console.error('Mount failed:', result.error);
 * }
 *
 * // Later, unmount
 * await runner.unmount(instance);
 * ```
 */
export class PluginRunner {
  private readonly logger: ModuleLogger;
  private readonly errorHandler: PluginErrorHandler;
  private readonly mountTimeout: number;
  private readonly unmountTimeout: number;

  constructor(config: PluginRunnerConfig) {
    this.logger = config.logger;
    this.errorHandler = config.errorHandler;
    this.mountTimeout = config.mountTimeout ?? 30_000;
    this.unmountTimeout = config.unmountTimeout ?? 10_000;
  }

  /**
   * Creates a plugin instance.
   *
   * @param loadedPlugin - The loaded plugin class and metadata
   * @param context - The plugin context to inject
   * @param options - Resolved plugin options
   * @returns The plugin instance
   */
  create(
    loadedPlugin: LoadedPlugin,
    context: PluginContext,
    options: ResolvedOptions<OptionsSpecification>,
  ): PluginInstance {
    const { Class, meta } = loadedPlugin;

    this.logger.debug(`Creating plugin instance: ${meta.name}`);

    const plugin = new Class(context, options);

    return {
      plugin,
      loadedPlugin,
      state: 'unloaded',
      error: undefined,
      lastStateChange: new Date(),
    };
  }

  /**
   * Prepares a plugin for mounting.
   *
   * Calls the optional `prepareToMount()` lifecycle method.
   *
   * @param instance - The plugin instance
   * @returns Lifecycle result
   */
  async prepare(instance: PluginInstance): Promise<LifecycleResult> {
    const { plugin, loadedPlugin } = instance;
    const { meta } = loadedPlugin;

    if (instance.state !== 'unloaded') {
      return {
        success: false,
        error: new PluginError(
          meta.name,
          `Cannot prepare plugin in state: ${instance.state}`,
          PluginErrorType.LIFECYCLE,
        ),
        durationMs: 0,
      };
    }

    this.setState(instance, 'preparing');
    const startTime = performance.now();

    try {
      // Check if prepareToMount is implemented
      if (plugin.prepareToMount) {
        await this.withTimeout(
          plugin.prepareToMount(),
          this.mountTimeout,
          `${meta.name}.prepareToMount()`,
        );
      }

      const durationMs = performance.now() - startTime;
      this.logger.debug(`Prepared plugin: ${meta.name} (${durationMs.toFixed(1)}ms)`);
      this.errorHandler.recordSuccess(meta.name);

      return { success: true, durationMs };
    } catch (error) {
      const durationMs = performance.now() - startTime;
      const pluginError = PluginError.lifecycle(
        meta.name,
        'prepareToMount',
        error instanceof Error ? error : new Error(String(error)),
      );

      this.setState(instance, 'error', error instanceof Error ? error : new Error(String(error)));
      this.errorHandler.handleError(pluginError);

      return { success: false, error: pluginError, durationMs };
    }
  }

  /**
   * Mounts a plugin.
   *
   * Calls the `mount()` lifecycle method.
   *
   * @param instance - The plugin instance
   * @param skipPrepare - Skip prepare step if already done
   * @returns Lifecycle result
   */
  async mount(instance: PluginInstance, skipPrepare = false): Promise<LifecycleResult> {
    const { plugin, loadedPlugin } = instance;
    const { meta } = loadedPlugin;

    // Prepare if needed
    if (!skipPrepare && instance.state === 'unloaded') {
      const prepareResult = await this.prepare(instance);
      if (!prepareResult.success) {
        return prepareResult;
      }
    }

    // Validate state
    if (instance.state !== 'preparing' && instance.state !== 'unloaded') {
      return {
        success: false,
        error: new PluginError(
          meta.name,
          `Cannot mount plugin in state: ${instance.state}`,
          PluginErrorType.LIFECYCLE,
        ),
        durationMs: 0,
      };
    }

    this.setState(instance, 'mounting');
    const startTime = performance.now();

    try {
      await this.withTimeout(
        plugin.mount(),
        this.mountTimeout,
        `${meta.name}.mount()`,
      );

      this.setState(instance, 'mounted');
      const durationMs = performance.now() - startTime;
      this.logger.info(`Mounted plugin: ${meta.name} (${durationMs.toFixed(1)}ms)`);
      this.errorHandler.recordSuccess(meta.name);

      return { success: true, durationMs };
    } catch (error) {
      const durationMs = performance.now() - startTime;
      const pluginError = PluginError.lifecycle(
        meta.name,
        'mount',
        error instanceof Error ? error : new Error(String(error)),
      );

      this.setState(instance, 'error', error instanceof Error ? error : new Error(String(error)));
      this.errorHandler.handleError(pluginError);

      return { success: false, error: pluginError, durationMs };
    }
  }

  /**
   * Unmounts a plugin.
   *
   * Calls the `unmount()` lifecycle method.
   *
   * @param instance - The plugin instance
   * @returns Lifecycle result
   */
  async unmount(instance: PluginInstance): Promise<LifecycleResult> {
    const { plugin, loadedPlugin } = instance;
    const { meta } = loadedPlugin;

    // Allow unmounting from mounted or error states
    if (instance.state !== 'mounted' && instance.state !== 'error') {
      return {
        success: false,
        error: new PluginError(
          meta.name,
          `Cannot unmount plugin in state: ${instance.state}`,
          PluginErrorType.LIFECYCLE,
        ),
        durationMs: 0,
      };
    }

    this.setState(instance, 'unmounting');
    const startTime = performance.now();

    try {
      await this.withTimeout(
        plugin.unmount(),
        this.unmountTimeout,
        `${meta.name}.unmount()`,
      );

      this.setState(instance, 'unloaded');
      const durationMs = performance.now() - startTime;
      this.logger.info(`Unmounted plugin: ${meta.name} (${durationMs.toFixed(1)}ms)`);
      this.errorHandler.recordSuccess(meta.name);

      return { success: true, durationMs };
    } catch (error) {
      const durationMs = performance.now() - startTime;
      const pluginError = PluginError.lifecycle(
        meta.name,
        'unmount',
        error instanceof Error ? error : new Error(String(error)),
      );

      // Still mark as unloaded since we tried to clean up
      this.setState(instance, 'unloaded');
      this.errorHandler.handleError(pluginError);

      // Log warning but don't fail - unmount should always complete
      this.logger.warn(`Plugin ${meta.name} unmount had errors but completed`);

      return { success: false, error: pluginError, durationMs };
    }
  }

  /**
   * Executes a promise with a timeout.
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string,
  ): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Operation "${operation}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId!);
    }
  }

  /**
   * Sets the state of a plugin instance.
   */
  private setState(instance: PluginInstance, state: PluginState, error?: Error): void {
    instance.state = state;
    instance.error = error;
    instance.lastStateChange = new Date();

    // Also update the plugin's internal state
    instance.plugin._setState(state, error);
  }
}

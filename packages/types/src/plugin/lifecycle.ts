/**
 * @squadscript/types
 *
 * Plugin lifecycle interface.
 *
 * @module
 */

/**
 * Plugin lifecycle hooks.
 *
 * Plugins go through the following lifecycle:
 * 1. constructor - Dependency injection
 * 2. prepareToMount - Async initialization (optional)
 * 3. mount - Subscribe to events, start timers
 * 4. [running] - Plugin is active
 * 5. unmount - Cleanup resources, unsubscribe
 */
export interface PluginLifecycle {
  /**
   * Called before mount to allow async initialization.
   *
   * Use this for:
   * - Loading external data
   * - Connecting to databases
   * - Validating configuration
   *
   * @returns Promise that resolves when initialization is complete
   */
  prepareToMount?(): Promise<void>;

  /**
   * Called when the plugin should activate.
   *
   * Use this for:
   * - Subscribing to events
   * - Starting intervals/timers
   * - Registering commands
   */
  mount(): Promise<void>;

  /**
   * Called when the plugin should deactivate.
   *
   * Use this for:
   * - Unsubscribing from events
   * - Clearing intervals/timers
   * - Closing connections
   * - Cleaning up resources
   */
  unmount(): Promise<void>;
}

/**
 * Plugin metadata.
 */
export interface PluginMeta {
  /** Unique plugin name. */
  readonly name: string;

  /** Plugin description. */
  readonly description: string;

  /** Plugin version (semver). */
  readonly version: string;

  /** Whether the plugin is enabled by default. */
  readonly defaultEnabled: boolean;

  /** Plugin author. */
  readonly author?: string;

  /** Plugin homepage/repository URL. */
  readonly url?: string;

  /** Plugin dependencies (other plugin names). */
  readonly dependencies?: readonly string[];
}

/**
 * Plugin state.
 */
export type PluginState =
  | 'unloaded'
  | 'preparing'
  | 'mounting'
  | 'mounted'
  | 'unmounting'
  | 'error';

/**
 * @squadscript/server
 *
 * Base Plugin abstract class.
 *
 * All SquadScript plugins should extend this class. It provides:
 * - Type-safe event subscriptions with automatic cleanup
 * - Convenience methods for common operations
 * - Lifecycle management (mount/unmount)
 * - Access to server state and RCON commands
 *
 * @module
 */

import type {
  PluginLifecycle,
  PluginMeta,
  PluginState,
  PluginContext,
  PluginLogger,
  PluginEventEmitter,
  PluginRconExecutor,
  ServerStateReader,
  OptionsSpecification,
  ResolvedOptions,
  Unsubscribe,
  SquadEventMap,
} from '@squadscript/types';
import { SubscriptionManager } from './subscription-manager.js';

/**
 * Extended plugin context with Squad event types.
 * 
 * Note: We use `Record<string, unknown>` to satisfy the generic constraint
 * while still maintaining type safety through the actual SquadEventMap usage.
 */
export type SquadPluginContext = PluginContext<Record<string, unknown>>;

/**
 * Abstract base class for SquadScript plugins.
 *
 * This class provides a foundation for building plugins with:
 * - Automatic resource cleanup on unmount
 * - Type-safe event subscriptions
 * - Convenience methods for common patterns
 * - Access to server state and RCON
 *
 * Plugins must implement:
 * - `static readonly meta`: Plugin metadata
 * - `static readonly optionsSpec`: Options specification (can be empty `{}`)
 * - `mount()`: Subscribe to events and start timers
 * - `unmount()`: Optional cleanup (base class handles most cleanup)
 *
 * @typeParam TOptions - The resolved options type
 *
 * @example
 * ```typescript
 * const optionsSpec = {
 *   message: { type: 'string', required: true, description: 'Warning message' },
 *   threshold: { type: 'number', required: false, default: 3, description: 'TK threshold' },
 * } as const;
 *
 * class AutoTKWarn extends BasePlugin<typeof optionsSpec> {
 *   static readonly meta: PluginMeta = {
 *     name: 'AutoTKWarn',
 *     description: 'Warns players who teamkill',
 *     version: '1.0.0',
 *     defaultEnabled: true,
 *   };
 *
 *   static readonly optionsSpec = optionsSpec;
 *
 *   async mount() {
 *     this.on('PLAYER_DIED', async (event) => {
 *       if (event.teamkill && event.attacker) {
 *         await this.rcon.warn(event.attacker.steamID, this.options.message);
 *       }
 *     });
 *   }
 * }
 * ```
 */
export abstract class BasePlugin<
  TOptionsSpec extends OptionsSpecification = OptionsSpecification,
> implements PluginLifecycle {
  /**
   * Plugin metadata (must be overridden by subclass).
   */
  static readonly meta: PluginMeta;

  /**
   * Plugin options specification (must be overridden by subclass).
   */
  static readonly optionsSpec: OptionsSpecification;

  /**
   * The plugin context providing access to events, RCON, and state.
   */
  protected readonly context: SquadPluginContext;

  /**
   * Resolved plugin options.
   */
  protected readonly options: ResolvedOptions<TOptionsSpec>;

  /**
   * Scoped logger for this plugin.
   */
  protected readonly log: PluginLogger;

  /**
   * Subscription manager for automatic cleanup.
   */
  private readonly subscriptions: SubscriptionManager;

  /**
   * Current plugin state.
   */
  private _state: PluginState = 'unloaded';

  /**
   * Error that caused the plugin to enter error state.
   */
  private _error: Error | undefined;

  /**
   * Creates a new plugin instance.
   *
   * @param context - The plugin context
   * @param options - Resolved plugin options
   */
  constructor(context: SquadPluginContext, options: ResolvedOptions<TOptionsSpec>) {
    this.context = context;
    this.options = options;
    this.log = context.log;
    this.subscriptions = new SubscriptionManager();
  }

  // ===========================================================================
  // State
  // ===========================================================================

  /**
   * Gets the current plugin state.
   */
  get state(): PluginState {
    return this._state;
  }

  /**
   * Gets the error that caused the error state (if any).
   */
  get error(): Error | undefined {
    return this._error;
  }

  /**
   * Whether the plugin is mounted and running.
   */
  get isRunning(): boolean {
    return this._state === 'mounted';
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Optional async initialization before mount.
   *
   * Override this to perform async setup like:
   * - Loading data from files or APIs
   * - Connecting to external services
   * - Validating configuration
   *
   * @example
   * ```typescript
   * async prepareToMount() {
   *   this.log.info('Loading data...');
   *   this.data = await loadDataFromFile();
   * }
   * ```
   */
  async prepareToMount(): Promise<void> {
    // Default: no preparation needed
  }

  /**
   * Called when the plugin should activate.
   *
   * Override this to:
   * - Subscribe to server events
   * - Start intervals/timers
   * - Register commands
   *
   * Use the convenience methods `on()`, `setInterval()`, `setTimeout()`
   * for automatic cleanup on unmount.
   *
   * @example
   * ```typescript
   * async mount() {
   *   // Subscribe to events (auto-cleaned up on unmount)
   *   this.on('CHAT_MESSAGE', this.handleChat);
   *
   *   // Start interval (auto-cleaned up on unmount)
   *   this.setInterval(() => this.checkPlayers(), 30000, 'player-check');
   *
   *   this.log.info('Plugin mounted');
   * }
   * ```
   */
  abstract mount(): Promise<void>;

  /**
   * Called when the plugin should deactivate.
   *
   * The base class automatically cleans up:
   * - Event subscriptions (via `on()`)
   * - Intervals (via `setInterval()`)
   * - Timeouts (via `setTimeout()`)
   *
   * Override this only if you need additional cleanup:
   * - Closing file handles
   * - Disconnecting from external services
   * - Saving state
   *
   * Always call `super.unmount()` at the end if you override.
   *
   * @example
   * ```typescript
   * async unmount() {
   *   // Custom cleanup
   *   await this.saveState();
   *   this.fileHandle.close();
   *
   *   // Base class cleanup
   *   await super.unmount();
   * }
   * ```
   */
  async unmount(): Promise<void> {
    // Clean up all tracked resources
    const counts = this.subscriptions.cleanup();

    if (counts.subscriptions + counts.intervals + counts.timeouts > 0) {
      this.log.debug('Cleaned up resources', counts);
    }
  }

  // ===========================================================================
  // State Management (Internal)
  // ===========================================================================

  /**
   * Sets the plugin state.
   *
   * @internal
   */
  _setState(state: PluginState, error?: Error): void {
    this._state = state;
    this._error = error;
  }

  // ===========================================================================
  // Convenience Methods - Events
  // ===========================================================================

  /**
   * Shorthand for accessing the event emitter.
   */
  protected get events(): PluginEventEmitter<Record<string, unknown>> {
    return this.context.events;
  }

  /**
   * Shorthand for accessing RCON commands.
   */
  protected get rcon(): PluginRconExecutor {
    return this.context.rcon;
  }

  /**
   * Shorthand for accessing server state.
   */
  protected get server(): ServerStateReader {
    return this.context.state;
  }

  /**
   * Subscribes to a server event with automatic cleanup.
   *
   * The subscription is automatically removed when the plugin unmounts.
   * This prevents memory leaks and is the recommended way to subscribe
   * to events in plugins.
   *
   * @param event - The event type to listen for
   * @param handler - Callback to invoke when event is emitted
   * @returns Unsubscribe function (rarely needed - cleanup is automatic)
   *
   * @example
   * ```typescript
   * async mount() {
   *   this.on('PLAYER_CONNECTED', (event) => {
   *     this.log.info(`Player connected: ${event.player.name}`);
   *   });
   *
   *   this.on('CHAT_MESSAGE', async (event) => {
   *     if (event.message.startsWith('!help')) {
   *       await this.rcon.warn(event.steamID, 'Available commands: !help, !rules');
   *     }
   *   });
   * }
   * ```
   */
  protected on<K extends keyof SquadEventMap & string>(
    event: K,
    handler: (data: SquadEventMap[K]) => void | Promise<void>,
  ): Unsubscribe {
    // Cast handler to satisfy generic context.events type
    const unsubscribe = this.context.events.on(event, handler as (data: unknown) => void | Promise<void>);
    return this.subscriptions.trackSubscription(unsubscribe);
  }

  /**
   * Subscribes to a one-time server event with automatic cleanup.
   *
   * The subscription is automatically removed after the first event
   * or when the plugin unmounts, whichever comes first.
   *
   * @param event - The event type to listen for
   * @param handler - Callback to invoke when event is emitted
   * @returns Unsubscribe function (rarely needed)
   *
   * @example
   * ```typescript
   * async mount() {
   *   this.once('NEW_GAME', (event) => {
   *     this.log.info(`First game started on ${event.layerName}`);
   *   });
   * }
   * ```
   */
  protected once<K extends keyof SquadEventMap & string>(
    event: K,
    handler: (data: SquadEventMap[K]) => void | Promise<void>,
  ): Unsubscribe {
    // Cast handler to satisfy generic context.events type
    const unsubscribe = this.context.events.once(event, handler as (data: unknown) => void | Promise<void>);
    return this.subscriptions.trackSubscription(unsubscribe);
  }

  /**
   * Waits for a specific event to occur.
   *
   * @param event - The event type to wait for
   * @param options - Optional timeout and abort signal
   * @returns Promise resolving to the event data
   *
   * @example
   * ```typescript
   * async mount() {
   *   // Wait for next game to start (with timeout)
   *   try {
   *     const event = await this.waitFor('NEW_GAME', { timeout: 60000 });
   *     this.log.info(`Game started: ${event.layerName}`);
   *   } catch (error) {
   *     this.log.warn('Timed out waiting for game');
   *   }
   * }
   * ```
   */
  protected waitFor<K extends keyof SquadEventMap & string>(
    event: K,
    options?: { signal?: AbortSignal; timeout?: number },
  ): Promise<SquadEventMap[K]> {
    // Cast the return type since context.events uses generic Record<string, unknown>
    return this.context.events.waitFor(event, options) as Promise<SquadEventMap[K]>;
  }

  // ===========================================================================
  // Convenience Methods - Timers
  // ===========================================================================

  /**
   * Creates an interval with automatic cleanup.
   *
   * The interval is automatically cleared when the plugin unmounts.
   * This prevents memory leaks and orphaned timers.
   *
   * @param callback - Function to call on each interval
   * @param ms - Interval duration in milliseconds
   * @param label - Optional label for debugging
   * @returns Function to clear the interval early
   *
   * @example
   * ```typescript
   * async mount() {
   *   // Refresh data every 30 seconds
   *   this.setInterval(() => this.refreshData(), 30000, 'data-refresh');
   *
   *   // Check player count every minute
   *   this.setInterval(
   *     async () => {
   *       if (this.server.playerCount > 50) {
   *         await this.rcon.broadcast('Server is getting full!');
   *       }
   *     },
   *     60000,
   *     'player-count-check'
   *   );
   * }
   * ```
   */
  protected setInterval(
    callback: () => void | Promise<void>,
    ms: number,
    label?: string,
  ): () => void {
    return this.subscriptions.setInterval(callback, ms, label);
  }

  /**
   * Creates a timeout with automatic cleanup.
   *
   * The timeout is automatically cleared when the plugin unmounts.
   * This prevents memory leaks and orphaned timers.
   *
   * @param callback - Function to call when timeout fires
   * @param ms - Timeout duration in milliseconds
   * @param label - Optional label for debugging
   * @returns Function to clear the timeout early
   *
   * @example
   * ```typescript
   * async mount() {
   *   // Delayed action
   *   this.setTimeout(() => {
   *     this.log.info('Startup complete');
   *   }, 5000, 'startup-delay');
   * }
   * ```
   */
  protected setTimeout(
    callback: () => void | Promise<void>,
    ms: number,
    label?: string,
  ): () => void {
    return this.subscriptions.setTimeout(callback, ms, label);
  }

  // ===========================================================================
  // Convenience Methods - Connectors
  // ===========================================================================

  /**
   * Gets a connector by name.
   *
   * @param name - The connector name
   * @returns The connector instance or undefined
   *
   * @example
   * ```typescript
   * async mount() {
   *   const discord = this.getConnector<DiscordConnector>('discord');
   *   if (discord) {
   *     await discord.sendMessage(this.options.channelId, 'Server started!');
   *   }
   * }
   * ```
   */
  protected getConnector<T>(name: string): T | undefined {
    return this.context.getConnector<T>(name);
  }

  // ===========================================================================
  // Debugging
  // ===========================================================================

  /**
   * Gets the number of active subscriptions.
   *
   * Useful for debugging and testing.
   */
  get activeSubscriptionCount(): number {
    return this.subscriptions.subscriptionCount;
  }

  /**
   * Gets the number of active intervals.
   */
  get activeIntervalCount(): number {
    return this.subscriptions.intervalCount;
  }

  /**
   * Gets the number of active timeouts.
   */
  get activeTimeoutCount(): number {
    return this.subscriptions.timeoutCount;
  }

  /**
   * Gets the total count of all active resources.
   */
  get activeResourceCount(): number {
    return this.subscriptions.totalCount;
  }
}

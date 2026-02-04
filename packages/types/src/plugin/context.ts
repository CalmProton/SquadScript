/**
 * @squadscript/types
 *
 * Plugin context interface.
 *
 * The PluginContext is the primary interface through which plugins interact
 * with the server. It provides type-safe access to events, RCON commands,
 * server state, and connectors.
 *
 * @module
 */

import type { Player, Squad, Layer, EOSID, SteamID } from '../index.js';

/**
 * Unsubscribe function returned when subscribing to events.
 *
 * Call this function to remove the event listener and prevent memory leaks.
 *
 * @example
 * ```typescript
 * const unsubscribe = context.events.on('PLAYER_CONNECTED', handler);
 *
 * // Later, when cleaning up:
 * unsubscribe();
 * ```
 */
export type Unsubscribe = () => void;

/**
 * Event handler function type.
 */
export type EventHandler<T> = (data: T) => void | Promise<void>;

/**
 * Type-safe event emitter interface for plugins.
 *
 * This interface abstracts the event system, allowing plugins to subscribe
 * to server events without direct coupling to the implementation.
 *
 * @typeParam TEventMap - Map of event names to their payload types
 */
export interface PluginEventEmitter<TEventMap extends Record<string, unknown>> {
  /**
   * Registers an event listener.
   *
   * @param event - The event name to listen for
   * @param handler - Callback to invoke when event is emitted
   * @returns Unsubscribe function to remove the listener
   *
   * @example
   * ```typescript
   * const unsubscribe = events.on('CHAT_MESSAGE', (event) => {
   *   console.log(`${event.playerName}: ${event.message}`);
   * });
   * ```
   */
  on<K extends keyof TEventMap & string>(
    event: K,
    handler: EventHandler<TEventMap[K]>,
  ): Unsubscribe;

  /**
   * Registers a one-time event listener.
   *
   * The listener will be automatically removed after the first invocation.
   *
   * @param event - The event name to listen for
   * @param handler - Callback to invoke when event is emitted
   * @returns Unsubscribe function to remove the listener (if needed before firing)
   */
  once<K extends keyof TEventMap & string>(
    event: K,
    handler: EventHandler<TEventMap[K]>,
  ): Unsubscribe;

  /**
   * Waits for an event to be emitted.
   *
   * @param event - The event name to wait for
   * @param options - Optional timeout and abort signal
   * @returns Promise resolving to the event data
   *
   * @example
   * ```typescript
   * const event = await events.waitFor('NEW_GAME', { timeout: 60000 });
   * console.log(`New game started on ${event.layerName}`);
   * ```
   */
  waitFor<K extends keyof TEventMap & string>(
    event: K,
    options?: { signal?: AbortSignal; timeout?: number },
  ): Promise<TEventMap[K]>;
}

/**
 * RCON command executor interface.
 *
 * Provides type-safe access to RCON commands without exposing
 * the underlying connection details.
 */
export interface PluginRconExecutor {
  /**
   * Sends a raw RCON command.
   *
   * @param command - The command to execute
   * @returns Promise resolving to the command response
   */
  execute(command: string): Promise<string>;

  /**
   * Broadcasts a message to all players.
   *
   * @param message - The message to broadcast
   */
  broadcast(message: string): Promise<void>;

  /**
   * Warns a player with a message.
   *
   * @param target - Player identifier (Steam ID, EOS ID, or name)
   * @param message - The warning message
   */
  warn(target: string, message: string): Promise<void>;

  /**
   * Kicks a player from the server.
   *
   * @param target - Player identifier (Steam ID, EOS ID, or name)
   * @param reason - The kick reason
   */
  kick(target: string, reason: string): Promise<void>;

  /**
   * Bans a player from the server.
   *
   * @param target - Player identifier (Steam ID, EOS ID, or name)
   * @param duration - Ban duration string (e.g., "1d", "1w", "perm")
   * @param reason - The ban reason
   */
  ban(target: string, duration: string, reason: string): Promise<void>;
}

/**
 * Read-only view of server state.
 *
 * Plugins receive a read-only view of server state to prevent
 * accidental corruption of the state.
 */
export interface ServerStateReader {
  /** All connected players. */
  readonly players: ReadonlyMap<EOSID, Player>;

  /** All squads on the server. */
  readonly squads: ReadonlyMap<string, Squad>;

  /** Current layer being played. */
  readonly currentLayer: Layer | null;

  /** Next layer in rotation. */
  readonly nextLayer: Layer | null;

  /** Current player count. */
  readonly playerCount: number;

  /**
   * Gets a player by their EOS ID.
   *
   * @param eosID - The player's EOS ID
   * @returns The player or undefined if not found
   */
  getPlayerByEOSID(eosID: EOSID): Player | undefined;

  /**
   * Gets a player by their Steam ID.
   *
   * @param steamID - The player's Steam ID
   * @returns The player or undefined if not found
   */
  getPlayerBySteamID(steamID: SteamID): Player | undefined;

  /**
   * Gets a player by their in-game player ID.
   *
   * @param playerID - The in-game player ID (0-100)
   * @returns The player or undefined if not found
   */
  getPlayerByID(playerID: number): Player | undefined;

  /**
   * Gets a player by name (case-insensitive partial match).
   *
   * @param name - The player name to search for
   * @returns Array of matching players
   */
  getPlayersByName(name: string): readonly Player[];

  /**
   * Gets all squads for a team.
   *
   * @param teamID - The team ID (1 or 2)
   * @returns Array of squads on that team
   */
  getSquadsByTeam(teamID: number): readonly Squad[];
}

/**
 * Scoped logger interface for plugins.
 *
 * Each plugin receives a logger that automatically prefixes
 * log messages with the plugin name.
 */
export interface PluginLogger {
  /**
   * Logs a trace-level message (most verbose).
   */
  trace(message: string, data?: unknown): void;

  /**
   * Logs a debug-level message.
   */
  debug(message: string, data?: unknown): void;

  /**
   * Logs a verbose-level message.
   */
  verbose(message: string, data?: unknown): void;

  /**
   * Logs an info-level message.
   */
  info(message: string, data?: unknown): void;

  /**
   * Logs a warning-level message.
   */
  warn(message: string, data?: unknown): void;

  /**
   * Logs an error-level message.
   *
   * @param message - The error message
   * @param error - Optional Error object with stack trace
   * @param data - Optional additional data
   */
  error(message: string, error?: Error, data?: unknown): void;
}

/**
 * The main plugin context interface.
 *
 * This interface is injected into every plugin and provides access to
 * all server functionality that plugins need.
 *
 * Key design principles:
 * - Decoupled from concrete implementations (testable)
 * - Read-only state access (prevents corruption)
 * - Type-safe event subscriptions
 * - Scoped logging
 *
 * @typeParam TEventMap - Map of event names to their payload types
 *
 * @example
 * ```typescript
 * class MyPlugin extends BasePlugin {
 *   async mount() {
 *     // Subscribe to events
 *     this.on('CHAT_MESSAGE', async (event) => {
 *       if (event.message.startsWith('!hello')) {
 *         await this.context.rcon.warn(event.steamID, 'Hello!');
 *       }
 *     });
 *
 *     // Access server state
 *     const playerCount = this.context.state.playerCount;
 *     this.log.info(`Server has ${playerCount} players`);
 *   }
 * }
 * ```
 */
export interface PluginContext<
  TEventMap extends Record<string, unknown> = Record<string, unknown>,
> {
  /**
   * Type-safe event emitter for subscribing to server events.
   */
  readonly events: PluginEventEmitter<TEventMap>;

  /**
   * RCON command executor.
   */
  readonly rcon: PluginRconExecutor;

  /**
   * Read-only view of server state.
   */
  readonly state: ServerStateReader;

  /**
   * Scoped logger for this plugin.
   */
  readonly log: PluginLogger;

  /**
   * Gets a connector by name.
   *
   * Connectors are shared resources like Discord clients or database
   * connections that can be used by multiple plugins.
   *
   * @param name - The connector name
   * @returns The connector instance or undefined if not registered
   *
   * @example
   * ```typescript
   * const discord = this.context.getConnector<DiscordConnector>('discord');
   * if (discord) {
   *   await discord.sendMessage(channelId, 'Server is starting!');
   * }
   * ```
   */
  getConnector<T>(name: string): T | undefined;
}

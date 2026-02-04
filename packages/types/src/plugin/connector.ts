/**
 * @squadscript/types
 *
 * Connector interfaces.
 *
 * Connectors are shared resources that can be used by multiple plugins,
 * such as Discord clients, database connections, or external APIs.
 *
 * @module
 */

/**
 * Base connector interface.
 *
 * All connectors must implement this interface to ensure consistent
 * lifecycle management across different connector types.
 */
export interface Connector {
  /**
   * Unique name identifying this connector.
   *
   * Used to look up the connector via `context.getConnector(name)`.
   */
  readonly name: string;

  /**
   * Whether the connector is currently connected/ready.
   */
  readonly isConnected: boolean;

  /**
   * Initializes and connects the connector.
   *
   * @returns Promise that resolves when connected
   */
  connect(): Promise<void>;

  /**
   * Disconnects and cleans up the connector.
   *
   * @returns Promise that resolves when disconnected
   */
  disconnect(): Promise<void>;
}

/**
 * Discord message options.
 */
export interface DiscordMessageOptions {
  /** Message content. */
  readonly content?: string;
  /** Embed data (simplified). */
  readonly embed?: {
    readonly title?: string;
    readonly description?: string;
    readonly color?: number;
    readonly fields?: readonly {
      readonly name: string;
      readonly value: string;
      readonly inline?: boolean;
    }[];
    readonly footer?: { readonly text: string };
    readonly timestamp?: string;
  };
}

/**
 * Discord connector interface.
 *
 * Provides a simplified interface for interacting with Discord.
 * The actual implementation will use discord.js or a similar library.
 */
export interface DiscordConnector extends Connector {
  /**
   * Sends a message to a Discord channel.
   *
   * @param channelId - The Discord channel ID
   * @param message - The message content or options
   * @returns Promise that resolves when sent
   */
  sendMessage(
    channelId: string,
    message: string | DiscordMessageOptions,
  ): Promise<void>;

  /**
   * Gets a channel by ID.
   *
   * @param channelId - The Discord channel ID
   * @returns The channel or undefined if not found
   */
  getChannel(channelId: string): unknown | undefined;

  /**
   * Registers a handler for Discord messages.
   *
   * @param handler - Callback for incoming messages
   * @returns Unsubscribe function
   */
  onMessage(
    handler: (message: {
      channelId: string;
      authorId: string;
      authorName: string;
      content: string;
    }) => void,
  ): () => void;
}

/**
 * Database query result.
 */
export interface DatabaseQueryResult<T = unknown> {
  /** The result rows. */
  readonly rows: readonly T[];
  /** Number of affected rows (for INSERT/UPDATE/DELETE). */
  readonly affectedRows?: number;
}

/**
 * Database connector interface.
 *
 * Provides a generic interface for database operations.
 * Can be implemented with various ORMs (Drizzle, Prisma, etc.)
 * or raw database clients.
 */
export interface DatabaseConnector extends Connector {
  /**
   * Executes a SQL query.
   *
   * @param sql - The SQL query string
   * @param params - Query parameters
   * @returns Query result
   */
  query<T = unknown>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<DatabaseQueryResult<T>>;

  /**
   * Executes a query and returns the first result.
   *
   * @param sql - The SQL query string
   * @param params - Query parameters
   * @returns First result or undefined
   */
  queryOne<T = unknown>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<T | undefined>;

  /**
   * Executes multiple statements in a transaction.
   *
   * @param fn - Function containing transaction operations
   * @returns Promise resolving to the function's return value
   */
  transaction<T>(fn: (tx: DatabaseConnector) => Promise<T>): Promise<T>;
}

/**
 * Configuration for connector.
 */
export interface ConnectorConfig {
  /**
   * Connector type identifier.
   *
   * @example 'discord', 'mysql', 'postgres'
   */
  readonly type: string;

  /**
   * Unique connector name.
   */
  readonly name: string;

  /**
   * Connector-specific options.
   */
  readonly options: Record<string, unknown>;
}

/**
 * @squadscript/server
 *
 * Connector Registry for managing shared connector instances.
 *
 * Connectors are shared resources (Discord clients, database connections, etc.)
 * that can be used by multiple plugins. This registry manages their lifecycle.
 *
 * @module
 */

import type { Connector } from '@squadscript/types';
import type { ModuleLogger } from '@squadscript/logger';

/**
 * Connector configuration for the registry.
 * 
 * This is more specific than the generic config type.
 */
export interface ConnectorConfig {
  /** Connector type identifier (e.g., 'discord', 'mysql'). */
  readonly type: string;

  /** Unique connector name. */
  readonly name: string;

  /** Connector-specific options. */
  readonly options: Record<string, unknown>;
}

/**
 * Connector factory function type.
 */
export type ConnectorFactory<T extends Connector = Connector> = (
  config: ConnectorConfig,
  logger: ModuleLogger,
) => Promise<T>;

/**
 * Registered connector with its factory.
 */
interface RegisteredConnector {
  /** The connector instance (created lazily). */
  instance: Connector | undefined;

  /** The connector configuration. */
  config: ConnectorConfig;

  /** Whether the connector has been initialized. */
  initialized: boolean;

  /** Error that occurred during initialization. */
  error?: Error;
}

/**
 * Connector registry configuration.
 */
export interface ConnectorRegistryConfig {
  /** Logger instance. */
  readonly logger: ModuleLogger;
}

/**
 * Registry for managing shared connector instances.
 *
 * Features:
 * - Lazy initialization (connectors created when first requested)
 * - Factory-based connector creation
 * - Graceful shutdown of all connectors
 * - Error isolation between connectors
 *
 * @example
 * ```typescript
 * const registry = new ConnectorRegistry({ logger });
 *
 * // Register connector factories
 * registry.registerFactory('discord', createDiscordConnector);
 * registry.registerFactory('database', createDatabaseConnector);
 *
 * // Add connector configurations
 * registry.add({
 *   type: 'discord',
 *   name: 'main-discord',
 *   options: { token: 'xxx' },
 * });
 *
 * // Get connector (initializes on first access)
 * const discord = await registry.get<DiscordConnector>('main-discord');
 *
 * // Shutdown all connectors
 * await registry.disconnectAll();
 * ```
 */
export class ConnectorRegistry {
  private readonly logger: ModuleLogger;

  /** Registered connector factories by type. */
  private readonly factories = new Map<string, ConnectorFactory>();

  /** Registered connectors by name. */
  private readonly connectors = new Map<string, RegisteredConnector>();

  constructor(config: ConnectorRegistryConfig) {
    this.logger = config.logger;
  }

  /**
   * Registers a connector factory for a connector type.
   *
   * @param type - The connector type identifier (e.g., 'discord', 'mysql')
   * @param factory - Factory function to create connector instances
   */
  registerFactory<T extends Connector>(
    type: string,
    factory: ConnectorFactory<T>,
  ): void {
    if (this.factories.has(type)) {
      this.logger.warn(`Overwriting existing connector factory for type: ${type}`);
    }

    this.factories.set(type, factory as ConnectorFactory);
    this.logger.debug(`Registered connector factory: ${type}`);
  }

  /**
   * Adds a connector configuration.
   *
   * The connector will be created lazily when first requested.
   *
   * @param config - Connector configuration
   */
  add(config: ConnectorConfig): void {
    if (this.connectors.has(config.name)) {
      throw new Error(`Connector with name "${config.name}" already exists`);
    }

    if (!this.factories.has(config.type)) {
      throw new Error(
        `No factory registered for connector type "${config.type}". ` +
          `Available types: ${Array.from(this.factories.keys()).join(', ') || 'none'}`,
      );
    }

    this.connectors.set(config.name, {
      config,
      instance: undefined,
      initialized: false,
    });

    this.logger.debug(`Added connector: ${config.name} (type: ${config.type})`);
  }

  /**
   * Registers a pre-created connector instance.
   *
   * Use this when you want to manage connector lifecycle externally.
   *
   * @param name - The connector name
   * @param connector - The connector instance
   */
  register(name: string, connector: Connector): void {
    if (this.connectors.has(name)) {
      throw new Error(`Connector with name "${name}" already exists`);
    }

    this.connectors.set(name, {
      config: {
        type: 'external',
        name,
        options: {},
      },
      instance: connector,
      initialized: true,
    });

    this.logger.debug(`Registered external connector: ${name}`);
  }

  /**
   * Gets a connector by name.
   *
   * If the connector hasn't been initialized yet, it will be created
   * and connected before returning.
   *
   * @param name - The connector name
   * @returns The connector instance or undefined if not found/failed
   */
  async get<T extends Connector>(name: string): Promise<T | undefined> {
    const registered = this.connectors.get(name);
    if (!registered) {
      return undefined;
    }

    // Return cached instance if already initialized
    if (registered.initialized) {
      return registered.instance as T | undefined;
    }

    // Check for previous initialization error
    if (registered.error) {
      this.logger.warn(`Connector "${name}" previously failed to initialize`);
      return undefined;
    }

    // Initialize the connector
    try {
      registered.instance = await this.createAndConnect(registered.config);
      registered.initialized = true;
      return registered.instance as T;
    } catch (error) {
      registered.error = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to initialize connector "${name}":`,
        registered.error,
      );
      return undefined;
    }
  }

  /**
   * Gets a connector synchronously (must already be initialized).
   *
   * @param name - The connector name
   * @returns The connector instance or undefined
   */
  getSync<T extends Connector>(name: string): T | undefined {
    const registered = this.connectors.get(name);
    if (!registered || !registered.initialized) {
      return undefined;
    }
    return registered.instance as T | undefined;
  }

  /**
   * Checks if a connector exists.
   *
   * @param name - The connector name
   * @returns True if the connector is registered
   */
  has(name: string): boolean {
    return this.connectors.has(name);
  }

  /**
   * Checks if a connector is initialized and connected.
   *
   * @param name - The connector name
   * @returns True if the connector is ready
   */
  isConnected(name: string): boolean {
    const registered = this.connectors.get(name);
    return Boolean(registered?.initialized && registered.instance?.isConnected === true);
  }

  /**
   * Gets all connector names.
   */
  get names(): readonly string[] {
    return Array.from(this.connectors.keys());
  }

  /**
   * Gets all initialized connectors.
   */
  getAll(): ReadonlyMap<string, Connector> {
    const result = new Map<string, Connector>();
    for (const [name, registered] of this.connectors) {
      if (registered.initialized && registered.instance) {
        result.set(name, registered.instance);
      }
    }
    return result;
  }

  /**
   * Initializes all registered connectors.
   *
   * @returns Object with counts of successful and failed initializations
   */
  async connectAll(): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const name of this.connectors.keys()) {
      const connector = await this.get(name);
      if (connector) {
        success++;
      } else {
        failed++;
      }
    }

    this.logger.info(`Initialized connectors: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  /**
   * Disconnects all initialized connectors.
   */
  async disconnectAll(): Promise<void> {
    const errors: Error[] = [];

    for (const [name, registered] of this.connectors) {
      if (registered.initialized && registered.instance) {
        try {
          this.logger.debug(`Disconnecting connector: ${name}`);
          await registered.instance.disconnect();
          registered.initialized = false;
          registered.instance = undefined;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          errors.push(err);
          this.logger.error(`Failed to disconnect connector "${name}":`, err);
        }
      }
    }

    if (errors.length > 0) {
      this.logger.warn(`${errors.length} connector(s) had errors during disconnect`);
    } else {
      this.logger.info('All connectors disconnected');
    }
  }

  /**
   * Removes a connector.
   *
   * If the connector is connected, it will be disconnected first.
   *
   * @param name - The connector name
   */
  async remove(name: string): Promise<void> {
    const registered = this.connectors.get(name);
    if (!registered) {
      return;
    }

    if (registered.initialized && registered.instance) {
      try {
        await registered.instance.disconnect();
      } catch (error) {
        this.logger.warn(`Error disconnecting connector "${name}" during removal`);
      }
    }

    this.connectors.delete(name);
    this.logger.debug(`Removed connector: ${name}`);
  }

  /**
   * Creates and connects a connector from configuration.
   */
  private async createAndConnect(config: ConnectorConfig): Promise<Connector> {
    const factory = this.factories.get(config.type);
    if (!factory) {
      throw new Error(`No factory for connector type: ${config.type}`);
    }

    const connectorLogger = this.logger.child(config.name);

    this.logger.debug(`Creating connector: ${config.name}`);
    const connector = await factory(config, connectorLogger);

    this.logger.debug(`Connecting: ${config.name}`);
    await connector.connect();

    this.logger.info(`Connected: ${config.name}`);
    return connector;
  }
}

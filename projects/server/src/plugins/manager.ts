/**
 * @squadscript/server
 *
 * Plugin Manager - the main orchestrator for the plugin system.
 *
 * Coordinates plugin loading, dependency resolution, lifecycle management,
 * and provides the plugin context to each plugin instance.
 *
 * @module
 */

import type {
  PluginContext,
  PluginMeta,
  PluginLogger,
  PluginEventEmitter,
  PluginRconExecutor,
  ServerStateReader,
  Unsubscribe,
  OptionsSpecification,
  ResolvedOptions,
  Connector,
  SquadEventMap,
} from '@squadscript/types';
import type { Logger, ModuleLogger } from '@squadscript/logger';
import { PluginLoader, type LoadedPlugin, type PluginClass } from './loader.js';
import { PluginRunner, type PluginInstance, type LifecycleResult } from './runner.js';
import { OptionsResolver, OptionsValidationError } from './options-resolver.js';
import { PluginErrorHandler, PluginError, PluginErrorType } from './error-handler.js';
import { ConnectorRegistry, type ConnectorFactory } from './connector-registry.js';

/**
 * Plugin configuration from user config file.
 */
export interface PluginConfig {
  /** Plugin identifier (class name, path, or package name). */
  readonly plugin: string | PluginClass;

  /** Whether the plugin is enabled. */
  readonly enabled?: boolean;

  /** Plugin-specific options. */
  readonly options?: Record<string, unknown>;
}

/**
 * Server interface required by plugin manager.
 *
 * This interface abstracts the SquadServer to allow testing
 * and to avoid circular dependencies.
 */
export interface PluginServerInterface {
  /** Event emitter for subscribing to events. */
  readonly events: {
    on<K extends keyof SquadEventMap & string>(
      event: K,
      handler: (data: SquadEventMap[K]) => void | Promise<void>,
    ): void;
    once<K extends keyof SquadEventMap & string>(
      event: K,
      handler: (data: SquadEventMap[K]) => void | Promise<void>,
    ): void;
    off<K extends keyof SquadEventMap & string>(
      event: K,
      handler: (data: SquadEventMap[K]) => void | Promise<void>,
    ): void;
    waitFor<K extends keyof SquadEventMap & string>(
      event: K,
      options?: { signal?: AbortSignal; timeout?: number },
    ): Promise<SquadEventMap[K]>;
  };

  /** RCON command executor. */
  readonly rcon: PluginRconExecutor;

  /** Server state. */
  readonly state: ServerStateReader;
}

/**
 * Plugin manager configuration.
 */
export interface PluginManagerConfig {
  /** Logger instance. */
  readonly logger: Logger;

  /** Server interface for plugin context. */
  readonly server: PluginServerInterface;

  /** Plugin configurations. */
  readonly plugins?: readonly PluginConfig[];

  /** Whether to isolate plugins (prevent one failure from affecting others). */
  readonly isolatePlugins?: boolean;
}

/**
 * Result of mounting all plugins.
 */
export interface MountAllResult {
  /** Number of successfully mounted plugins. */
  readonly mounted: number;

  /** Number of plugins that failed to mount. */
  readonly failed: number;

  /** Errors that occurred. */
  readonly errors: readonly PluginError[];
}

/**
 * Plugin Manager - orchestrates the complete plugin lifecycle.
 *
 * Responsibilities:
 * - Load plugin classes from sources (paths, packages, direct classes)
 * - Resolve plugin dependencies (topological sort)
 * - Validate and resolve plugin options
 * - Create plugin contexts with proper isolation
 * - Execute lifecycle methods with error handling
 * - Manage connectors for plugins
 *
 * @example
 * ```typescript
 * const manager = new PluginManager({
 *   logger,
 *   server,
 *   plugins: [
 *     { plugin: AutoTKWarn, enabled: true, options: { message: 'No TK!' } },
 *     { plugin: './my-plugin.js', enabled: true },
 *     { plugin: '@squadscript/plugin-seeding', enabled: true },
 *   ],
 * });
 *
 * // Mount all plugins
 * await manager.mountAll();
 *
 * // Query plugin state
 * const running = manager.getRunningPlugins();
 *
 * // Unmount all plugins
 * await manager.unmountAll();
 * ```
 */
export class PluginManager {
  private readonly logger: Logger;
  private readonly log: ModuleLogger;

  /** Server interface for creating contexts. */
  private readonly server: PluginServerInterface;

  /** Plugin loader. */
  private readonly loader: PluginLoader;

  /** Plugin runner. */
  private readonly runner: PluginRunner;

  /** Options resolver. */
  private readonly optionsResolver: OptionsResolver;

  /** Error handler. */
  private readonly errorHandler: PluginErrorHandler;

  /** Connector registry. */
  private readonly connectors: ConnectorRegistry;

  /** Loaded plugins by name. */
  private readonly loadedPlugins = new Map<string, LoadedPlugin>();

  /** Plugin instances by name. */
  private readonly instances = new Map<string, PluginInstance>();

  /** Plugin configurations. */
  private readonly configs = new Map<string, PluginConfig>();

  constructor(config: PluginManagerConfig) {
    this.logger = config.logger;
    this.log = config.logger.child('plugin-manager');
    this.server = config.server;

    // Initialize error handler
    this.errorHandler = new PluginErrorHandler({
      isolatePlugins: config.isolatePlugins ?? true,
      onError: (error) => {
        this.log.error(`Plugin error: ${error.message}`, error.cause);
      },
    });

    // Initialize connector registry
    this.connectors = new ConnectorRegistry({
      logger: this.log.child('connectors'),
    });

    // Initialize options resolver with connector resolution
    this.optionsResolver = new OptionsResolver({
      connectorResolver: (name) => this.connectors.getSync(name),
    });

    // Initialize loader
    this.loader = new PluginLoader({
      logger: this.log.child('loader'),
    });

    // Initialize runner
    this.runner = new PluginRunner({
      logger: this.log.child('runner'),
      errorHandler: this.errorHandler,
    });

    // Store plugin configs
    for (const pluginConfig of config.plugins ?? []) {
      const name = this.getPluginName(pluginConfig);
      this.configs.set(name, pluginConfig);
    }
  }

  // ===========================================================================
  // Public API - Lifecycle
  // ===========================================================================

  /**
   * Loads all configured plugins.
   *
   * @returns Number of successfully loaded plugins
   */
  async loadAll(): Promise<number> {
    let loaded = 0;

    for (const [name, config] of this.configs) {
      if (config.enabled === false) {
        this.log.debug(`Skipping disabled plugin: ${name}`);
        continue;
      }

      try {
        await this.loadPlugin(config);
        loaded++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.log.error(`Failed to load plugin "${name}": ${message}`);
      }
    }

    this.log.info(`Loaded ${loaded} plugin(s)`);
    return loaded;
  }

  /**
   * Mounts all loaded plugins.
   *
   * Plugins are mounted in dependency order.
   *
   * @returns Mount result with counts and errors
   */
  async mountAll(): Promise<MountAllResult> {
    const orderedPlugins = this.resolveDependencyOrder();
    const errors: PluginError[] = [];
    let mounted = 0;
    let failed = 0;

    for (const pluginName of orderedPlugins) {
      const loadedPlugin = this.loadedPlugins.get(pluginName);
      if (!loadedPlugin) continue;

      const config = this.findConfig(pluginName);
      if (!config) continue;

      try {
        const result = await this.mountPlugin(loadedPlugin, config);
        if (result.success) {
          mounted++;
        } else {
          failed++;
          if (result.error) {
            errors.push(result.error);
          }
        }
      } catch (error) {
        failed++;
        const pluginError = new PluginError(
          pluginName,
          error instanceof Error ? error.message : String(error),
          PluginErrorType.LIFECYCLE,
          error instanceof Error ? error : undefined,
        );
        errors.push(pluginError);
      }
    }

    this.log.info(`Mounted ${mounted} plugin(s), ${failed} failed`);
    return { mounted, failed, errors };
  }

  /**
   * Unmounts all running plugins.
   *
   * Plugins are unmounted in reverse dependency order.
   */
  async unmountAll(): Promise<void> {
    const orderedPlugins = this.resolveDependencyOrder().reverse();

    for (const pluginName of orderedPlugins) {
      const instance = this.instances.get(pluginName);
      if (!instance || instance.state !== 'mounted') continue;

      try {
        await this.runner.unmount(instance);
      } catch (error) {
        this.log.warn(`Error unmounting plugin "${pluginName}"`);
      }
    }

    this.log.info('All plugins unmounted');
  }

  /**
   * Disposes of the plugin manager and all resources.
   */
  async dispose(): Promise<void> {
    await this.unmountAll();
    await this.connectors.disconnectAll();
    this.errorHandler.dispose();
    this.loadedPlugins.clear();
    this.instances.clear();
  }

  // ===========================================================================
  // Public API - Plugin Management
  // ===========================================================================

  /**
   * Gets all running plugins.
   */
  getRunningPlugins(): readonly string[] {
    return Array.from(this.instances.entries())
      .filter(([, instance]) => instance.state === 'mounted')
      .map(([name]) => name);
  }

  /**
   * Gets all loaded plugins.
   */
  getLoadedPlugins(): readonly LoadedPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Gets a plugin instance by name.
   */
  getPlugin(name: string): PluginInstance | undefined {
    return this.instances.get(name);
  }

  /**
   * Gets a plugin's metadata.
   */
  getPluginMeta(name: string): PluginMeta | undefined {
    return this.loadedPlugins.get(name)?.meta;
  }

  /**
   * Checks if a plugin is running.
   */
  isPluginRunning(name: string): boolean {
    const instance = this.instances.get(name);
    return instance?.state === 'mounted';
  }

  // ===========================================================================
  // Public API - Connectors
  // ===========================================================================

  /**
   * Registers a connector factory.
   */
  registerConnectorFactory<T extends Connector>(
    type: string,
    factory: ConnectorFactory<T>,
  ): void {
    this.connectors.registerFactory(type, factory);
  }

  /**
   * Adds a connector configuration.
   */
  addConnector(config: { type: string; name: string; options: Record<string, unknown> }): void {
    this.connectors.add(config);
  }

  /**
   * Gets the connector registry.
   */
  getConnectorRegistry(): ConnectorRegistry {
    return this.connectors;
  }

  // ===========================================================================
  // Internal - Loading
  // ===========================================================================

  /**
   * Loads a single plugin from config.
   */
  private async loadPlugin(config: PluginConfig): Promise<LoadedPlugin> {
    let loadedPlugin: LoadedPlugin;

    if (typeof config.plugin === 'function') {
      // Direct class reference
      loadedPlugin = this.loader.loadClass(config.plugin);
    } else {
      // String path or package name
      loadedPlugin = await this.loader.load(config.plugin);
    }

    this.loadedPlugins.set(loadedPlugin.meta.name, loadedPlugin);
    return loadedPlugin;
  }

  /**
   * Mounts a single plugin.
   */
  private async mountPlugin(
    loadedPlugin: LoadedPlugin,
    config: PluginConfig,
  ): Promise<LifecycleResult> {
    const { meta, optionsSpec } = loadedPlugin;

    // Resolve options
    let options: ResolvedOptions<OptionsSpecification>;
    try {
      options = this.optionsResolver.resolve(
        meta.name,
        optionsSpec,
        config.options ?? {},
      );
    } catch (error) {
      if (error instanceof OptionsValidationError) {
        return {
          success: false,
          error: new PluginError(
            meta.name,
            error.message,
            PluginErrorType.VALIDATION,
            error,
          ),
          durationMs: 0,
        };
      }
      throw error;
    }

    // Create context
    const context = this.createPluginContext(meta.name);

    // Create instance
    const instance = this.runner.create(loadedPlugin, context, options);
    this.instances.set(meta.name, instance);

    // Mount
    return this.runner.mount(instance);
  }

  // ===========================================================================
  // Internal - Context Creation
  // ===========================================================================

  /**
   * Creates a plugin context for a specific plugin.
   */
  private createPluginContext(pluginName: string): PluginContext<Record<string, unknown>> {
    const pluginLogger = this.createPluginLogger(pluginName);
    const pluginEvents = this.createPluginEventEmitter();

    return {
      events: pluginEvents,
      rcon: this.server.rcon,
      state: this.server.state,
      log: pluginLogger,
      getConnector: <T>(name: string): T | undefined => {
        return this.connectors.getSync<Connector>(name) as T | undefined;
      },
    };
  }

  /**
   * Creates a scoped logger for a plugin.
   */
  private createPluginLogger(pluginName: string): PluginLogger {
    const moduleLogger = this.logger.child(`plugin:${pluginName}`);

    return {
      trace: (message, data) => moduleLogger.trace(message, data),
      debug: (message, data) => moduleLogger.debug(message, data),
      verbose: (message, data) => moduleLogger.verbose(message, data),
      info: (message, data) => moduleLogger.info(message, data),
      warn: (message, data) => moduleLogger.warn(message, data),
      error: (message, error, data) => moduleLogger.error(message, error, data),
    };
  }

  /**
   * Creates an event emitter wrapper for a plugin.
   */
  private createPluginEventEmitter(): PluginEventEmitter<Record<string, unknown>> {
    const server = this.server;

    return {
      on: <K extends string>(
        event: K,
        handler: (data: unknown) => void | Promise<void>,
      ): Unsubscribe => {
        server.events.on(event as keyof SquadEventMap & string, handler as any);
        return () => server.events.off(event as keyof SquadEventMap & string, handler as any);
      },

      once: <K extends string>(
        event: K,
        handler: (data: unknown) => void | Promise<void>,
      ): Unsubscribe => {
        server.events.once(event as keyof SquadEventMap & string, handler as any);
        return () => server.events.off(event as keyof SquadEventMap & string, handler as any);
      },

      waitFor: <K extends string>(
        event: K,
        options?: { signal?: AbortSignal; timeout?: number },
      ): Promise<unknown> => {
        return server.events.waitFor(event as keyof SquadEventMap & string, options);
      },
    };
  }

  // ===========================================================================
  // Internal - Dependency Resolution
  // ===========================================================================

  /**
   * Resolves plugin load/mount order based on dependencies.
   *
   * Uses Kahn's algorithm for topological sorting.
   */
  private resolveDependencyOrder(): string[] {
    const plugins = Array.from(this.loadedPlugins.values());

    // Build adjacency list and in-degree count
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>();

    for (const plugin of plugins) {
      inDegree.set(plugin.meta.name, 0);
      dependents.set(plugin.meta.name, []);
    }

    for (const plugin of plugins) {
      const deps = plugin.meta.dependencies ?? [];
      for (const dep of deps) {
        if (this.loadedPlugins.has(dep)) {
          inDegree.set(plugin.meta.name, (inDegree.get(plugin.meta.name) ?? 0) + 1);
          dependents.get(dep)?.push(plugin.meta.name);
        } else {
          this.log.warn(
            `Plugin "${plugin.meta.name}" depends on "${dep}" which is not loaded`,
          );
        }
      }
    }

    // Find all plugins with no dependencies
    const queue: string[] = [];
    for (const [name, degree] of inDegree) {
      if (degree === 0) {
        queue.push(name);
      }
    }

    // Process in order
    const result: string[] = [];
    while (queue.length > 0) {
      const name = queue.shift()!;
      result.push(name);

      for (const dependent of dependents.get(name) ?? []) {
        const newDegree = (inDegree.get(dependent) ?? 0) - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) {
          queue.push(dependent);
        }
      }
    }

    // Check for cycles
    if (result.length !== plugins.length) {
      const missing = plugins
        .map((p) => p.meta.name)
        .filter((n) => !result.includes(n));
      this.log.error(`Circular dependency detected involving: ${missing.join(', ')}`);
    }

    return result;
  }

  // ===========================================================================
  // Internal - Helpers
  // ===========================================================================

  /**
   * Gets the plugin name from a config.
   */
  private getPluginName(config: PluginConfig): string {
    if (typeof config.plugin === 'function') {
      const cls = config.plugin as PluginClass;
      return cls.meta?.name ?? 'unknown';
    }
    return config.plugin;
  }

  /**
   * Finds a config for a plugin name.
   */
  private findConfig(pluginName: string): PluginConfig | undefined {
    // Check by exact name
    const direct = this.configs.get(pluginName);
    if (direct) return direct;

    // Check if any config loaded this plugin
    for (const [, config] of this.configs) {
      if (typeof config.plugin === 'function') {
        const cls = config.plugin as PluginClass;
        if (cls.meta?.name === pluginName) {
          return config;
        }
      }
    }

    return undefined;
  }
}

/**
 * @squadscript/server
 *
 * Plugin Loader for discovering and loading plugin modules.
 *
 * Handles dynamic import of plugin classes with validation
 * of required static properties and metadata.
 *
 * @module
 */

import type {
  PluginMeta,
  OptionsSpecification,
  PluginContext,
  ResolvedOptions,
} from '@squadscript/types';
import type { ModuleLogger } from '@squadscript/logger';
import type { BasePlugin } from './base-plugin.js';

/**
 * Plugin class constructor type.
 */
export interface PluginClass<T extends BasePlugin = BasePlugin> {
  /** Plugin metadata. */
  readonly meta: PluginMeta;

  /** Plugin options specification. */
  readonly optionsSpec: OptionsSpecification;

  /** Constructor. */
  new (context: PluginContext, options: ResolvedOptions<OptionsSpecification>): T;
}

/**
 * Loaded plugin information.
 */
export interface LoadedPlugin {
  /** The plugin class. */
  readonly Class: PluginClass;

  /** Plugin metadata. */
  readonly meta: PluginMeta;

  /** Plugin options specification. */
  readonly optionsSpec: OptionsSpecification;

  /** Source path or identifier. */
  readonly source: string;
}

/**
 * Plugin load error.
 */
export class PluginLoadError extends Error {
  /** Source path that failed to load. */
  readonly source: string;

  /** Underlying error. */
  readonly cause: Error | undefined;

  constructor(source: string, message: string, cause?: Error) {
    super(`Failed to load plugin from "${source}": ${message}`);
    this.name = 'PluginLoadError';
    this.source = source;
    this.cause = cause;
  }
}

/**
 * Plugin metadata validation errors.
 */
export interface MetaValidationResult {
  /** Whether the metadata is valid. */
  readonly valid: boolean;

  /** Validation errors (if any). */
  readonly errors: readonly string[];
}

/**
 * Plugin loader configuration.
 */
export interface PluginLoaderConfig {
  /** Logger instance. */
  readonly logger: ModuleLogger;

  /** Custom plugin resolution function. */
  readonly resolve?: (source: string) => Promise<unknown>;
}

/**
 * Loads and validates plugin modules.
 *
 * The loader supports:
 * - Loading plugins from file paths
 * - Loading plugins from package names
 * - Loading pre-imported plugin classes
 * - Validating plugin metadata and options specification
 *
 * @example
 * ```typescript
 * const loader = new PluginLoader({ logger });
 *
 * // Load from path
 * const plugin = await loader.load('./plugins/my-plugin.js');
 *
 * // Load from package
 * const plugin = await loader.load('@squadscript/plugin-chat-commands');
 *
 * // Load from class
 * const plugin = await loader.loadClass(MyPluginClass);
 * ```
 */
export class PluginLoader {
  private readonly logger: ModuleLogger;
  private readonly customResolve: ((source: string) => Promise<unknown>) | undefined;

  constructor(config: PluginLoaderConfig) {
    this.logger = config.logger;
    this.customResolve = config.resolve;
  }

  /**
   * Loads a plugin from a source path or package name.
   *
   * @param source - File path or package name
   * @returns Loaded plugin information
   * @throws {PluginLoadError} If loading or validation fails
   */
  async load(source: string): Promise<LoadedPlugin> {
    this.logger.debug(`Loading plugin from: ${source}`);

    try {
      // Use custom resolver or dynamic import
      const module = this.customResolve
        ? await this.customResolve(source)
        : await import(source);

      // Find the plugin class in the module
      const PluginClass = this.findPluginClass(module, source);

      // Validate the plugin class
      return this.loadClass(PluginClass, source);
    } catch (error) {
      if (error instanceof PluginLoadError) {
        throw error;
      }

      throw new PluginLoadError(
        source,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Loads and validates a plugin class directly.
   *
   * @param Class - The plugin class
   * @param source - Optional source identifier for error messages
   * @returns Loaded plugin information
   * @throws {PluginLoadError} If validation fails
   */
  loadClass(Class: unknown, source = 'direct'): LoadedPlugin {
    // Validate it's a class
    if (typeof Class !== 'function') {
      throw new PluginLoadError(
        source,
        `Expected a class, got ${typeof Class}`,
      );
    }

    const PluginClass = Class as PluginClass;

    // Validate required static properties
    const metaValidation = this.validateMeta(PluginClass.meta);
    if (!metaValidation.valid) {
      throw new PluginLoadError(
        source,
        `Invalid plugin metadata:\n${metaValidation.errors.map((e) => `  - ${e}`).join('\n')}`,
      );
    }

    // Validate options spec exists
    if (PluginClass.optionsSpec === undefined) {
      throw new PluginLoadError(
        source,
        'Plugin is missing static optionsSpec property',
      );
    }

    if (typeof PluginClass.optionsSpec !== 'object' || PluginClass.optionsSpec === null) {
      throw new PluginLoadError(
        source,
        'Plugin optionsSpec must be an object',
      );
    }

    this.logger.info(`Loaded plugin: ${PluginClass.meta.name} v${PluginClass.meta.version}`);

    return {
      Class: PluginClass,
      meta: PluginClass.meta,
      optionsSpec: PluginClass.optionsSpec,
      source,
    };
  }

  /**
   * Finds the plugin class in a module's exports.
   *
   * Checks for:
   * 1. Default export
   * 2. Named export matching common patterns
   * 3. Any export that looks like a plugin class
   */
  private findPluginClass(module: unknown, source: string): PluginClass {
    if (!module || typeof module !== 'object') {
      throw new PluginLoadError(source, 'Module did not export an object');
    }

    const moduleObj = module as Record<string, unknown>;

    // Check default export first
    if (moduleObj.default && this.looksLikePluginClass(moduleObj.default)) {
      return moduleObj.default as PluginClass;
    }

    // Check named exports
    for (const [key, value] of Object.entries(moduleObj)) {
      if (key === 'default') continue;

      if (this.looksLikePluginClass(value)) {
        return value as PluginClass;
      }
    }

    throw new PluginLoadError(
      source,
      'Could not find a plugin class in module exports. ' +
        'Make sure your plugin exports a class extending BasePlugin.',
    );
  }

  /**
   * Checks if a value looks like a plugin class.
   */
  private looksLikePluginClass(value: unknown): boolean {
    if (typeof value !== 'function') {
      return false;
    }

    const maybeClass = value as unknown as Record<string, unknown>;

    // Check for static meta property
    if (!maybeClass.meta || typeof maybeClass.meta !== 'object') {
      return false;
    }

    const meta = maybeClass.meta as Record<string, unknown>;

    // Check for required meta fields
    if (typeof meta.name !== 'string') {
      return false;
    }

    // Check for optionsSpec property (can be empty object)
    if (maybeClass.optionsSpec === undefined) {
      return false;
    }

    return true;
  }

  /**
   * Validates plugin metadata.
   */
  private validateMeta(meta: unknown): MetaValidationResult {
    const errors: string[] = [];

    if (!meta || typeof meta !== 'object') {
      return {
        valid: false,
        errors: ['Plugin is missing static meta property'],
      };
    }

    const metaObj = meta as Record<string, unknown>;

    // Required fields
    if (typeof metaObj.name !== 'string' || metaObj.name.length === 0) {
      errors.push('meta.name must be a non-empty string');
    }

    if (typeof metaObj.description !== 'string') {
      errors.push('meta.description must be a string');
    }

    if (typeof metaObj.version !== 'string') {
      errors.push('meta.version must be a string');
    }

    if (typeof metaObj.defaultEnabled !== 'boolean') {
      errors.push('meta.defaultEnabled must be a boolean');
    }

    // Optional fields type checks
    if (metaObj.author !== undefined && typeof metaObj.author !== 'string') {
      errors.push('meta.author must be a string if provided');
    }

    if (metaObj.url !== undefined && typeof metaObj.url !== 'string') {
      errors.push('meta.url must be a string if provided');
    }

    if (metaObj.dependencies !== undefined) {
      if (!Array.isArray(metaObj.dependencies)) {
        errors.push('meta.dependencies must be an array if provided');
      } else if (!metaObj.dependencies.every((d) => typeof d === 'string')) {
        errors.push('meta.dependencies must contain only strings');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Batch loads multiple plugins.
   *
   * @param sources - Array of source paths or package names
   * @returns Array of loaded plugins and any errors
   */
  async loadMany(sources: readonly string[]): Promise<{
    loaded: readonly LoadedPlugin[];
    errors: readonly PluginLoadError[];
  }> {
    const loaded: LoadedPlugin[] = [];
    const errors: PluginLoadError[] = [];

    for (const source of sources) {
      try {
        const plugin = await this.load(source);
        loaded.push(plugin);
      } catch (error) {
        if (error instanceof PluginLoadError) {
          errors.push(error);
        } else {
          errors.push(
            new PluginLoadError(
              source,
              error instanceof Error ? error.message : String(error),
              error instanceof Error ? error : undefined,
            ),
          );
        }
      }
    }

    return { loaded, errors };
  }
}

/**
 * @squadscript/config
 *
 * Configuration file loader.
 *
 * @module
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { extname } from 'path';
import { type Result, Ok, Err } from '@squadscript/types';
import type { Logger, ModuleLogger } from '@squadscript/logger';
import {
  ServerConfigSchema,
  RootConfigSchema,
  type ServerConfig,
  type RootConfig,
} from './schemas/index.js';
import { ConfigError } from './errors.js';
import { validate } from './validator.js';

/**
 * Configuration loader options.
 */
export interface ConfigLoaderOptions {
  /** Logger instance for debug output. */
  logger?: Logger;

  /** Whether to watch for file changes. */
  watch?: boolean;
}

/**
 * Supported configuration file formats.
 */
export type ConfigFormat = 'json' | 'json5';

/**
 * Configuration loader class.
 *
 * Loads and validates configuration from files with support for
 * JSON and JSON5 formats.
 *
 * @example
 * ```typescript
 * const loader = new ConfigLoader({ logger });
 *
 * const result = await loader.loadServerConfig('./config.json');
 * if (result.ok) {
 *   console.log('Loaded config:', result.value);
 * } else {
 *   console.error(result.error.formatDetails());
 * }
 * ```
 */
export class ConfigLoader {
  private readonly log?: ModuleLogger;

  constructor(options: ConfigLoaderOptions = {}) {
    this.log = options.logger?.child('config');
  }

  /**
   * Load and validate a server configuration file.
   *
   * @param path - Path to the configuration file
   * @returns A Result containing the validated config or an error
   */
  async loadServerConfig(path: string): Promise<Result<ServerConfig, ConfigError>> {
    this.log?.debug(`Loading server config from: ${path}`);

    const loadResult = await this.loadFile(path);
    if (!loadResult.ok) {
      return loadResult;
    }

    const parseResult = this.parseContent(loadResult.value, path);
    if (!parseResult.ok) {
      return parseResult;
    }

    const validationResult = validate(ServerConfigSchema, parseResult.value);
    if (!validationResult.ok) {
      this.log?.error('Config validation failed', validationResult.error);
      return validationResult;
    }

    this.log?.info('Server config loaded successfully');
    return validationResult;
  }

  /**
   * Load and validate a root configuration file (multi-server).
   *
   * @param path - Path to the configuration file
   * @returns A Result containing the validated config or an error
   */
  async loadRootConfig(path: string): Promise<Result<RootConfig, ConfigError>> {
    this.log?.debug(`Loading root config from: ${path}`);

    const loadResult = await this.loadFile(path);
    if (!loadResult.ok) {
      return loadResult;
    }

    const parseResult = this.parseContent(loadResult.value, path);
    if (!parseResult.ok) {
      return parseResult;
    }

    const validationResult = validate(RootConfigSchema, parseResult.value);
    if (!validationResult.ok) {
      this.log?.error('Config validation failed', validationResult.error);
      return validationResult;
    }

    this.log?.info('Root config loaded successfully');
    return validationResult;
  }

  /**
   * Load configuration and auto-detect format (single or multi-server).
   *
   * @param path - Path to the configuration file
   * @returns A Result containing either a ServerConfig or RootConfig
   */
  async loadConfig(
    path: string,
  ): Promise<Result<ServerConfig | RootConfig, ConfigError>> {
    this.log?.debug(`Loading config from: ${path}`);

    const loadResult = await this.loadFile(path);
    if (!loadResult.ok) {
      return loadResult;
    }

    const parseResult = this.parseContent(loadResult.value, path);
    if (!parseResult.ok) {
      return parseResult;
    }

    const data = parseResult.value;

    // Detect format based on presence of 'servers' key
    if (typeof data === 'object' && data !== null && 'servers' in data) {
      return validate(RootConfigSchema, data);
    }

    return validate(ServerConfigSchema, data);
  }

  /**
   * Read a file and return its contents.
   */
  private async loadFile(path: string): Promise<Result<string, ConfigError>> {
    if (!existsSync(path)) {
      const error = ConfigError.fileNotFound(path);
      this.log?.error('Config file not found', error);
      return Err(error);
    }

    try {
      const content = await readFile(path, 'utf-8');
      return Ok(content);
    } catch (err) {
      const error = ConfigError.fileReadError(
        path,
        err instanceof Error ? err : new Error(String(err)),
      );
      this.log?.error('Failed to read config file', error);
      return Err(error);
    }
  }

  /**
   * Parse file content based on format.
   */
  private parseContent(
    content: string,
    path: string,
  ): Result<unknown, ConfigError> {
    const format = this.detectFormat(path);

    try {
      switch (format) {
        case 'json':
        case 'json5':
          // For now, use JSON.parse for both (JSON5 would need a separate parser)
          // Strip comments for JSON5-like support
          const stripped = this.stripComments(content);
          return Ok(JSON.parse(stripped));
        default:
          return Err(ConfigError.parseError(`Unsupported format: ${format}`));
      }
    } catch (err) {
      const error = ConfigError.parseError(
        err instanceof Error ? err.message : String(err),
        err instanceof Error ? err : undefined,
      );
      this.log?.error('Failed to parse config', error);
      return Err(error);
    }
  }

  /**
   * Detect file format from extension.
   */
  private detectFormat(path: string): ConfigFormat {
    const ext = extname(path).toLowerCase();
    switch (ext) {
      case '.json':
        return 'json';
      case '.json5':
      case '.jsonc':
        return 'json5';
      default:
        return 'json';
    }
  }

  /**
   * Strip single-line and multi-line comments from JSON-like content.
   * This provides basic JSON5/JSONC support.
   */
  private stripComments(content: string): string {
    // Remove single-line comments
    let result = content.replace(/\/\/[^\n\r]*/g, '');
    // Remove multi-line comments
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    return result;
  }
}

/**
 * Create a configuration loader with the given options.
 *
 * @param options - Loader options
 * @returns A new ConfigLoader instance
 */
export function createConfigLoader(
  options: ConfigLoaderOptions = {},
): ConfigLoader {
  return new ConfigLoader(options);
}

/**
 * Validate a configuration object without loading from file.
 *
 * @param data - The configuration object to validate
 * @param schema - The schema to validate against ('server' or 'root')
 * @returns A Result containing the validated config or an error
 */
export function validateConfig(
  data: unknown,
  schema: 'server' | 'root' = 'server',
): Result<ServerConfig | RootConfig, ConfigError> {
  if (schema === 'root') {
    return validate(RootConfigSchema, data);
  }
  return validate(ServerConfigSchema, data);
}

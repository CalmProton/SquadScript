/**
 * @squadscript/server
 *
 * Options Resolver for validating and resolving plugin options.
 *
 * This class validates user-provided options against a plugin's options
 * specification, applying defaults and performing type/constraint validation.
 *
 * @module
 */

import type {
  OptionsSpecification,
  OptionSpec,
  ResolvedOptions,
  Connector,
} from '@squadscript/types';

/**
 * Validation error for a specific option.
 */
export interface OptionValidationError {
  /** The option key path (e.g., "webhookUrl" or "nested.value"). */
  readonly path: string;
  /** Human-readable error message. */
  readonly message: string;
  /** The invalid value that was provided. */
  readonly value?: unknown;
}

/**
 * Error thrown when option validation fails.
 */
export class OptionsValidationError extends Error {
  /** Array of validation errors. */
  readonly errors: readonly OptionValidationError[];

  /** The plugin name. */
  readonly pluginName: string;

  constructor(pluginName: string, errors: readonly OptionValidationError[]) {
    const messages = errors.map((e) => `  - ${e.path}: ${e.message}`).join('\n');
    super(`Plugin "${pluginName}" has invalid options:\n${messages}`);

    this.name = 'OptionsValidationError';
    this.pluginName = pluginName;
    this.errors = errors;
  }
}

/**
 * Connector resolver function type.
 *
 * This function is provided by the PluginManager to resolve connector references.
 */
export type ConnectorResolver = (name: string) => Connector | undefined;

/**
 * Options resolver configuration.
 */
export interface OptionsResolverConfig {
  /** Function to resolve connector references. */
  readonly connectorResolver?: ConnectorResolver;
}

/**
 * Resolves and validates plugin options against a specification.
 *
 * Features:
 * - Type validation (string, number, boolean, array, object)
 * - Required field validation
 * - Default value application
 * - Constraint validation (min, max, minLength, maxLength, pattern, choices)
 * - Custom validation functions
 * - Nested object validation
 * - Array item validation
 * - Connector reference resolution
 *
 * @example
 * ```typescript
 * const resolver = new OptionsResolver();
 *
 * const optionsSpec = {
 *   message: { type: 'string', required: true, minLength: 1 },
 *   interval: { type: 'number', required: false, default: 5000, min: 1000 },
 * } as const;
 *
 * const userOptions = { message: 'Hello' };
 *
 * const resolved = resolver.resolve('MyPlugin', optionsSpec, userOptions);
 * // { message: 'Hello', interval: 5000 }
 * ```
 */
export class OptionsResolver {
  private readonly connectorResolver: ConnectorResolver | undefined;

  constructor(config: OptionsResolverConfig = {}) {
    this.connectorResolver = config.connectorResolver;
  }

  /**
   * Resolves and validates options against a specification.
   *
   * @param pluginName - Name of the plugin (for error messages)
   * @param spec - The options specification
   * @param userOptions - User-provided options
   * @returns Resolved options with defaults applied
   * @throws {OptionsValidationError} If validation fails
   */
  resolve<T extends OptionsSpecification>(
    pluginName: string,
    spec: T,
    userOptions: Record<string, unknown> = {},
  ): ResolvedOptions<T> {
    const errors: OptionValidationError[] = [];
    const resolved: Record<string, unknown> = {};

    for (const [key, optionSpec] of Object.entries(spec)) {
      const value = userOptions[key];
      const result = this.resolveOption(key, optionSpec, value, errors);

      if (result !== undefined) {
        resolved[key] = result;
      }
    }

    if (errors.length > 0) {
      throw new OptionsValidationError(pluginName, errors);
    }

    return resolved as ResolvedOptions<T>;
  }

  /**
   * Resolves a single option value.
   */
  private resolveOption(
    path: string,
    spec: OptionSpec,
    value: unknown,
    errors: OptionValidationError[],
  ): unknown {
    // Handle connector references
    if (spec.connector !== undefined) {
      return this.resolveConnector(path, spec, value, errors);
    }

    // Check required
    if (value === undefined || value === null) {
      if (spec.required) {
        errors.push({
          path,
          message: 'This field is required',
        });
        return undefined;
      }
      // Return default if available
      return spec.default;
    }

    // Validate type
    if (!this.validateType(spec.type, value)) {
      errors.push({
        path,
        message: `Expected type "${spec.type}", got "${typeof value}"`,
        value,
      });
      return undefined;
    }

    // Validate constraints
    this.validateConstraints(path, spec, value, errors);

    // Validate nested object
    if (spec.type === 'object' && spec.properties) {
      return this.resolveNested(path, spec.properties, value as Record<string, unknown>, errors);
    }

    // Validate array items
    if (spec.type === 'array' && spec.items && Array.isArray(value)) {
      return this.resolveArray(path, spec.items, value, errors);
    }

    // Run custom validation
    if (spec.validate && !spec.validate(value)) {
      errors.push({
        path,
        message: 'Custom validation failed',
        value,
      });
      return undefined;
    }

    return value;
  }

  /**
   * Resolves a connector reference.
   */
  private resolveConnector(
    path: string,
    spec: OptionSpec,
    _value: unknown,
    errors: OptionValidationError[],
  ): Connector | undefined {
    const connectorName = spec.connector as string;

    if (!this.connectorResolver) {
      errors.push({
        path,
        message: `Connector "${connectorName}" cannot be resolved (no resolver configured)`,
      });
      return undefined;
    }

    const connector = this.connectorResolver(connectorName);

    if (!connector && spec.required) {
      errors.push({
        path,
        message: `Required connector "${connectorName}" is not registered`,
      });
      return undefined;
    }

    return connector;
  }

  /**
   * Validates value type.
   */
  private validateType(type: string, value: unknown): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !Number.isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'player':
      case 'squad':
      case 'layer':
        // These are special types that will be validated/resolved at runtime
        return typeof value === 'string' || typeof value === 'object';
      default:
        return true;
    }
  }

  /**
   * Validates option constraints.
   */
  private validateConstraints(
    path: string,
    spec: OptionSpec,
    value: unknown,
    errors: OptionValidationError[],
  ): void {
    // Number constraints
    if (typeof value === 'number') {
      if (spec.min !== undefined && value < spec.min) {
        errors.push({
          path,
          message: `Value must be at least ${spec.min}`,
          value,
        });
      }
      if (spec.max !== undefined && value > spec.max) {
        errors.push({
          path,
          message: `Value must be at most ${spec.max}`,
          value,
        });
      }
    }

    // String constraints
    if (typeof value === 'string') {
      if (spec.minLength !== undefined && value.length < spec.minLength) {
        errors.push({
          path,
          message: `Must be at least ${spec.minLength} characters`,
          value,
        });
      }
      if (spec.maxLength !== undefined && value.length > spec.maxLength) {
        errors.push({
          path,
          message: `Must be at most ${spec.maxLength} characters`,
          value,
        });
      }
      if (spec.pattern !== undefined) {
        const regex = new RegExp(spec.pattern);
        if (!regex.test(value)) {
          errors.push({
            path,
            message: `Must match pattern: ${spec.pattern}`,
            value,
          });
        }
      }
    }

    // Array constraints
    if (Array.isArray(value)) {
      if (spec.minLength !== undefined && value.length < spec.minLength) {
        errors.push({
          path,
          message: `Must have at least ${spec.minLength} items`,
          value,
        });
      }
      if (spec.maxLength !== undefined && value.length > spec.maxLength) {
        errors.push({
          path,
          message: `Must have at most ${spec.maxLength} items`,
          value,
        });
      }
    }

    // Choices constraint
    if (spec.choices !== undefined) {
      const choices = spec.choices as readonly unknown[];
      if (!choices.includes(value)) {
        errors.push({
          path,
          message: `Must be one of: ${choices.join(', ')}`,
          value,
        });
      }
    }
  }

  /**
   * Resolves nested object options.
   */
  private resolveNested(
    basePath: string,
    spec: OptionsSpecification,
    value: Record<string, unknown>,
    errors: OptionValidationError[],
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, optionSpec] of Object.entries(spec)) {
      const path = `${basePath}.${key}`;
      const nestedValue = value[key];
      const resolved = this.resolveOption(path, optionSpec, nestedValue, errors);

      if (resolved !== undefined) {
        result[key] = resolved;
      }
    }

    return result;
  }

  /**
   * Resolves array items.
   */
  private resolveArray(
    basePath: string,
    itemSpec: OptionSpec,
    value: unknown[],
    errors: OptionValidationError[],
  ): unknown[] {
    const result: unknown[] = [];

    for (let i = 0; i < value.length; i++) {
      const path = `${basePath}[${i}]`;
      const itemValue = value[i];
      const resolved = this.resolveOption(path, itemSpec, itemValue, errors);

      if (resolved !== undefined) {
        result.push(resolved);
      }
    }

    return result;
  }

  /**
   * Validates options without resolving (for static validation).
   *
   * @param _pluginName - Name of the plugin (unused but kept for API consistency)
   * @param spec - The options specification
   * @param userOptions - User-provided options
   * @returns Array of validation errors (empty if valid)
   */
  validate<T extends OptionsSpecification>(
    _pluginName: string,
    spec: T,
    userOptions: Record<string, unknown> = {},
  ): readonly OptionValidationError[] {
    const errors: OptionValidationError[] = [];

    for (const [key, optionSpec] of Object.entries(spec)) {
      const value = userOptions[key];
      this.resolveOption(key, optionSpec, value, errors);
    }

    return errors;
  }
}

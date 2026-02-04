/**
 * @squadscript/types
 *
 * Plugin options specification types.
 *
 * @module
 */

/**
 * Supported option types.
 */
export type OptionType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'player'
  | 'squad'
  | 'layer';

/**
 * Option specification for plugin configuration.
 *
 * @typeParam T - The type of the option value
 */
export interface OptionSpec<T = unknown> {
  /** Description of the option shown in documentation. */
  readonly description: string;

  /** The type of option value. */
  readonly type: OptionType;

  /** Whether this option is required. */
  readonly required: boolean;

  /** Default value if not specified. */
  readonly default?: T;

  /** Example value for documentation. */
  readonly example?: T;

  /** Reference to a connector by name. */
  readonly connector?: string;

  /** Validation function. */
  readonly validate?: (value: unknown) => boolean;

  /** Allowed values for enum-like options. */
  readonly choices?: readonly T[];

  /** Minimum value (for numbers). */
  readonly min?: number;

  /** Maximum value (for numbers). */
  readonly max?: number;

  /** Minimum length (for strings/arrays). */
  readonly minLength?: number;

  /** Maximum length (for strings/arrays). */
  readonly maxLength?: number;

  /** Regex pattern for string validation. */
  readonly pattern?: string;

  /** Nested options specification (for object types). */
  readonly properties?: OptionsSpecification;

  /** Item specification (for array types). */
  readonly items?: OptionSpec;
}

/**
 * A map of option names to their specifications.
 */
export type OptionsSpecification = Record<string, OptionSpec>;

/**
 * Extract the resolved options type from an options specification.
 *
 * @example
 * ```typescript
 * const optionsSpec = {
 *   enabled: { type: 'boolean', required: true, default: true },
 *   message: { type: 'string', required: false },
 * } as const;
 *
 * type Options = ResolvedOptions<typeof optionsSpec>;
 * // { enabled: boolean; message?: string }
 * ```
 */
export type ResolvedOptions<T extends OptionsSpecification> = {
  [K in keyof T as T[K]['required'] extends true ? K : never]: InferOptionType<
    T[K]
  >;
} & {
  [K in keyof T as T[K]['required'] extends true
    ? never
    : K]?: InferOptionType<T[K]>;
};

/**
 * Infer the TypeScript type from an option specification.
 */
export type InferOptionType<T extends OptionSpec> = T['type'] extends 'string'
  ? string
  : T['type'] extends 'number'
    ? number
    : T['type'] extends 'boolean'
      ? boolean
      : T['type'] extends 'array'
        ? unknown[]
        : T['type'] extends 'object'
          ? Record<string, unknown>
          : unknown;

/**
 * Creates an option specification with proper typing.
 */
export function defineOption<T>(spec: OptionSpec<T>): OptionSpec<T> {
  return spec;
}

/**
 * Creates an options specification with proper typing.
 */
export function defineOptions<T extends OptionsSpecification>(spec: T): T {
  return spec;
}

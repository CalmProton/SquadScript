/**
 * @squadscript/types
 *
 * Plugin module - exports all plugin-related types.
 *
 * @module
 */

export type {
  PluginLifecycle,
  PluginMeta,
  PluginState,
} from './lifecycle.js';

export {
  type OptionType,
  type OptionSpec,
  type OptionsSpecification,
  type ResolvedOptions,
  type InferOptionType,
  defineOption,
  defineOptions,
} from './options.js';

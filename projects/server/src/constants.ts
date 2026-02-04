/**
 * @squadscript/server
 *
 * Default configuration values.
 *
 * @module
 */

import type { UpdateIntervals } from './types.js';

/**
 * Default update intervals in milliseconds.
 */
export const DefaultIntervals: UpdateIntervals = {
  /** Player list refresh interval. */
  playerList: 30_000,
  /** Squad list refresh interval. */
  squadList: 30_000,
  /** Layer info refresh interval. */
  layerInfo: 30_000,
  /** Server info refresh interval. */
  serverInfo: 30_000,
  /** Admin list refresh interval. */
  adminList: 300_000,
} as const;

/**
 * Layer history defaults.
 */
export const LayerDefaults = {
  /** Maximum number of layers to keep in history. */
  HISTORY_SIZE: 20,
} as const;

/**
 * Timing constants for operations.
 */
export const Timings = {
  /** Delay before initial state fetch after connection. */
  INITIAL_FETCH_DELAY: 1_000,
  /** Timeout for individual update operations. */
  UPDATE_TIMEOUT: 10_000,
  /** Grace period for shutdown operations. */
  SHUTDOWN_GRACE_PERIOD: 5_000,
} as const;

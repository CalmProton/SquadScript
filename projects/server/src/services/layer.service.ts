/**
 * @squadscript/server
 *
 * Layer service - manages layer state and history.
 *
 * @module
 */

import type { ModuleLogger } from '@squadscript/logger';
import type { Layer, LayerState } from '@squadscript/types';
import { createLayerFromRcon } from '@squadscript/types';
import type { MapInfo } from '@squadscript/rcon';
import { LayerDefaults } from '../constants.js';
import type { LayerStateChange } from '../types.js';

/**
 * Layer history entry with timestamp.
 */
export interface LayerHistoryEntry {
  /** The layer. */
  readonly layer: Layer;
  /** When the layer was played. */
  readonly startedAt: Date;
  /** When the layer ended (null if currently playing). */
  readonly endedAt: Date | null;
}

/**
 * Options for creating a LayerService.
 */
export interface LayerServiceOptions {
  /** Logger instance. */
  readonly logger: ModuleLogger;
  /** Maximum history entries to keep. */
  readonly historySize?: number;
}

/**
 * Service for managing layer (map) state and history.
 *
 * Tracks:
 * - Current layer
 * - Next layer
 * - Layer history
 *
 * @example
 * ```typescript
 * const layerService = new LayerService({ logger });
 *
 * // Update from RCON
 * layerService.updateCurrent(currentMapInfo);
 * layerService.updateNext(nextMapInfo);
 *
 * // Access state
 * const current = layerService.currentLayer;
 * const history = layerService.getHistory(5);
 * ```
 */
export class LayerService {
  private readonly logger: ModuleLogger;
  private readonly historySize: number;

  private current: Layer | null = null;
  private next: Layer | null = null;
  private history: LayerHistoryEntry[] = [];

  constructor(options: LayerServiceOptions) {
    this.logger = options.logger;
    this.historySize = options.historySize ?? LayerDefaults.HISTORY_SIZE;
  }

  // ===========================================================================
  // State Accessors
  // ===========================================================================

  /**
   * Gets the current layer.
   */
  get currentLayer(): Layer | null {
    return this.current;
  }

  /**
   * Gets the next layer.
   */
  get nextLayer(): Layer | null {
    return this.next;
  }

  /**
   * Gets the full layer state.
   */
  getState(): LayerState {
    return {
      current: this.current,
      next: this.next,
      history: this.history.map((entry) => entry.layer),
    };
  }

  /**
   * Gets the layer history.
   *
   * @param count - Number of entries to return (default: all)
   * @returns Array of history entries, most recent first
   */
  getHistory(count?: number): readonly LayerHistoryEntry[] {
    if (count === undefined) {
      return this.history;
    }
    return this.history.slice(0, count);
  }

  // ===========================================================================
  // State Updates
  // ===========================================================================

  /**
   * Updates the current layer from RCON info.
   *
   * If the layer has changed, the previous layer is added to history.
   *
   * @param mapInfo - Map info from RCON
   * @returns State change if the layer changed, null otherwise
   */
  updateCurrent(mapInfo: MapInfo): LayerStateChange | null {
    const newLayer = this.mapInfoToLayer(mapInfo);
    if (!newLayer) return null;

    // Check if this is actually a change
    if (this.current && this.current.name === newLayer.name) {
      return null;
    }

    const previous = this.current;

    // Add previous layer to history
    if (previous) {
      this.addToHistory(previous);
    }

    this.current = newLayer;
    this.logger.info(`Layer changed to: ${newLayer.name}`);

    return {
      type: 'layer_changed',
      layer: newLayer,
      previous: previous ?? undefined,
    };
  }

  /**
   * Updates the next layer from RCON info.
   *
   * @param mapInfo - Map info from RCON
   * @returns State change if the next layer changed, null otherwise
   */
  updateNext(mapInfo: MapInfo): LayerStateChange | null {
    const newLayer = this.mapInfoToLayer(mapInfo);

    // Check if this is actually a change
    if (this.next?.name === newLayer?.name) {
      return null;
    }

    const previous = this.next;
    this.next = newLayer;

    if (newLayer) {
      this.logger.info(`Next layer set to: ${newLayer.name}`);
      return {
        type: 'next_layer_set',
        layer: newLayer,
        previous: previous ?? undefined,
      };
    }

    return null;
  }

  /**
   * Sets the current layer directly (e.g., from a NEW_GAME event).
   *
   * @param layer - The layer to set
   * @returns State change
   */
  setCurrentLayer(layer: Layer): LayerStateChange {
    const previous = this.current;

    if (previous && previous.name !== layer.name) {
      this.addToHistory(previous);
    }

    this.current = layer;
    this.logger.info(`Layer set to: ${layer.name}`);

    return {
      type: 'layer_changed',
      layer,
      previous: previous ?? undefined,
    };
  }

  /**
   * Clears all layer data.
   */
  clear(): void {
    this.current = null;
    this.next = null;
    this.history = [];

    this.logger.debug('Layer service cleared');
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Converts RCON map info to a Layer object.
   */
  private mapInfoToLayer(mapInfo: MapInfo): Layer | null {
    if (!mapInfo.layer) {
      return null;
    }

    return createLayerFromRcon({
      level: mapInfo.level ?? '',
      layer: mapInfo.layer,
    });
  }

  /**
   * Adds a layer to history.
   */
  private addToHistory(layer: Layer): void {
    // Close the current history entry
    const now = new Date();

    // Find and update the current entry's end time
    if (this.history.length > 0 && this.history[0]?.endedAt === null) {
      const currentEntry = this.history[0];
      if (currentEntry) {
        this.history[0] = {
          ...currentEntry,
          endedAt: now,
        };
      }
    }

    // Add new entry at the beginning
    this.history.unshift({
      layer,
      startedAt: now,
      endedAt: null,
    });

    // Trim history to max size
    if (this.history.length > this.historySize) {
      this.history = this.history.slice(0, this.historySize);
    }

    this.logger.debug(`Added layer to history: ${layer.name}`);
  }
}

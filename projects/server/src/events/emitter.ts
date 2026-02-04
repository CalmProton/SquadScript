/**
 * @squadscript/server
 *
 * Type-safe event emitter for server events.
 *
 * @module
 */

import { EventEmitter } from 'events';
import type { ServerEventMap } from '../types.js';

/**
 * Listener function type for events.
 */
type EventListener<T> = T extends void ? () => void | Promise<void> : (data: T) => void | Promise<void>;

/**
 * Type-safe event emitter for SquadServer events.
 *
 * This wrapper around Node's EventEmitter provides compile-time
 * type checking for event names and their corresponding payload types.
 *
 * @example
 * ```typescript
 * const emitter = new TypedEventEmitter<ServerEventMap>();
 *
 * // Type-safe: callback receives PlayerTeamChangeEvent
 * emitter.on('PLAYER_TEAM_CHANGE', (event) => {
 *   console.log(`${event.player.name} changed teams`);
 * });
 *
 * // Type error: 'INVALID_EVENT' doesn't exist
 * emitter.on('INVALID_EVENT', () => {});
 * ```
 */
export class TypedEventEmitter<TEventMap extends object = ServerEventMap> {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Increase max listeners for plugins that subscribe to many events
    this.emitter.setMaxListeners(100);
  }

  /**
   * Registers an event listener.
   *
   * @param event - The event name to listen for
   * @param listener - Callback to invoke when event is emitted
   * @returns This emitter for chaining
   */
  on<K extends keyof TEventMap & string>(
    event: K,
    listener: EventListener<TEventMap[K]>,
  ): this {
    this.emitter.on(event, listener as (...args: unknown[]) => void);
    return this;
  }

  /**
   * Registers a one-time event listener.
   *
   * The listener will be automatically removed after the first invocation.
   *
   * @param event - The event name to listen for
   * @param listener - Callback to invoke when event is emitted
   * @returns This emitter for chaining
   */
  once<K extends keyof TEventMap & string>(
    event: K,
    listener: EventListener<TEventMap[K]>,
  ): this {
    this.emitter.once(event, listener as (...args: unknown[]) => void);
    return this;
  }

  /**
   * Removes an event listener.
   *
   * @param event - The event name
   * @param listener - The listener to remove
   * @returns This emitter for chaining
   */
  off<K extends keyof TEventMap & string>(
    event: K,
    listener: EventListener<TEventMap[K]>,
  ): this {
    this.emitter.off(event, listener as (...args: unknown[]) => void);
    return this;
  }

  /**
   * Removes all listeners for an event, or all listeners if no event specified.
   *
   * @param event - Optional event name to remove listeners for
   * @returns This emitter for chaining
   */
  removeAllListeners<K extends keyof TEventMap & string>(event?: K): this {
    if (event) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
    return this;
  }

  /**
   * Emits an event with the given data.
   *
   * The event data is frozen before emission to prevent mutation.
   *
   * @param event - The event name to emit
   * @param data - The event data
   * @returns True if the event had listeners, false otherwise
   */
  emit<K extends keyof TEventMap & string>(
    event: K,
    data: TEventMap[K],
  ): boolean {
    // Freeze the event data to prevent mutation by listeners
    const frozenData = Object.freeze(data);
    return this.emitter.emit(event, frozenData);
  }

  /**
   * Gets the number of listeners for an event.
   *
   * @param event - The event name
   * @returns Number of listeners
   */
  listenerCount<K extends keyof TEventMap & string>(event: K): number {
    return this.emitter.listenerCount(event);
  }

  /**
   * Gets all listeners for an event.
   *
   * @param event - The event name
   * @returns Array of listener functions
   */
  listeners<K extends keyof TEventMap & string>(
    event: K,
  ): Array<EventListener<TEventMap[K]>> {
    return this.emitter.listeners(event) as Array<EventListener<TEventMap[K]>>;
  }

  /**
   * Returns a promise that resolves the next time the event is emitted.
   *
   * @param event - The event name to wait for
   * @param options - Optional abort signal and timeout
   * @returns Promise resolving to the event data
   */
  waitFor<K extends keyof TEventMap & string>(
    event: K,
    options?: { signal?: AbortSignal; timeout?: number },
  ): Promise<TEventMap[K]> {
    return new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        options?.signal?.removeEventListener('abort', onAbort);
      };

      // Use explicit function reference to avoid type issues with conditional EventListener type
      const onEvent: EventListener<TEventMap[K]> = ((data: TEventMap[K]) => {
        cleanup();
        resolve(data);
      }) as EventListener<TEventMap[K]>;

      const onAbort = () => {
        cleanup();
        this.off(event, onEvent);
        reject(new Error('Aborted'));
      };

      if (options?.signal) {
        if (options.signal.aborted) {
          reject(new Error('Aborted'));
          return;
        }
        options.signal.addEventListener('abort', onAbort, { once: true });
      }

      if (options?.timeout) {
        timeoutId = setTimeout(() => {
          cleanup();
          this.off(event, onEvent);
          reject(new Error(`Timeout waiting for event: ${event}`));
        }, options.timeout);
      }

      this.once(event, onEvent);
    });
  }
}

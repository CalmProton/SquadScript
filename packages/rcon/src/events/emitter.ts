/**
 * @squadscript/rcon
 *
 * Type-safe event emitter for RCON events.
 *
 * Provides compile-time type checking for event names and payload types.
 *
 * @module
 */

import { EventEmitter } from 'events';
import type { AllEventMap } from '../types.js';

/**
 * Type-safe event emitter for RCON events.
 *
 * This wrapper around Node's EventEmitter provides compile-time
 * type checking for event names and their corresponding payload types.
 *
 * @example
 * ```typescript
 * const emitter = new TypedEventEmitter();
 *
 * // Type-safe: callback receives RconChatMessageEvent
 * emitter.on('CHAT_MESSAGE', (event) => {
 *   console.log(event.playerName, event.message);
 * });
 *
 * // Type error: 'INVALID_EVENT' doesn't exist
 * emitter.on('INVALID_EVENT', () => {});
 * ```
 */
export class TypedEventEmitter<
  TEventMap extends object = AllEventMap,
> {
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
  on<K extends keyof TEventMap>(
    event: K,
    listener: TEventMap[K] extends void
      ? () => void
      : (data: TEventMap[K]) => void,
  ): this {
    this.emitter.on(event as string, listener as (...args: unknown[]) => void);
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
  once<K extends keyof TEventMap>(
    event: K,
    listener: TEventMap[K] extends void
      ? () => void
      : (data: TEventMap[K]) => void,
  ): this {
    this.emitter.once(event as string, listener as (...args: unknown[]) => void);
    return this;
  }

  /**
   * Removes an event listener.
   *
   * @param event - The event name
   * @param listener - The listener to remove
   * @returns This emitter for chaining
   */
  off<K extends keyof TEventMap>(
    event: K,
    listener: TEventMap[K] extends void
      ? () => void
      : (data: TEventMap[K]) => void,
  ): this {
    this.emitter.off(event as string, listener as (...args: unknown[]) => void);
    return this;
  }

  /**
   * Removes all listeners for an event, or all listeners if no event specified.
   *
   * @param event - Optional event name to remove listeners for
   * @returns This emitter for chaining
   */
  removeAllListeners<K extends keyof TEventMap>(event?: K): this {
    if (event !== undefined) {
      this.emitter.removeAllListeners(event as string);
    } else {
      this.emitter.removeAllListeners();
    }
    return this;
  }

  /**
   * Emits an event with the given data.
   *
   * @param event - The event name
   * @param data - The event data (omit for void events)
   * @returns True if the event had listeners
   */
  emit<K extends keyof TEventMap>(
    event: K,
    ...args: TEventMap[K] extends void ? [] : [data: TEventMap[K]]
  ): boolean {
    return this.emitter.emit(event as string, ...args);
  }

  /**
   * Returns the number of listeners for an event.
   *
   * @param event - The event name
   * @returns Number of listeners
   */
  listenerCount<K extends keyof TEventMap>(event: K): number {
    return this.emitter.listenerCount(event as string);
  }

  /**
   * Returns all event names that have listeners.
   *
   * @returns Array of event names
   */
  eventNames(): Array<keyof TEventMap> {
    return this.emitter.eventNames() as Array<keyof TEventMap>;
  }

  /**
   * Returns the current max listeners setting.
   */
  getMaxListeners(): number {
    return this.emitter.getMaxListeners();
  }

  /**
   * Sets the maximum number of listeners per event.
   *
   * @param n - Maximum listeners
   * @returns This emitter for chaining
   */
  setMaxListeners(n: number): this {
    this.emitter.setMaxListeners(n);
    return this;
  }

  /**
   * Returns a promise that resolves when the event is emitted.
   *
   * @param event - The event to wait for
   * @returns Promise that resolves with the event data
   */
  waitFor<K extends keyof TEventMap>(
    event: K,
  ): Promise<TEventMap[K] extends void ? void : TEventMap[K]> {
    return new Promise((resolve) => {
      const handler = (data: TEventMap[K]) => {
        resolve(data as TEventMap[K] extends void ? void : TEventMap[K]);
      };
      this.once(event, handler as TEventMap[K] extends void
        ? () => void
        : (data: TEventMap[K]) => void);
    });
  }

  /**
   * Returns a promise that resolves when the event is emitted, or rejects on timeout.
   *
   * @param event - The event to wait for
   * @param timeoutMs - Maximum time to wait in milliseconds
   * @returns Promise that resolves with the event data or rejects on timeout
   */
  waitForWithTimeout<K extends keyof TEventMap>(
    event: K,
    timeoutMs: number,
  ): Promise<TEventMap[K] extends void ? void : TEventMap[K]> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off(event, handler as TEventMap[K] extends void
          ? () => void
          : (data: TEventMap[K]) => void);
        reject(new Error(`Timeout waiting for event '${String(event)}'`));
      }, timeoutMs);

      const handler = (data: TEventMap[K]) => {
        clearTimeout(timeout);
        resolve(data as TEventMap[K] extends void ? void : TEventMap[K]);
      };

      this.once(event, handler as TEventMap[K] extends void
        ? () => void
        : (data: TEventMap[K]) => void);
    });
  }
}

// Re-export the emitter type
export type { AllEventMap };

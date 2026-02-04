/**
 * @squadscript/log-parser
 *
 * Type-safe event emitter for log parser events.
 *
 * @module
 */

import { EventEmitter } from 'node:events';
import type { LogParserEventMap } from '../types.js';

/**
 * Type-safe event emitter for log parser events.
 *
 * Provides compile-time type checking for event names and payload types.
 */
export class TypedEventEmitter<TEventMap extends object = LogParserEventMap> {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Increase max listeners for plugins that subscribe to many events
    this.emitter.setMaxListeners(100);
  }

  /**
   * Registers an event listener.
   */
  on<K extends keyof TEventMap>(
    event: K,
    listener: (data: TEventMap[K]) => void,
  ): this {
    this.emitter.on(event as string, listener as (...args: unknown[]) => void);
    return this;
  }

  /**
   * Registers a one-time event listener.
   */
  once<K extends keyof TEventMap>(
    event: K,
    listener: (data: TEventMap[K]) => void,
  ): this {
    this.emitter.once(event as string, listener as (...args: unknown[]) => void);
    return this;
  }

  /**
   * Removes an event listener.
   */
  off<K extends keyof TEventMap>(
    event: K,
    listener: (data: TEventMap[K]) => void,
  ): this {
    this.emitter.off(event as string, listener as (...args: unknown[]) => void);
    return this;
  }

  /**
   * Removes all listeners for an event.
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
   */
  emit<K extends keyof TEventMap>(event: K, data: TEventMap[K]): boolean {
    return this.emitter.emit(event as string, data);
  }

  /**
   * Returns the number of listeners for an event.
   */
  listenerCount<K extends keyof TEventMap>(event: K): number {
    return this.emitter.listenerCount(event as string);
  }

  /**
   * Returns all event names that have listeners.
   */
  eventNames(): Array<keyof TEventMap> {
    return this.emitter.eventNames() as Array<keyof TEventMap>;
  }

  /**
   * Sets the maximum number of listeners per event.
   */
  setMaxListeners(n: number): this {
    this.emitter.setMaxListeners(n);
    return this;
  }

  /**
   * Returns a promise that resolves when the event is emitted.
   */
  waitFor<K extends keyof TEventMap>(event: K): Promise<TEventMap[K]> {
    return new Promise((resolve) => {
      const handler = (data: TEventMap[K]) => {
        resolve(data);
      };
      this.once(event, handler);
    });
  }

  /**
   * Returns a promise that resolves when the event is emitted or rejects on timeout.
   */
  waitForWithTimeout<K extends keyof TEventMap>(
    event: K,
    timeoutMs: number,
  ): Promise<TEventMap[K]> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off(event, handler);
        reject(new Error(`Timeout waiting for event '${String(event)}'`));
      }, timeoutMs);

      const handler = (data: TEventMap[K]) => {
        clearTimeout(timeout);
        resolve(data);
      };

      this.once(event, handler);
    });
  }
}

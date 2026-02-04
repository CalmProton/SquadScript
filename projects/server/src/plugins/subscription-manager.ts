/**
 * @squadscript/server
 *
 * Subscription Manager for tracking and cleaning up plugin resources.
 *
 * This class is responsible for tracking all event subscriptions, intervals,
 * and timeouts created by a plugin. When the plugin is unmounted, calling
 * `cleanup()` will automatically dispose of all tracked resources.
 *
 * This solves a major issue in SquadJS where plugins could leak resources
 * by not properly removing event listeners or clearing timers.
 *
 * @module
 */

import type { Unsubscribe } from '@squadscript/types';

/**
 * Timer reference type (from Bun/Node).
 */
type TimerRef = ReturnType<typeof setInterval>;

/**
 * Tracked interval with metadata.
 */
interface TrackedInterval {
  readonly id: TimerRef;
  readonly label: string;
}

/**
 * Tracked timeout with metadata.
 */
interface TrackedTimeout {
  readonly id: TimerRef;
  readonly label: string;
}

/**
 * Manages plugin resource subscriptions for automatic cleanup.
 *
 * Plugins should use this manager to track all event subscriptions and timers.
 * When the plugin unmounts, all tracked resources are automatically cleaned up.
 *
 * @example
 * ```typescript
 * const manager = new SubscriptionManager();
 *
 * // Track an event subscription
 * manager.trackSubscription(emitter.on('PLAYER_CONNECTED', handler));
 *
 * // Track an interval
 * manager.setInterval(() => updateState(), 5000, 'state-update');
 *
 * // Track a timeout
 * manager.setTimeout(() => checkConnection(), 10000, 'connection-check');
 *
 * // Later, clean up all resources
 * manager.cleanup();
 * ```
 */
export class SubscriptionManager {
  /** Event subscription unsubscribe functions. */
  private readonly subscriptions = new Set<Unsubscribe>();

  /** Tracked intervals. */
  private readonly intervals = new Map<TimerRef, TrackedInterval>();

  /** Tracked timeouts. */
  private readonly timeouts = new Map<TimerRef, TrackedTimeout>();

  /** Whether cleanup has been called. */
  private isCleanedUp = false;

  /**
   * Tracks an event subscription for later cleanup.
   *
   * @param unsubscribe - The unsubscribe function returned by `on()` or `once()`
   * @returns The same unsubscribe function for chaining
   *
   * @example
   * ```typescript
   * const unsub = manager.trackSubscription(
   *   events.on('CHAT_MESSAGE', handler)
   * );
   * ```
   */
  trackSubscription(unsubscribe: Unsubscribe): Unsubscribe {
    if (this.isCleanedUp) {
      throw new Error('Cannot track subscription after cleanup');
    }

    this.subscriptions.add(unsubscribe);

    // Return a wrapper that removes from tracking when called
    return () => {
      this.subscriptions.delete(unsubscribe);
      unsubscribe();
    };
  }

  /**
   * Creates a tracked interval.
   *
   * The interval will be automatically cleared when `cleanup()` is called.
   *
   * @param callback - Function to call on each interval
   * @param ms - Interval duration in milliseconds
   * @param label - Optional label for debugging
   * @returns Function to clear the interval early
   *
   * @example
   * ```typescript
   * const clear = manager.setInterval(
   *   () => refreshData(),
   *   30000,
   *   'data-refresh'
   * );
   *
   * // Can manually clear if needed
   * clear();
   * ```
   */
  setInterval(
    callback: () => void | Promise<void>,
    ms: number,
    label = 'unnamed',
  ): () => void {
    if (this.isCleanedUp) {
      throw new Error('Cannot set interval after cleanup');
    }

    // Wrap callback to handle async and prevent errors from propagating
    const wrappedCallback = () => {
      try {
        const result = callback();
        if (result instanceof Promise) {
          result.catch((error) => {
            console.error(`[SubscriptionManager] Interval "${label}" error:`, error);
          });
        }
      } catch (error) {
        console.error(`[SubscriptionManager] Interval "${label}" error:`, error);
      }
    };

    const id = setInterval(wrappedCallback, ms);
    this.intervals.set(id, { id, label });

    return () => {
      clearInterval(id);
      this.intervals.delete(id);
    };
  }

  /**
   * Creates a tracked timeout.
   *
   * The timeout will be automatically cleared when `cleanup()` is called.
   *
   * @param callback - Function to call when timeout fires
   * @param ms - Timeout duration in milliseconds
   * @param label - Optional label for debugging
   * @returns Function to clear the timeout early
   *
   * @example
   * ```typescript
   * const clear = manager.setTimeout(
   *   () => performAction(),
   *   5000,
   *   'delayed-action'
   * );
   *
   * // Can manually clear if needed
   * clear();
   * ```
   */
  setTimeout(
    callback: () => void | Promise<void>,
    ms: number,
    label = 'unnamed',
  ): () => void {
    if (this.isCleanedUp) {
      throw new Error('Cannot set timeout after cleanup');
    }

    // Wrap callback to handle async and auto-remove from tracking
    const wrappedCallback = () => {
      this.timeouts.delete(id);
      try {
        const result = callback();
        if (result instanceof Promise) {
          result.catch((error) => {
            console.error(`[SubscriptionManager] Timeout "${label}" error:`, error);
          });
        }
      } catch (error) {
        console.error(`[SubscriptionManager] Timeout "${label}" error:`, error);
      }
    };

    const id = setTimeout(wrappedCallback, ms);
    this.timeouts.set(id, { id, label });

    return () => {
      clearTimeout(id);
      this.timeouts.delete(id);
    };
  }

  /**
   * Gets the count of active subscriptions.
   *
   * Useful for debugging and testing to ensure no leaks.
   */
  get subscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Gets the count of active intervals.
   */
  get intervalCount(): number {
    return this.intervals.size;
  }

  /**
   * Gets the count of active timeouts.
   */
  get timeoutCount(): number {
    return this.timeouts.size;
  }

  /**
   * Gets the total count of all tracked resources.
   */
  get totalCount(): number {
    return this.subscriptionCount + this.intervalCount + this.timeoutCount;
  }

  /**
   * Whether cleanup has been performed.
   */
  get cleaned(): boolean {
    return this.isCleanedUp;
  }

  /**
   * Cleans up all tracked resources.
   *
   * This method:
   * 1. Calls all subscription unsubscribe functions
   * 2. Clears all intervals
   * 3. Clears all timeouts
   * 4. Marks the manager as cleaned up (prevents new tracking)
   *
   * After calling cleanup(), no new resources can be tracked.
   *
   * @returns Summary of cleaned up resources
   *
   * @example
   * ```typescript
   * const result = manager.cleanup();
   * console.log(`Cleaned up ${result.subscriptions} subscriptions`);
   * ```
   */
  cleanup(): { subscriptions: number; intervals: number; timeouts: number } {
    if (this.isCleanedUp) {
      return { subscriptions: 0, intervals: 0, timeouts: 0 };
    }

    const counts = {
      subscriptions: this.subscriptions.size,
      intervals: this.intervals.size,
      timeouts: this.timeouts.size,
    };

    // Unsubscribe all event listeners
    for (const unsubscribe of this.subscriptions) {
      try {
        unsubscribe();
      } catch {
        // Ignore errors during cleanup - the listener may already be removed
      }
    }
    this.subscriptions.clear();

    // Clear all intervals
    for (const { id } of this.intervals.values()) {
      clearInterval(id);
    }
    this.intervals.clear();

    // Clear all timeouts
    for (const { id } of this.timeouts.values()) {
      clearTimeout(id);
    }
    this.timeouts.clear();

    this.isCleanedUp = true;

    return counts;
  }

  /**
   * Resets the manager to allow reuse.
   *
   * This clears the cleaned-up flag without disposing of any resources.
   * Only use this if you want to reuse the manager after cleanup.
   *
   * @internal
   */
  reset(): void {
    this.isCleanedUp = false;
  }
}

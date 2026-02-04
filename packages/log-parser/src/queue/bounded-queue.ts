/**
 * @squadscript/log-parser
 *
 * Bounded queue for log line processing with backpressure control.
 *
 * Prevents memory exhaustion when log lines arrive faster than
 * they can be processed.
 *
 * @module
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Options for BoundedQueue configuration.
 */
export interface BoundedQueueOptions {
  /**
   * Maximum number of items in the queue.
   * When exceeded, oldest items are dropped.
   * @default 10000
   */
  readonly maxSize?: number;

  /**
   * Warning threshold as a percentage of maxSize.
   * When queue reaches this level, onHighWaterMark is called.
   * @default 0.8 (80%)
   */
  readonly highWaterMark?: number;

  /**
   * Callback when queue reaches high water mark.
   */
  readonly onHighWaterMark?: (depth: number, maxSize: number) => void;

  /**
   * Callback when items are dropped due to queue overflow.
   */
  readonly onDrop?: (droppedCount: number) => void;
}

/**
 * Statistics about queue operations.
 */
export interface QueueStats {
  /** Total items ever enqueued. */
  readonly totalEnqueued: number;

  /** Total items ever dequeued. */
  readonly totalDequeued: number;

  /** Total items dropped due to overflow. */
  readonly totalDropped: number;

  /** Current queue depth. */
  readonly currentDepth: number;

  /** Maximum queue size allowed. */
  readonly maxSize: number;

  /** Peak depth reached during operation. */
  readonly peakDepth: number;
}

// =============================================================================
// BoundedQueue Class
// =============================================================================

/**
 * A bounded FIFO queue with backpressure support.
 *
 * When the queue reaches capacity, oldest items are dropped to make room
 * for new items. This prevents memory exhaustion during log processing spikes.
 *
 * @example
 * ```typescript
 * const queue = new BoundedQueue<string>({
 *   maxSize: 10000,
 *   highWaterMark: 0.8,
 *   onHighWaterMark: (depth, max) => {
 *     logger.warn(`Queue at ${depth}/${max}`);
 *   },
 * });
 *
 * queue.enqueue("log line 1");
 * const line = queue.dequeue();
 * ```
 */
export class BoundedQueue<T> {
  private readonly items: T[] = [];
  private readonly maxSize: number;
  private readonly highWaterMark: number;
  private readonly onHighWaterMark?: ((depth: number, maxSize: number) => void) | undefined;
  private readonly onDrop?: ((droppedCount: number) => void) | undefined;

  private totalEnqueued = 0;
  private totalDequeued = 0;
  private totalDropped = 0;
  private peakDepth = 0;
  private highWaterMarkTriggered = false;

  constructor(options: BoundedQueueOptions = {}) {
    this.maxSize = options.maxSize ?? 10000;
    this.highWaterMark = options.highWaterMark ?? 0.8;
    this.onHighWaterMark = options.onHighWaterMark;
    this.onDrop = options.onDrop;
  }

  /**
   * Adds an item to the end of the queue.
   *
   * If the queue is at capacity, the oldest item is dropped.
   *
   * @param item - Item to add
   * @returns True if item was added without dropping, false if an item was dropped
   */
  enqueue(item: T): boolean {
    let dropped = false;

    // Drop oldest if at capacity
    if (this.items.length >= this.maxSize) {
      this.items.shift();
      this.totalDropped++;
      dropped = true;
      this.onDrop?.(1);
    }

    this.items.push(item);
    this.totalEnqueued++;

    // Track peak depth
    if (this.items.length > this.peakDepth) {
      this.peakDepth = this.items.length;
    }

    // Check high water mark
    this.checkHighWaterMark();

    return !dropped;
  }

  /**
   * Adds multiple items to the queue.
   *
   * More efficient than calling enqueue repeatedly.
   *
   * @param items - Items to add
   * @returns Number of items dropped to make room
   */
  enqueueMany(items: readonly T[]): number {
    if (items.length === 0) return 0;

    let droppedCount = 0;

    // Calculate how many items need to be dropped
    const spaceNeeded = items.length - (this.maxSize - this.items.length);

    if (spaceNeeded > 0) {
      // Drop from current queue first
      const dropFromQueue = Math.min(spaceNeeded, this.items.length);
      this.items.splice(0, dropFromQueue);
      droppedCount += dropFromQueue;

      // If we still need space, drop from incoming items
      const dropFromIncoming = spaceNeeded - dropFromQueue;
      if (dropFromIncoming > 0) {
        items = items.slice(dropFromIncoming);
        droppedCount += dropFromIncoming;
      }

      this.totalDropped += droppedCount;
      this.onDrop?.(droppedCount);
    }

    // Add all remaining items
    this.items.push(...items);
    this.totalEnqueued += items.length;

    // Track peak depth
    if (this.items.length > this.peakDepth) {
      this.peakDepth = this.items.length;
    }

    this.checkHighWaterMark();

    return droppedCount;
  }

  /**
   * Removes and returns the oldest item from the queue.
   *
   * @returns The oldest item, or undefined if queue is empty
   */
  dequeue(): T | undefined {
    const item = this.items.shift();
    if (item !== undefined) {
      this.totalDequeued++;

      // Reset high water mark trigger when queue drops
      if (this.items.length < this.maxSize * this.highWaterMark) {
        this.highWaterMarkTriggered = false;
      }
    }
    return item;
  }

  /**
   * Removes and returns multiple items from the queue.
   *
   * @param count - Maximum number of items to dequeue
   * @returns Array of dequeued items (may be less than count)
   */
  dequeueMany(count: number): T[] {
    const actualCount = Math.min(count, this.items.length);
    const items = this.items.splice(0, actualCount);
    this.totalDequeued += items.length;

    // Reset high water mark trigger when queue drops
    if (this.items.length < this.maxSize * this.highWaterMark) {
      this.highWaterMarkTriggered = false;
    }

    return items;
  }

  /**
   * Returns the oldest item without removing it.
   *
   * @returns The oldest item, or undefined if queue is empty
   */
  peek(): T | undefined {
    return this.items[0];
  }

  /**
   * Removes all items from the queue.
   */
  clear(): void {
    const count = this.items.length;
    this.items.length = 0;
    this.totalDequeued += count;
    this.highWaterMarkTriggered = false;
  }

  /**
   * Returns the current number of items in the queue.
   */
  get size(): number {
    return this.items.length;
  }

  /**
   * Returns true if the queue is empty.
   */
  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Returns true if the queue is at capacity.
   */
  get isFull(): boolean {
    return this.items.length >= this.maxSize;
  }

  /**
   * Returns queue statistics.
   */
  getStats(): QueueStats {
    return {
      totalEnqueued: this.totalEnqueued,
      totalDequeued: this.totalDequeued,
      totalDropped: this.totalDropped,
      currentDepth: this.items.length,
      maxSize: this.maxSize,
      peakDepth: this.peakDepth,
    };
  }

  /**
   * Resets statistics counters (but not the queue contents).
   */
  resetStats(): void {
    this.totalEnqueued = 0;
    this.totalDequeued = 0;
    this.totalDropped = 0;
    this.peakDepth = this.items.length;
  }

  /**
   * Checks if high water mark is reached and triggers callback.
   */
  private checkHighWaterMark(): void {
    if (
      !this.highWaterMarkTriggered &&
      this.items.length >= this.maxSize * this.highWaterMark
    ) {
      this.highWaterMarkTriggered = true;
      this.onHighWaterMark?.(this.items.length, this.maxSize);
    }
  }

  /**
   * Allows iterating over queue contents without removing them.
   */
  *[Symbol.iterator](): Iterator<T> {
    for (const item of this.items) {
      yield item;
    }
  }
}

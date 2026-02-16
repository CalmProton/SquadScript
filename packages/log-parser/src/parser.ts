/**
 * @squadscript/log-parser
 *
 * Main LogParser class.
 *
 * Orchestrates log reading, parsing, and event emission.
 *
 * @module
 */

import type { Logger } from '@squadscript/logger';
import type { Result } from '@squadscript/types';
import { Ok, Err } from '@squadscript/types';
import { TypedEventEmitter } from './events/emitter.js';
import type { LogReader } from './readers/base.js';
import type { ParsingRule, ParseContext } from './rules/base.js';
import { defaultRules } from './rules/index.js';
import { EventStore } from './store/event-store.js';
import { BoundedQueue } from './queue/bounded-queue.js';
import { LogParserError } from './errors.js';
import type {
  LogParserEventMap,
  LogParserOptions,
  ParserStats,
  InternalStats,
} from './types.js';

// =============================================================================
// LogParser Class
// =============================================================================

/**
 * High-performance log parser for Squad dedicated servers.
 *
 * Reads log files using a LogReader implementation, matches lines against
 * parsing rules, and emits typed events for consumption.
 *
 * Features:
 * - Type-safe event emission
 * - Backpressure-aware queue
 * - Event correlation via EventStore
 * - Pre-compiled regex for performance
 * - Statistics tracking
 *
 * @example
 * ```typescript
 * const reader = new TailLogReader({
 *   logDir: '/path/to/logs',
 *   filename: 'SquadGame.log',
 * });
 *
 * const parser = new LogParser({
 *   reader,
 *   logger: logger.child('log-parser'),
 * });
 *
 * parser.on('PLAYER_CONNECTED', (event) => {
 *   console.log(`${event.player.eosID} connected from ${event.ip}`);
 * });
 *
 * await parser.watch();
 * ```
 */
export class LogParser extends TypedEventEmitter<LogParserEventMap> {
  private readonly reader: LogReader;
  private readonly logger: Logger;
  private readonly rules: readonly ParsingRule[];
  private readonly store: EventStore;
  private readonly queue: BoundedQueue<string>;
  private readonly unmatchedSamples: string[] = [];

  private isWatching = false;
  private processingInterval: ReturnType<typeof setInterval> | null = null;
  private statsInterval: ReturnType<typeof setInterval> | null = null;

  private readonly stats: InternalStats = {
    linesProcessed: 0,
    linesMatched: 0,
    linesUnmatched: 0,
    linesDropped: 0,
    eventCounts: {},
    totalLatencyMs: 0,
    matchedForLatency: 0,
  };

  constructor(options: LogParserOptions) {
    super();

    this.reader = options.reader;
    this.logger = options.logger;
    this.rules = options.rules ?? defaultRules;
    this.store = options.store ?? new EventStore();

    // Create bounded queue with backpressure handling
    this.queue = new BoundedQueue<string>({
      maxSize: options.maxQueueSize ?? 10000,
      highWaterMark: 0.8,
      onHighWaterMark: (depth, max) => {
        this.logger.warn('log-parser', `Log queue at ${depth}/${max} - parser may be falling behind`);
      },
      onDrop: (count) => {
        this.stats.linesDropped += count;
        this.logger.warn('log-parser', `Dropped ${count} log lines due to queue overflow`);
      },
    });

    this.logger.debug('log-parser', 'LogParser initialized', {
      ruleCount: this.rules.length,
      maxQueueSize: options.maxQueueSize ?? 10000,
    });
  }

  /**
   * Starts watching the log file and processing lines.
   *
   * @returns Result indicating success or failure
   */
  async watch(): Promise<Result<void, LogParserError>> {
    if (this.isWatching) {
      return Err(new LogParserError(
        'ALREADY_WATCHING',
        'Log parser is already watching',
      ));
    }

    this.logger.info('log-parser', 'Starting log parser...');

    // Start the log reader
    const watchResult = await this.reader.watch((line) => {
      this.queue.enqueue(line);
    });

    if (!watchResult.ok) {
      return Err(new LogParserError(
        'QUEUE_FULL',
        `Failed to start log reader: ${watchResult.error.message}`,
        undefined,
        watchResult.error,
      ));
    }

    this.isWatching = true;

    // Start processing loop
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 10); // Process every 10ms

    // Start stats logging
    this.statsInterval = setInterval(() => {
      this.logStats();
    }, 60 * 1000); // Log stats every minute

    this.logger.info('log-parser', 'Log parser started', {
      filePath: this.reader.filePath,
    });

    return Ok(undefined);
  }

  /**
   * Stops watching and processing.
   *
   * @returns Result indicating success or failure
   */
  async unwatch(): Promise<Result<void, LogParserError>> {
    if (!this.isWatching) {
      return Err(new LogParserError(
        'NOT_WATCHING',
        'Log parser is not watching',
      ));
    }

    this.logger.info('log-parser', 'Stopping log parser...');

    // Stop intervals
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    // Stop reader
    const unwatchResult = await this.reader.unwatch();
    if (!unwatchResult.ok) {
      this.logger.warn('log-parser', 'Error stopping log reader', { error: unwatchResult.error.message });
    }

    // Process remaining queue
    this.processQueue();

    this.isWatching = false;
    this.logger.info('log-parser', 'Log parser stopped');

    return Ok(undefined);
  }

  /**
   * Returns current parser statistics.
   */
  getStats(): ParserStats {
    const queueStats = this.queue.getStats();

    return {
      linesProcessed: this.stats.linesProcessed,
      linesMatched: this.stats.linesMatched,
      linesUnmatched: this.stats.linesUnmatched,
      linesDropped: this.stats.linesDropped,
      eventCounts: { ...this.stats.eventCounts },
      queueDepth: queueStats.currentDepth,
      averageLatencyMs: this.stats.matchedForLatency > 0
        ? this.stats.totalLatencyMs / this.stats.matchedForLatency
        : 0,
      peakQueueDepth: queueStats.peakDepth,
    };
  }

  /**
   * Resets statistics counters.
   */
  resetStats(): void {
    this.stats.linesProcessed = 0;
    this.stats.linesMatched = 0;
    this.stats.linesUnmatched = 0;
    this.stats.linesDropped = 0;
    this.stats.eventCounts = {};
    this.stats.totalLatencyMs = 0;
    this.stats.matchedForLatency = 0;
    this.queue.resetStats();
  }

  /**
   * Returns the event store for external access.
   */
  getStore(): EventStore {
    return this.store;
  }

  /**
   * Whether the parser is currently watching.
   */
  get watching(): boolean {
    return this.isWatching;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Processes all lines currently in the queue.
   */
  private processQueue(): void {
    // Process in batches to avoid blocking
    const batch = this.queue.dequeueMany(100);

    for (const line of batch) {
      this.processLine(line);
    }
  }

  /**
   * Processes a single log line.
   */
  private processLine(line: string): void {
    this.stats.linesProcessed++;

    const context: ParseContext = {
      store: this.store,
      logger: this.logger,
    };

    // Try each rule in order
    for (const rule of this.rules) {
      const match = rule.regex.exec(line);
      if (!match) {
        continue;
      }

      this.logger.verbose('log-parser', `Matched rule: ${rule.name}`);

      try {
        const startTime = performance.now();
        const event = rule.parse(match, context);
        const endTime = performance.now();

        if (event !== null) {
          // Track stats
          this.stats.linesMatched++;
          this.stats.eventCounts[rule.eventName] =
            (this.stats.eventCounts[rule.eventName] ?? 0) + 1;
          this.stats.totalLatencyMs += endTime - startTime;
          this.stats.matchedForLatency++;

          // Emit the event
          this.emit(rule.eventName as keyof LogParserEventMap, event as never);
        }
      } catch (error) {
        this.logger.error('log-parser', `Error in rule ${rule.name}`, error instanceof Error ? error : undefined);
      }

      // Stop after first match
      return;
    }

    // No rule matched
    this.stats.linesUnmatched++;

    if (this.unmatchedSamples.length < 5 && line.length > 0) {
      this.unmatchedSamples.push(line.slice(0, 220));
    }

    // Log unmatched lines at trace level for debugging
    this.logger.verbose('log-parser', `Unmatched line: ${line.slice(0, 100)}...`);
  }

  /**
   * Logs current statistics.
   */
  private logStats(): void {
    const stats = this.getStats();

    this.logger.info('log-parser', 'Log parser stats', {
      linesProcessed: stats.linesProcessed,
      linesMatched: stats.linesMatched,
      linesUnmatched: stats.linesUnmatched,
      linesDropped: stats.linesDropped,
      queueDepth: stats.queueDepth,
      averageLatencyMs: stats.averageLatencyMs.toFixed(2),
    });

    if (stats.linesProcessed >= 1000 && stats.linesMatched === 0) {
      this.logger.warn(
        'log-parser',
        'No log lines matched parser rules yet; Squad log format may differ from expected patterns',
        {
          sampleUnmatchedLines: this.unmatchedSamples,
        },
      );
    }
  }
}

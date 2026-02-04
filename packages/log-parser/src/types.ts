/**
 * @squadscript/log-parser
 *
 * Type definitions for log parser.
 *
 * @module
 */

import type { Logger } from '@squadscript/logger';
import type {
  PlayerConnectedEvent,
  PlayerDisconnectedEvent,
  PlayerJoinSucceededEvent,
  PlayerPossessEvent,
  PlayerUnpossessEvent,
  PlayerDamagedEvent,
  PlayerWoundedEvent,
  PlayerDiedEvent,
  PlayerRevivedEvent,
  NewGameEvent,
  RoundEndedEvent,
  RoundTicketsEvent,
  RoundWinnerEvent,
  AdminBroadcastEvent,
  ServerTickRateEvent,
  DeployableDamagedEvent,
} from '@squadscript/types';
import type { LogReader } from './readers/base.js';
import type { ParsingRule } from './rules/base.js';
import type { EventStore } from './store/event-store.js';

// =============================================================================
// Event Map
// =============================================================================

/**
 * Event map for LogParser typed event emission.
 *
 * Maps event names to their corresponding event types.
 */
export interface LogParserEventMap {
  // Player lifecycle events
  PLAYER_CONNECTED: PlayerConnectedEvent;
  PLAYER_DISCONNECTED: PlayerDisconnectedEvent;
  PLAYER_JOIN_SUCCEEDED: PlayerJoinSucceededEvent;
  PLAYER_POSSESS: PlayerPossessEvent;
  PLAYER_UNPOSSESS: PlayerUnpossessEvent;

  // Combat events
  PLAYER_DAMAGED: PlayerDamagedEvent;
  PLAYER_WOUNDED: PlayerWoundedEvent;
  PLAYER_DIED: PlayerDiedEvent;
  PLAYER_REVIVED: PlayerRevivedEvent;

  // Deployable events
  DEPLOYABLE_DAMAGED: DeployableDamagedEvent;

  // Game events
  NEW_GAME: NewGameEvent;
  ROUND_ENDED: RoundEndedEvent;
  ROUND_TICKETS: RoundTicketsEvent;
  ROUND_WINNER: RoundWinnerEvent;

  // Server events
  SERVER_TICK_RATE: ServerTickRateEvent;

  // Admin events
  ADMIN_BROADCAST: AdminBroadcastEvent;
}

/**
 * All event names that the log parser can emit.
 */
export type LogParserEventName = keyof LogParserEventMap;

// =============================================================================
// Configuration
// =============================================================================

/**
 * Options for LogParser construction.
 */
export interface LogParserOptions {
  /**
   * The log reader implementation to use.
   */
  readonly reader: LogReader;

  /**
   * Logger for debug output and errors.
   */
  readonly logger: Logger;

  /**
   * Parsing rules to use.
   * If not provided, uses default rules.
   */
  readonly rules?: readonly ParsingRule[];

  /**
   * Event store for correlation.
   * If not provided, a new store is created.
   */
  readonly store?: EventStore;

  /**
   * Maximum queue size for line processing.
   * When exceeded, oldest lines are dropped.
   * @default 10000
   */
  readonly maxQueueSize?: number;

  /**
   * Whether to skip lines that existed before watching started.
   * @default true
   */
  readonly skipExisting?: boolean;
}

// =============================================================================
// Statistics
// =============================================================================

/**
 * Parser statistics for monitoring.
 */
export interface ParserStats {
  /** Total lines processed. */
  readonly linesProcessed: number;

  /** Lines that matched a rule. */
  readonly linesMatched: number;

  /** Lines that didn't match any rule. */
  readonly linesUnmatched: number;

  /** Lines dropped due to queue overflow. */
  readonly linesDropped: number;

  /** Events emitted by type. */
  readonly eventCounts: Readonly<Record<string, number>>;

  /** Current queue depth. */
  readonly queueDepth: number;

  /** Average matching latency in milliseconds. */
  readonly averageLatencyMs: number;

  /** Peak queue depth reached. */
  readonly peakQueueDepth: number;
}

// =============================================================================
// Internal Types
// =============================================================================

/**
 * Internal statistics tracking.
 */
export interface InternalStats {
  linesProcessed: number;
  linesMatched: number;
  linesUnmatched: number;
  linesDropped: number;
  eventCounts: Record<string, number>;
  totalLatencyMs: number;
  matchedForLatency: number;
}

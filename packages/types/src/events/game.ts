/**
 * @squadscript/types
 *
 * Game event types (new game, round end, tickets, etc.).
 *
 * @module
 */

import type { BaseEvent } from './base.js';
import type { Layer } from '../layer.js';
import type { TeamID } from '../branded.js';

/**
 * Emitted when a new game/match starts.
 */
export interface NewGameEvent extends BaseEvent {
  /** The layer being played. */
  readonly layer: Layer | null;

  /** The level/map name. */
  readonly level: string;

  /** The layer name. */
  readonly layerName: string;

  /** Whether this is the first game since server start. */
  readonly isFirstGame: boolean;
}

/**
 * Emitted when a round ends.
 */
export interface RoundEndedEvent extends BaseEvent {
  /** The winning team ID (1 or 2). */
  readonly winner: TeamID | null;

  /** Team 1's final ticket count. */
  readonly team1Tickets: number;

  /** Team 2's final ticket count. */
  readonly team2Tickets: number;

  /** Duration of the round in seconds. */
  readonly durationSeconds: number;

  /** The layer that was played. */
  readonly layer: Layer | null;
}

/**
 * Emitted periodically with ticket counts.
 */
export interface RoundTicketsEvent extends BaseEvent {
  /** Team 1's current ticket count. */
  readonly team1Tickets: number;

  /** Team 2's current ticket count. */
  readonly team2Tickets: number;
}

/**
 * Emitted when a round winner is determined.
 *
 * This may fire slightly before RoundEndedEvent.
 */
export interface RoundWinnerEvent extends BaseEvent {
  /** The winning team ID. */
  readonly winner: TeamID;

  /** The winning team's faction/subfaction. */
  readonly winnerFaction: string | null;

  /** The losing team's faction/subfaction. */
  readonly loserFaction: string | null;
}

/**
 * Emitted periodically with server tick rate.
 */
export interface ServerTickRateEvent extends BaseEvent {
  /** Current server tick rate. */
  readonly tickRate: number;

  /** Average tick rate over the measurement period. */
  readonly averageTickRate: number;
}

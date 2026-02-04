/**
 * @squadscript/log-parser
 *
 * Type definitions for event store.
 *
 * @module
 */

import type {
  EOSID,
  SteamID,
  PlayerController,
  ChainID,
} from '@squadscript/types';

// =============================================================================
// Stored Data Types
// =============================================================================

/**
 * Stored player data for event correlation.
 *
 * This is minimal data kept across events to correlate
 * player identity when full player objects aren't available.
 */
export interface StoredPlayer {
  /** Player controller identifier. */
  readonly controller?: PlayerController | string | undefined;

  /** Steam ID if known. */
  readonly steamID?: SteamID | undefined;

  /** EOS ID (primary identifier). */
  readonly eosID: EOSID;

  /** Player name if known. */
  readonly name?: string | undefined;

  /** Player IP address. */
  readonly ip?: string | undefined;

  /** Name suffix from join event. */
  readonly suffix?: string | undefined;
}

/**
 * Join request data for correlating PLAYER_CONNECTED -> JOIN_SUCCEEDED events.
 *
 * When a player connects, we store their connection info indexed by ChainID.
 * When JOIN_SUCCEEDED fires (same ChainID), we can correlate the data.
 */
export interface JoinRequest {
  /** Partial player info from connection event. */
  readonly player: {
    readonly controller?: PlayerController | string | undefined;
    readonly steamID?: SteamID | undefined;
    readonly eosID: EOSID;
  };

  /** Player's IP address at connection time. */
  readonly ip: string;

  /** ChainID from the connection event. */
  readonly chainID: ChainID;
}

/**
 * Combat session data for correlating damage -> wound -> death events.
 *
 * Damage events store information that may be needed by subsequent
 * wound or death events in the same combat chain.
 */
export interface CombatSession {
  /** Chain ID for this combat session. */
  readonly chainID: ChainID;

  /** Victim name (used as key). */
  readonly victimName: string;

  /** Last damage info. */
  readonly lastDamage?: {
    readonly damage: number;
    readonly weapon: string;
    readonly attackerEOSID?: EOSID | undefined;
    readonly attackerSteamID?: SteamID | undefined;
    readonly attackerController?: string | undefined;
    readonly attackerName?: string | undefined;
  } | undefined;

  /** Last wound info. */
  readonly lastWound?: {
    readonly time: Date;
    readonly damage: number;
    readonly weapon: string;
    readonly attackerController?: string | undefined;
  } | undefined;
}

/**
 * Round result data for correlating ROUND_WINNER -> ROUND_ENDED events.
 */
export interface RoundResult {
  /** Winning team info. */
  readonly winner?: {
    readonly team: string;
    readonly faction: string;
    readonly subfaction: string;
    readonly tickets: number;
  } | undefined;

  /** Losing team info. */
  readonly loser?: {
    readonly team: string;
    readonly faction: string;
    readonly subfaction: string;
    readonly tickets: number;
  } | undefined;

  /** Layer being played. */
  readonly layer?: string | undefined;

  /** Level/map name. */
  readonly level?: string | undefined;
}

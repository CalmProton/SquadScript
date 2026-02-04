/**
 * @squadscript/log-parser
 *
 * Event store for correlating related log events.
 *
 * The log parser receives events one line at a time, but many game events
 * span multiple log lines. The event store maintains state to correlate
 * related events and provide complete information.
 *
 * Examples:
 * - PLAYER_CONNECTED -> JOIN_SUCCEEDED (same ChainID)
 * - PLAYER_DAMAGED -> PLAYER_WOUNDED -> PLAYER_DIED (same victim)
 * - ROUND_WINNER -> NEW_GAME (winner stored for next game event)
 *
 * @module
 */

import type { EOSID, ChainID, PlayerController } from '@squadscript/types';
import type {
  StoredPlayer,
  JoinRequest,
  CombatSession,
  RoundResult,
} from './types.js';

// Re-export types for external use
export type {
  StoredPlayer,
  JoinRequest,
  CombatSession,
  RoundResult,
};

// =============================================================================
// EventStore Class
// =============================================================================

/**
 * Event store for correlating related log events.
 *
 * Maintains several data structures:
 * - `players`: Persistent player data indexed by EOS ID
 * - `joinRequests`: Pending connection requests indexed by ChainID
 * - `disconnected`: Recently disconnected players (cleared on map change)
 * - `session`: Combat session data for damage correlation
 * - `roundResult`: Current round winner/loser info
 *
 * @example
 * ```typescript
 * const store = new EventStore();
 *
 * // On PLAYER_CONNECTED
 * store.setJoinRequest(chainID, {
 *   player: { eosID, steamID, controller },
 *   ip: '127.0.0.1',
 *   chainID,
 * });
 *
 * // On JOIN_SUCCEEDED (same chainID)
 * const request = store.getJoinRequest(chainID);
 * if (request) {
 *   store.deleteJoinRequest(chainID);
 *   // Use request.player data
 * }
 * ```
 */
export class EventStore {
  // =========================================================================
  // Player Data
  // =========================================================================

  /**
   * Persistent player data indexed by EOS ID.
   * Persists across games until player disconnects and map changes.
   */
  private readonly players = new Map<EOSID, StoredPlayer>();

  /**
   * Pending join requests indexed by ChainID.
   * Used to correlate PLAYER_CONNECTED with JOIN_SUCCEEDED.
   */
  private readonly joinRequests = new Map<number, JoinRequest>();

  /**
   * Recently disconnected player EOS IDs.
   * Cleared on map change so disconnected players aren't removed immediately.
   */
  private readonly disconnected = new Set<EOSID>();

  // =========================================================================
  // Combat Data
  // =========================================================================

  /**
   * Combat session data indexed by victim name.
   * Used to correlate damage -> wound -> death events.
   */
  private readonly session = new Map<string, CombatSession>();

  /**
   * Current round result data.
   * Set by ROUND_WINNER, consumed by NEW_GAME.
   */
  private roundResult: RoundResult | null = null;

  // =========================================================================
  // Player Methods
  // =========================================================================

  /**
   * Gets stored player data by EOS ID.
   */
  getPlayer(eosID: EOSID): StoredPlayer | undefined {
    return this.players.get(eosID);
  }

  /**
   * Gets stored player data by controller.
   */
  getPlayerByController(controller: PlayerController | string): StoredPlayer | undefined {
    for (const player of this.players.values()) {
      if (player.controller === controller) {
        return player;
      }
    }
    return undefined;
  }

  /**
   * Sets or updates player data.
   */
  setPlayer(eosID: EOSID, player: StoredPlayer): void {
    this.players.set(eosID, player);
  }

  /**
   * Updates player data with a partial update.
   */
  updatePlayer(eosID: EOSID, update: Partial<StoredPlayer>): void {
    const existing = this.players.get(eosID);
    if (existing) {
      this.players.set(eosID, { ...existing, ...update });
    } else {
      // Create new entry with required eosID
      this.players.set(eosID, { eosID, ...update });
    }
  }

  /**
   * Deletes player data.
   */
  deletePlayer(eosID: EOSID): boolean {
    return this.players.delete(eosID);
  }

  /**
   * Checks if a player exists in the store.
   */
  hasPlayer(eosID: EOSID): boolean {
    return this.players.has(eosID);
  }

  /**
   * Gets all stored players.
   */
  getAllPlayers(): ReadonlyMap<EOSID, StoredPlayer> {
    return this.players;
  }

  // =========================================================================
  // Join Request Methods
  // =========================================================================

  /**
   * Gets a pending join request by ChainID.
   */
  getJoinRequest(chainID: ChainID | number): JoinRequest | undefined {
    const key = typeof chainID === 'number' ? chainID : chainID;
    return this.joinRequests.get(key);
  }

  /**
   * Sets a pending join request.
   */
  setJoinRequest(chainID: ChainID | number, request: JoinRequest): void {
    const key = typeof chainID === 'number' ? chainID : chainID;
    this.joinRequests.set(key, request);
  }

  /**
   * Deletes a join request.
   */
  deleteJoinRequest(chainID: ChainID | number): boolean {
    const key = typeof chainID === 'number' ? chainID : chainID;
    return this.joinRequests.delete(key);
  }

  // =========================================================================
  // Disconnected Player Methods
  // =========================================================================

  /**
   * Marks a player as disconnected.
   */
  markDisconnected(eosID: EOSID): void {
    this.disconnected.add(eosID);
  }

  /**
   * Checks if a player is marked as disconnected.
   */
  isDisconnected(eosID: EOSID): boolean {
    return this.disconnected.has(eosID);
  }

  /**
   * Clears the disconnected status for a player (e.g., on reconnect).
   */
  clearDisconnected(eosID: EOSID): boolean {
    return this.disconnected.delete(eosID);
  }

  // =========================================================================
  // Combat Session Methods
  // =========================================================================

  /**
   * Gets combat session data for a victim.
   */
  getSession(victimName: string): CombatSession | undefined {
    return this.session.get(victimName);
  }

  /**
   * Sets combat session data for a victim.
   */
  setSession(victimName: string, data: CombatSession): void {
    this.session.set(victimName, data);
  }

  /**
   * Updates combat session data.
   */
  updateSession(victimName: string, update: Partial<CombatSession>): void {
    const existing = this.session.get(victimName);
    if (existing) {
      this.session.set(victimName, { ...existing, ...update });
    }
  }

  /**
   * Deletes combat session data.
   */
  deleteSession(victimName: string): boolean {
    return this.session.delete(victimName);
  }

  // =========================================================================
  // Round Result Methods
  // =========================================================================

  /**
   * Gets the current round result.
   */
  getRoundResult(): RoundResult | null {
    return this.roundResult;
  }

  /**
   * Sets the round result.
   */
  setRoundResult(result: RoundResult): void {
    this.roundResult = result;
  }

  /**
   * Clears the round result.
   */
  clearRoundResult(): void {
    this.roundResult = null;
  }

  // =========================================================================
  // Cleanup Methods
  // =========================================================================

  /**
   * Clears session data and processes disconnected players.
   *
   * Called on map change (NEW_GAME event) to clean up stale data.
   * Disconnected players are removed from the player store.
   */
  clearOnMapChange(): void {
    // Remove disconnected players from store
    for (const eosID of this.disconnected) {
      this.players.delete(eosID);
    }

    // Clear disconnected set
    this.disconnected.clear();

    // Clear combat session data
    this.session.clear();

    // Clear join requests (shouldn't have any pending at map change)
    this.joinRequests.clear();
  }

  /**
   * Clears all data in the store.
   *
   * Used for testing or full reset.
   */
  clearAll(): void {
    this.players.clear();
    this.joinRequests.clear();
    this.disconnected.clear();
    this.session.clear();
    this.roundResult = null;
  }

  /**
   * Gets statistics about the store.
   */
  getStats(): {
    playerCount: number;
    joinRequestCount: number;
    disconnectedCount: number;
    sessionCount: number;
    hasRoundResult: boolean;
  } {
    return {
      playerCount: this.players.size,
      joinRequestCount: this.joinRequests.size,
      disconnectedCount: this.disconnected.size,
      sessionCount: this.session.size,
      hasRoundResult: this.roundResult !== null,
    };
  }
}

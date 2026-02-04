/**
 * @squadscript/server
 *
 * Player service - manages player state with efficient lookup indexes.
 *
 * @module
 */

import type { ModuleLogger } from '@squadscript/logger';
import type {
  Player,
  PartialPlayer,
  EOSID,
  SteamID,
  PlayerID,
  TeamID,
  SquadID,
  PlayerController,
} from '@squadscript/types';
import { asPlayerID, asTeamID, asSquadID } from '@squadscript/types';
import type { PlayerInfo } from '@squadscript/rcon';
import type { PlayerStateChange } from '../types.js';

/**
 * Options for creating a PlayerService.
 */
export interface PlayerServiceOptions {
  /** Logger instance. */
  readonly logger: ModuleLogger;
}

/**
 * Service for managing player state with efficient lookups.
 *
 * Maintains multiple indexes for O(1) lookups by:
 * - EOS ID (primary key)
 * - Steam ID
 * - Player ID (in-game)
 * - Name
 * - Controller ID
 *
 * All player objects are treated as immutable - updates create new objects.
 *
 * @example
 * ```typescript
 * const playerService = new PlayerService({ logger });
 *
 * // Update from RCON data
 * const changes = playerService.updateFromRcon(rconPlayers);
 *
 * // Lookup by various identifiers
 * const player = playerService.getByEOSID(eosId);
 * const player2 = playerService.getBySteamID(steamId);
 * ```
 */
export class PlayerService {
  private readonly logger: ModuleLogger;

  // Primary storage: EOSID -> Player
  private readonly players = new Map<EOSID, Player>();

  // Secondary indexes for fast lookups
  private readonly steamIDIndex = new Map<SteamID, EOSID>();
  private readonly playerIDIndex = new Map<PlayerID, EOSID>();
  private readonly nameIndex = new Map<string, EOSID>();
  private readonly controllerIndex = new Map<PlayerController, EOSID>();

  constructor(options: PlayerServiceOptions) {
    this.logger = options.logger;
  }

  // ===========================================================================
  // State Accessors
  // ===========================================================================

  /**
   * Gets all players as a readonly array.
   */
  getAll(): readonly Player[] {
    return Array.from(this.players.values());
  }

  /**
   * Gets the number of players.
   */
  get count(): number {
    return this.players.size;
  }

  /**
   * Gets a player by their EOS ID.
   *
   * @param eosID - The EOS ID to look up
   * @returns The player or null if not found
   */
  getByEOSID(eosID: EOSID): Player | null {
    return this.players.get(eosID) ?? null;
  }

  /**
   * Gets a player by their Steam ID.
   *
   * @param steamID - The Steam ID to look up
   * @returns The player or null if not found
   */
  getBySteamID(steamID: SteamID): Player | null {
    const eosID = this.steamIDIndex.get(steamID);
    if (!eosID) return null;
    return this.players.get(eosID) ?? null;
  }

  /**
   * Gets a player by their in-game player ID.
   *
   * @param playerID - The player ID to look up
   * @returns The player or null if not found
   */
  getByPlayerID(playerID: PlayerID): Player | null {
    const eosID = this.playerIDIndex.get(playerID);
    if (!eosID) return null;
    return this.players.get(eosID) ?? null;
  }

  /**
   * Gets a player by their name (case-insensitive).
   *
   * @param name - The player name to look up
   * @returns The player or null if not found
   */
  getByName(name: string): Player | null {
    const eosID = this.nameIndex.get(name.toLowerCase());
    if (!eosID) return null;
    return this.players.get(eosID) ?? null;
  }

  /**
   * Gets a player by their controller ID.
   *
   * @param controller - The controller ID to look up
   * @returns The player or null if not found
   */
  getByController(controller: PlayerController): Player | null {
    const eosID = this.controllerIndex.get(controller);
    if (!eosID) return null;
    return this.players.get(eosID) ?? null;
  }

  /**
   * Gets players on a specific team.
   *
   * @param teamID - The team ID
   * @returns Array of players on the team
   */
  getByTeam(teamID: TeamID): readonly Player[] {
    return Array.from(this.players.values()).filter(
      (player) => player.teamID === teamID,
    );
  }

  /**
   * Gets players in a specific squad.
   *
   * @param teamID - The team ID
   * @param squadID - The squad ID
   * @returns Array of players in the squad
   */
  getBySquad(teamID: TeamID, squadID: SquadID): readonly Player[] {
    return Array.from(this.players.values()).filter(
      (player) => player.teamID === teamID && player.squadID === squadID,
    );
  }

  // ===========================================================================
  // State Updates
  // ===========================================================================

  /**
   * Updates player state from RCON ListPlayers response.
   *
   * This is the primary method for updating player state. It:
   * - Adds new players
   * - Updates existing players
   * - Removes players no longer present
   * - Rebuilds all indexes
   *
   * @param rconPlayers - Array of player info from RCON
   * @returns Array of state changes that occurred
   */
  updateFromRcon(rconPlayers: readonly PlayerInfo[]): PlayerStateChange[] {
    const changes: PlayerStateChange[] = [];
    const seenEOSIDs = new Set<EOSID>();

    for (const rconPlayer of rconPlayers) {
      seenEOSIDs.add(rconPlayer.eosID);

      const existing = this.players.get(rconPlayer.eosID);
      const player = this.rconPlayerToPlayer(rconPlayer, existing);

      if (!existing) {
        // New player
        this.players.set(player.eosID, player);
        this.updateIndexes(player);
        changes.push({ player, type: 'added' });

        this.logger.debug(`Player added: ${player.name} (${player.eosID})`);
      } else if (this.hasPlayerChanged(existing, player)) {
        // Updated player
        this.players.set(player.eosID, player);
        this.updateIndexes(player, existing);
        changes.push({ player, type: 'updated', previous: existing });

        this.logger.trace(`Player updated: ${player.name}`);
      }
    }

    // Remove players no longer present
    for (const [eosID, player] of this.players) {
      if (!seenEOSIDs.has(eosID)) {
        this.removePlayer(eosID);
        changes.push({ player, type: 'removed' });

        this.logger.debug(`Player removed: ${player.name} (${player.eosID})`);
      }
    }

    return changes;
  }

  /**
   * Updates or adds a player from partial information.
   *
   * Used when we receive player data from log events that may not
   * include all fields.
   *
   * @param partial - Partial player information
   * @returns The updated or created player
   */
  updateFromPartial(partial: PartialPlayer): Player {
    const existing = this.players.get(partial.eosID);

    const player: Player = {
      playerID: existing?.playerID ?? asPlayerID(0)!,
      steamID: partial.steamID ?? existing?.steamID ?? null,
      eosID: partial.eosID,
      name: partial.name ?? existing?.name ?? 'Unknown',
      teamID: existing?.teamID ?? null,
      squadID: existing?.squadID ?? null,
      isSquadLeader: existing?.isSquadLeader ?? false,
      role: existing?.role ?? null,
      controller: partial.controller ?? existing?.controller ?? null,
      suffix: existing?.suffix ?? null,
    };

    this.players.set(player.eosID, player);
    this.updateIndexes(player, existing);

    return player;
  }

  /**
   * Enriches partial player data with full player information.
   *
   * Looks up the player by EOS ID and returns the full player object
   * if found, otherwise returns null.
   *
   * @param partial - Partial player information
   * @returns Full player object or null if not found
   */
  enrichPlayer(partial: PartialPlayer): Player | null {
    return this.players.get(partial.eosID) ?? null;
  }

  /**
   * Clears all player data.
   */
  clear(): void {
    this.players.clear();
    this.steamIDIndex.clear();
    this.playerIDIndex.clear();
    this.nameIndex.clear();
    this.controllerIndex.clear();

    this.logger.debug('Player service cleared');
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Converts RCON player info to our Player type.
   */
  private rconPlayerToPlayer(
    rconPlayer: PlayerInfo,
    existing?: Player,
  ): Player {
    return {
      playerID: rconPlayer.playerID,
      steamID: rconPlayer.steamID,
      eosID: rconPlayer.eosID,
      name: rconPlayer.name,
      teamID: rconPlayer.teamID ? asTeamID(rconPlayer.teamID) : null,
      squadID: rconPlayer.squadID ? asSquadID(rconPlayer.squadID) : null,
      isSquadLeader: rconPlayer.isLeader,
      role: rconPlayer.role || null,
      // Preserve controller from existing player or log parser
      controller: existing?.controller ?? null,
      suffix: existing?.suffix ?? null,
    };
  }

  /**
   * Checks if any player fields have changed.
   */
  private hasPlayerChanged(oldPlayer: Player, newPlayer: Player): boolean {
    return (
      oldPlayer.playerID !== newPlayer.playerID ||
      oldPlayer.steamID !== newPlayer.steamID ||
      oldPlayer.name !== newPlayer.name ||
      oldPlayer.teamID !== newPlayer.teamID ||
      oldPlayer.squadID !== newPlayer.squadID ||
      oldPlayer.isSquadLeader !== newPlayer.isSquadLeader ||
      oldPlayer.role !== newPlayer.role
    );
  }

  /**
   * Updates all secondary indexes for a player.
   */
  private updateIndexes(player: Player, oldPlayer?: Player): void {
    // Remove old index entries if player data changed
    if (oldPlayer) {
      if (oldPlayer.steamID && oldPlayer.steamID !== player.steamID) {
        this.steamIDIndex.delete(oldPlayer.steamID);
      }
      if (oldPlayer.playerID !== player.playerID) {
        this.playerIDIndex.delete(oldPlayer.playerID);
      }
      if (oldPlayer.name.toLowerCase() !== player.name.toLowerCase()) {
        this.nameIndex.delete(oldPlayer.name.toLowerCase());
      }
      if (oldPlayer.controller && oldPlayer.controller !== player.controller) {
        this.controllerIndex.delete(oldPlayer.controller);
      }
    }

    // Add new index entries
    if (player.steamID) {
      this.steamIDIndex.set(player.steamID, player.eosID);
    }
    this.playerIDIndex.set(player.playerID, player.eosID);
    this.nameIndex.set(player.name.toLowerCase(), player.eosID);
    if (player.controller) {
      this.controllerIndex.set(player.controller, player.eosID);
    }
  }

  /**
   * Removes a player and cleans up all indexes.
   */
  private removePlayer(eosID: EOSID): void {
    const player = this.players.get(eosID);
    if (!player) return;

    // Remove from all indexes
    if (player.steamID) {
      this.steamIDIndex.delete(player.steamID);
    }
    this.playerIDIndex.delete(player.playerID);
    this.nameIndex.delete(player.name.toLowerCase());
    if (player.controller) {
      this.controllerIndex.delete(player.controller);
    }

    // Remove from primary storage
    this.players.delete(eosID);
  }
}

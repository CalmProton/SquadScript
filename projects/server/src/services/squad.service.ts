/**
 * @squadscript/server
 *
 * Squad service - manages squad state.
 *
 * @module
 */

import type { ModuleLogger } from '@squadscript/logger';
import type {
  Squad,
  EOSID,
  TeamID,
  SquadID,
} from '@squadscript/types';
import { asSquadID, asTeamID } from '@squadscript/types';
import type { SquadInfo } from '@squadscript/rcon';
import type { SquadStateChange } from '../types.js';

/**
 * Composite key for squad lookups: teamID-squadID
 */
type SquadKey = `${TeamID}-${SquadID}`;

/**
 * Creates a squad key from team and squad IDs.
 */
function makeSquadKey(teamID: TeamID, squadID: SquadID): SquadKey {
  return `${teamID}-${squadID}`;
}

/**
 * Options for creating a SquadService.
 */
export interface SquadServiceOptions {
  /** Logger instance. */
  readonly logger: ModuleLogger;
}

/**
 * Service for managing squad state.
 *
 * Squads are keyed by a composite key of teamID-squadID since
 * squad IDs are only unique within a team.
 *
 * @example
 * ```typescript
 * const squadService = new SquadService({ logger });
 *
 * // Update from RCON data
 * const changes = squadService.updateFromRcon(rconSquads);
 *
 * // Lookup squads
 * const squad = squadService.getByID(1, 1);
 * const teamSquads = squadService.getByTeam(1);
 * ```
 */
export class SquadService {
  private readonly logger: ModuleLogger;

  // Primary storage: SquadKey -> Squad
  private readonly squads = new Map<SquadKey, Squad>();

  // Index by creator EOS ID
  private readonly creatorIndex = new Map<EOSID, SquadKey>();

  constructor(options: SquadServiceOptions) {
    this.logger = options.logger;
  }

  // ===========================================================================
  // State Accessors
  // ===========================================================================

  /**
   * Gets all squads as a readonly array.
   */
  getAll(): readonly Squad[] {
    return Array.from(this.squads.values());
  }

  /**
   * Gets the number of squads.
   */
  get count(): number {
    return this.squads.size;
  }

  /**
   * Gets a squad by team and squad ID.
   *
   * @param teamID - The team ID
   * @param squadID - The squad ID
   * @returns The squad or null if not found
   */
  getByID(teamID: TeamID, squadID: SquadID): Squad | null {
    const key = makeSquadKey(teamID, squadID);
    return this.squads.get(key) ?? null;
  }

  /**
   * Gets all squads for a team.
   *
   * @param teamID - The team ID
   * @returns Array of squads on the team
   */
  getByTeam(teamID: TeamID): readonly Squad[] {
    return Array.from(this.squads.values()).filter(
      (squad) => squad.teamID === teamID,
    );
  }

  /**
   * Gets the squad created by a specific player.
   *
   * @param creatorEOSID - The creator's EOS ID
   * @returns The squad or null if not found
   */
  getByCreator(creatorEOSID: EOSID): Squad | null {
    const key = this.creatorIndex.get(creatorEOSID);
    if (!key) return null;
    return this.squads.get(key) ?? null;
  }

  // ===========================================================================
  // State Updates
  // ===========================================================================

  /**
   * Updates squad state from RCON ListSquads response.
   *
   * @param rconSquads - Array of squad info from RCON
   * @returns Array of state changes that occurred
   */
  updateFromRcon(rconSquads: readonly SquadInfo[]): SquadStateChange[] {
    const changes: SquadStateChange[] = [];
    const seenKeys = new Set<SquadKey>();

    for (const rconSquad of rconSquads) {
      const teamID = asTeamID(rconSquad.teamID);
      const squadID = asSquadID(rconSquad.squadID);
      if (!teamID || !squadID) continue;

      const key = makeSquadKey(teamID, squadID);
      seenKeys.add(key);

      const existing = this.squads.get(key);
      const squad = this.rconSquadToSquad(rconSquad, teamID, squadID);

      if (!existing) {
        // New squad
        this.squads.set(key, squad);
        this.creatorIndex.set(squad.creatorEOSID, key);
        changes.push({ squad, type: 'created' });

        this.logger.debug(`Squad created: ${squad.name} on Team ${teamID}`);
      } else if (this.hasSquadChanged(existing, squad)) {
        // Updated squad
        this.squads.set(key, squad);
        // Update creator index if creator changed
        if (existing.creatorEOSID !== squad.creatorEOSID) {
          this.creatorIndex.delete(existing.creatorEOSID);
          this.creatorIndex.set(squad.creatorEOSID, key);
        }
        changes.push({ squad, type: 'updated', previous: existing });

        this.logger.trace(`Squad updated: ${squad.name}`);
      }
    }

    // Remove squads no longer present
    for (const [key, squad] of this.squads) {
      if (!seenKeys.has(key)) {
        this.squads.delete(key);
        this.creatorIndex.delete(squad.creatorEOSID);
        changes.push({ squad, type: 'disbanded' });

        this.logger.debug(`Squad disbanded: ${squad.name}`);
      }
    }

    return changes;
  }

  /**
   * Adds a squad from a squad creation event.
   *
   * @param squad - The squad to add
   * @returns The state change
   */
  addSquad(squad: Squad): SquadStateChange {
    const key = makeSquadKey(squad.teamID, squad.squadID);
    const existing = this.squads.get(key);

    this.squads.set(key, squad);
    this.creatorIndex.set(squad.creatorEOSID, key);

    if (existing) {
      this.logger.debug(`Squad replaced: ${squad.name}`);
      return { squad, type: 'updated', previous: existing };
    }

    this.logger.debug(`Squad created: ${squad.name} on Team ${squad.teamID}`);
    return { squad, type: 'created' };
  }

  /**
   * Clears all squad data.
   */
  clear(): void {
    this.squads.clear();
    this.creatorIndex.clear();

    this.logger.debug('Squad service cleared');
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Converts RCON squad info to our Squad type.
   */
  private rconSquadToSquad(
    rconSquad: SquadInfo,
    teamID: TeamID,
    squadID: SquadID,
  ): Squad {
    return {
      squadID,
      teamID,
      name: rconSquad.name,
      size: rconSquad.size,
      locked: rconSquad.locked,
      creatorName: rconSquad.creatorName,
      creatorEOSID: rconSquad.creatorEOSID,
      creatorSteamID: rconSquad.creatorSteamID,
    };
  }

  /**
   * Checks if any squad fields have changed.
   */
  private hasSquadChanged(oldSquad: Squad, newSquad: Squad): boolean {
    return (
      oldSquad.name !== newSquad.name ||
      oldSquad.size !== newSquad.size ||
      oldSquad.locked !== newSquad.locked ||
      oldSquad.creatorName !== newSquad.creatorName ||
      oldSquad.creatorEOSID !== newSquad.creatorEOSID
    );
  }
}

/**
 * @squadscript/plugins
 *
 * SquadLeaderChangeAlert Plugin
 *
 * Alerts when a squad leader changes within a squad, notifying squad members.
 *
 * @example
 * ```typescript
 * server.registerPlugin(SquadLeaderChangeAlert, {
 *   notifySquad: true,
 *   squadMessage: 'Squad Leader has changed from {oldSL} to {newSL}',
 * });
 * ```
 *
 * @module
 */

import { BasePlugin } from "@squadscript/server";
import type {
	EOSID,
	OptionsSpec,
	PluginMeta,
	SquadID,
	TeamID,
} from "@squadscript/types";

/**
 * Snapshot of a squad's leader state.
 */
interface SquadSnapshot {
	squadKey: string;
	teamID: TeamID;
	squadID: SquadID;
	squadName: string;
	leaderEosID: EOSID | null;
	leaderName: string | null;
}

/**
 * Options specification for SquadLeaderChangeAlert plugin.
 */
const optionsSpec = {
	notifySquad: {
		type: "boolean",
		required: false,
		description: "Warn squad members about SL change",
		default: true,
	},
	squadMessage: {
		type: "string",
		required: false,
		description: "Message to send to squad members",
		default: "Squad Leader has changed from {oldSL} to {newSL}",
	},
	checkInterval: {
		type: "number",
		required: false,
		description: "How often to check for SL changes (ms)",
		default: 5000,
	},
	ignoreEmptySquads: {
		type: "boolean",
		required: false,
		description: "Don't alert for single-person squads",
		default: true,
	},
} as const satisfies OptionsSpec;

/**
 * SquadLeaderChangeAlert Plugin
 *
 * Monitors squads for leader changes and notifies affected squad members.
 */
export class SquadLeaderChangeAlert extends BasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "SquadLeaderChangeAlert",
		description: "Alerts when squad leader changes within a squad",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Previous state of squads for comparison.
	 */
	private previousSquads = new Map<string, SquadSnapshot>();

	/**
	 * Subscribe to events and start monitoring.
	 */
	async mount(): Promise<void> {
		// Initialize with current state
		this.updateSquadSnapshots();

		// Reset tracking on new game
		this.on("NEW_GAME", () => {
			this.previousSquads.clear();
			this.log.debug("New game - cleared squad leader tracking");
		});

		// Periodically check for changes
		const interval = this.options.checkInterval ?? 5000;
		this.setInterval(
			() => this.checkSquadLeaderChanges(),
			interval,
			"sl-change-check",
		);

		this.log.info("SquadLeaderChangeAlert mounted", {
			checkInterval: interval,
			notifySquad: this.options.notifySquad,
		});
	}

	/**
	 * Check all squads for leader changes.
	 */
	private async checkSquadLeaderChanges(): Promise<void> {
		for (const [, squad] of this.server.squads) {
			const squadKey = `${squad.teamID}-${squad.squadID}`;

			// Find current squad leader
			const squadPlayers: {
				eosID: EOSID;
				isSquadLeader: boolean;
				name: string;
			}[] = [];
			for (const [, player] of this.server.players) {
				if (
					player.teamID === squad.teamID &&
					player.squadID === squad.squadID
				) {
					squadPlayers.push(player);
				}
			}
			const currentLeader = squadPlayers.find((p) => p.isSquadLeader);

			const previous = this.previousSquads.get(squadKey);

			// Check if leader changed
			if (previous && previous.leaderEosID !== (currentLeader?.eosID ?? null)) {
				// Leader changed!
				if (currentLeader) {
					await this.handleLeaderChange(
						squad.teamID,
						squad.squadID,
						squad.name,
						previous.leaderName ?? "Unknown",
						currentLeader.name,
						squadPlayers.map((p) => p.eosID),
					);
				}
			}

			// Update snapshot
			this.previousSquads.set(squadKey, {
				squadKey,
				teamID: squad.teamID,
				squadID: squad.squadID,
				squadName: squad.name,
				leaderEosID: currentLeader?.eosID ?? null,
				leaderName: currentLeader?.name ?? null,
			});
		}

		// Clean up disbanded squads
		const currentSquadKeys = new Set<string>();
		for (const [, squad] of this.server.squads) {
			currentSquadKeys.add(`${squad.teamID}-${squad.squadID}`);
		}
		for (const key of this.previousSquads.keys()) {
			if (!currentSquadKeys.has(key)) {
				this.previousSquads.delete(key);
			}
		}
	}

	/**
	 * Handle a squad leader change.
	 */
	private async handleLeaderChange(
		teamID: TeamID,
		squadID: SquadID,
		squadName: string,
		oldLeaderName: string,
		newLeaderName: string,
		squadMemberEosIDs: EOSID[],
	): Promise<void> {
		this.log.info(`Squad leader changed: ${squadName}`, {
			teamID,
			squadID,
			oldLeader: oldLeaderName,
			newLeader: newLeaderName,
		});

		// Notify squad members if enabled
		if (this.options.notifySquad) {
			// Skip if it's just a single-person squad
			if (this.options.ignoreEmptySquads && squadMemberEosIDs.length <= 1) {
				return;
			}

			const message = this.formatMessage(
				this.options.squadMessage as string,
				oldLeaderName,
				newLeaderName,
				squadName,
			);

			for (const eosID of squadMemberEosIDs) {
				try {
					await this.rcon.warn(eosID, message);
				} catch (error) {
					this.log.error(
						`Failed to notify squad member ${eosID}`,
						error instanceof Error ? error : new Error(String(error)),
					);
				}
			}
		}
	}

	/**
	 * Update all squad snapshots with current state.
	 */
	private updateSquadSnapshots(): void {
		for (const [, squad] of this.server.squads) {
			const squadKey = `${squad.teamID}-${squad.squadID}`;
			let leader: { eosID: EOSID; name: string } | undefined;
			for (const [, player] of this.server.players) {
				if (
					player.teamID === squad.teamID &&
					player.squadID === squad.squadID &&
					player.isSquadLeader
				) {
					leader = player;
					break;
				}
			}

			this.previousSquads.set(squadKey, {
				squadKey,
				teamID: squad.teamID,
				squadID: squad.squadID,
				squadName: squad.name,
				leaderEosID: leader?.eosID ?? null,
				leaderName: leader?.name ?? null,
			});
		}
	}

	/**
	 * Format the message with placeholders.
	 */
	private formatMessage(
		template: string,
		oldSL: string,
		newSL: string,
		squadName: string,
	): string {
		return template
			.replace(/{oldSL}/g, oldSL)
			.replace(/{newSL}/g, newSL)
			.replace(/{squadName}/g, squadName);
	}
}

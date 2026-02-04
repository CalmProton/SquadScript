/**
 * @squadscript/plugins
 *
 * OrphanSquadLogger Plugin
 *
 * Logs when a squad leader leaves a squad without disbanding it,
 * alerting admins to potential orphan squad situations.
 *
 * @example
 * ```typescript
 * server.registerPlugin(OrphanSquadLogger, {
 *   warnAdmins: true,
 *   minSquadSize: 2,
 * });
 * ```
 *
 * @module
 */

import { BasePlugin } from "@squadscript/server";
import type {
	EOSID,
	OptionsSpec,
	Player,
	PluginMeta,
	SquadID,
	TeamID,
} from "@squadscript/types";

/**
 * Squad leader tracking info.
 */
interface SquadLeaderInfo {
	squadKey: string;
	squadID: SquadID;
	teamID: TeamID;
	squadName: string;
	leaderEosID: EOSID;
	leaderName: string;
}

/**
 * Options specification for OrphanSquadLogger plugin.
 */
const optionsSpec = {
	warnAdmins: {
		type: "boolean",
		required: false,
		description: "Warn in-game admins about orphan squads",
		default: true,
	},
	adminMessage: {
		type: "string",
		required: false,
		description: "Message to warn admins",
		default:
			"[OrphanSquad] {oldSL} left {team} {squadName} without disbanding (now led by {newSL})",
	},
	minSquadSize: {
		type: "number",
		required: false,
		description: "Minimum squad size to trigger alert",
		default: 2,
	},
	checkDelay: {
		type: "number",
		required: false,
		description: "Delay after disconnect to check for orphan (ms)",
		default: 3000,
	},
} as const satisfies OptionsSpec;

/**
 * OrphanSquadLogger Plugin
 *
 * Monitors for squad leaders who disconnect without disbanding their squad.
 */
export class OrphanSquadLogger extends BasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "OrphanSquadLogger",
		description: "Logs when squad leaders leave without disbanding",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Track current squad leaders.
	 */
	private squadLeaders = new Map<string, SquadLeaderInfo>();

	/**
	 * Subscribe to events and start monitoring.
	 */
	async mount(): Promise<void> {
		// Periodically update squad leader cache
		this.setInterval(
			() => this.updateSquadLeaderCache(),
			5000,
			"sl-cache-update",
		);

		// Monitor player disconnects
		this.on("PLAYER_DISCONNECTED", (event) => {
			const slInfo = this.squadLeaders.get(event.player.eosID);
			if (!slInfo) {
				return; // Wasn't a squad leader
			}

			const playerName = event.player.name ?? "Unknown";
			const playerEosID = event.player.eosID;

			// Delay check to allow state to update
			const delay = this.options.checkDelay ?? 3000;
			this.setTimeout(
				() => this.checkForOrphanSquad(playerName, slInfo),
				delay,
				`orphan-check-${playerEosID}`,
			);
		});

		// Reset on new game
		this.on("NEW_GAME", () => {
			this.squadLeaders.clear();
			this.log.debug("New game - cleared squad leader tracking");
		});

		this.log.info("OrphanSquadLogger mounted", {
			warnAdmins: this.options.warnAdmins,
			minSquadSize: this.options.minSquadSize,
		});
	}

	/**
	 * Update the squad leader cache.
	 */
	private updateSquadLeaderCache(): void {
		// Clear old data
		this.squadLeaders.clear();

		// Build new cache
		for (const [, squad] of this.server.squads) {
			let leader: Player | undefined;
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

			if (leader) {
				this.squadLeaders.set(leader.eosID, {
					squadKey: `${squad.teamID}-${squad.squadID}`,
					squadID: squad.squadID,
					teamID: squad.teamID,
					squadName: squad.name,
					leaderEosID: leader.eosID,
					leaderName: leader.name,
				});
			}
		}
	}

	/**
	 * Check if a squad was orphaned when its leader disconnected.
	 */
	private async checkForOrphanSquad(
		oldLeaderName: string,
		slInfo: SquadLeaderInfo,
	): Promise<void> {
		// Check if squad still exists
		let squad: { teamID: TeamID; squadID: SquadID; name: string } | undefined;
		for (const [, s] of this.server.squads) {
			if (s.teamID === slInfo.teamID && s.squadID === slInfo.squadID) {
				squad = s;
				break;
			}
		}

		if (!squad) {
			this.log.debug(
				`Squad ${slInfo.squadName} no longer exists - properly disbanded`,
			);
			return;
		}

		// Get current squad members
		const squadPlayers: Player[] = [];
		for (const [, player] of this.server.players) {
			if (
				player.teamID === slInfo.teamID &&
				player.squadID === slInfo.squadID
			) {
				squadPlayers.push(player);
			}
		}

		// Check minimum squad size
		const minSize = this.options.minSquadSize ?? 2;
		if (squadPlayers.length < minSize) {
			this.log.debug(
				`Squad ${slInfo.squadName} below min size (${squadPlayers.length} < ${minSize})`,
			);
			return;
		}

		// Find new leader
		const newLeader = squadPlayers.find((p) => p.isSquadLeader);
		const newLeaderName = newLeader?.name ?? "Unknown";

		// This is an orphan squad situation!
		this.log.warn(`Orphan squad detected: ${slInfo.squadName}`, {
			teamID: slInfo.teamID,
			squadID: slInfo.squadID,
			oldLeader: oldLeaderName,
			newLeader: newLeaderName,
			squadSize: squadPlayers.length,
		});

		// Notify admins
		if (this.options.warnAdmins) {
			await this.notifyAdmins(
				oldLeaderName,
				newLeaderName,
				slInfo.teamID,
				slInfo.squadName,
			);
		}
	}

	/**
	 * Notify in-game admins about the orphan squad.
	 * Note: Admin notification requires admin list integration which is not
	 * available in ServerStateReader. This currently broadcasts to all players.
	 */
	private async notifyAdmins(
		oldSL: string,
		newSL: string,
		teamID: TeamID,
		squadName: string,
	): Promise<void> {
		const teamName = teamID === 1 ? "Team 1" : "Team 2";
		const message = this.formatMessage(
			this.options.adminMessage as string,
			oldSL,
			newSL,
			teamName,
			squadName,
		);

		// Since admin list is not available in ServerStateReader,
		// we log the message. In a real deployment, this would need
		// to be extended with admin list integration via a connector.
		this.log.info(`Orphan squad alert: ${message}`);

		// Optionally broadcast to server (can be configured)
		try {
			await this.rcon.broadcast(`[Admin Alert] ${message}`);
		} catch (error) {
			this.log.error(
				"Failed to broadcast orphan squad alert",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Format the message with placeholders.
	 */
	private formatMessage(
		template: string,
		oldSL: string,
		newSL: string,
		team: string,
		squadName: string,
	): string {
		return template
			.replace(/{oldSL}/g, oldSL)
			.replace(/{newSL}/g, newSL)
			.replace(/{team}/g, team)
			.replace(/{squadName}/g, squadName);
	}
}

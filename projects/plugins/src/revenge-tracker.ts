/**
 * @squadscript/plugins
 *
 * RevengeTracker Plugin
 *
 * Tracks kill rivalries between players and announces when someone gets
 * revenge or becomes a nemesis.
 *
 * @example
 * ```typescript
 * server.registerPlugin(RevengeTracker, {
 *   nemesisThreshold: 3,
 *   nemesisMessage: '😈 {attacker} is now {victim}\'s NEMESIS! ({kills} kills)',
 *   revengeMessage: '⚔️ REVENGE! {attacker} got payback on {victim}!',
 * });
 * ```
 *
 * @module
 */

import { BasePlugin } from "@squadscript/core";
import type {
	EOSID,
	OptionsSpec,
	Player,
	PluginMeta,
} from "@squadscript/types";

/**
 * Options specification for RevengeTracker plugin.
 */
const optionsSpec = {
	nemesisThreshold: {
		type: "number",
		required: false,
		description: "Kills needed to become someone's nemesis",
		default: 3,
	},
	nemesisMessage: {
		type: "string",
		required: false,
		description: "Message when someone becomes a nemesis",
		default: "😈 {attacker} is now {victim}'s NEMESIS! ({kills} kills)",
	},
	revengeMessage: {
		type: "string",
		required: false,
		description: "Message when someone gets revenge",
		default: "⚔️ REVENGE! {attacker} got payback on {victim}!",
	},
	announceType: {
		type: "string",
		required: false,
		description: "How to announce: 'broadcast', 'warn-players', or 'both'",
		default: "warn-players",
	},
	trackTeamkills: {
		type: "boolean",
		required: false,
		description: "Track teamkill rivalries",
		default: false,
	},
	resetOnNewGame: {
		type: "boolean",
		required: false,
		description: "Reset stats each round",
		default: true,
	},
	enableStatsCommand: {
		type: "boolean",
		required: false,
		description: "Enable !nemesis command",
		default: true,
	},
	statsCommand: {
		type: "string",
		required: false,
		description: "Command to check your nemesis",
		default: "nemesis",
	},
} as const satisfies OptionsSpec;

/**
 * RevengeTracker Plugin
 *
 * Tracks kill rivalries and announces revenge kills and nemesis status.
 */
export class RevengeTracker extends BasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "RevengeTracker",
		description: "Tracks kill rivalries between players",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Kill tracking: attackerEosID -> victimEosID -> count
	 */
	private kills = new Map<string, Map<string, number>>();

	/**
	 * Track announced nemeses to avoid spam.
	 */
	private announcedNemeses = new Set<string>();

	/**
	 * Subscribe to events.
	 */
	async mount(): Promise<void> {
		// Reset on new game if enabled
		if (this.options.resetOnNewGame) {
			this.on("NEW_GAME", () => {
				this.resetTracker();
			});
		}

		// Track kills
		this.on("PLAYER_DIED", async (event) => {
			// Skip if no attacker (suicide/environmental)
			if (!event.attacker) {
				return;
			}

			// Skip suicides
			if (event.suicide) {
				return;
			}

			// Skip teamkills if not tracking them
			if (!this.options.trackTeamkills) {
				if (event.attacker.teamID === event.victim.teamID) {
					return;
				}
			}

			const killCount = this.recordKill(
				event.attacker.eosID,
				event.victim.eosID,
			);

			// Check for nemesis
			const threshold = this.options.nemesisThreshold ?? 3;
			if (killCount === threshold) {
				await this.announceNemesis(event.attacker, event.victim, killCount);
			}

			// Check for revenge (victim previously killed attacker)
			if (this.wasKilledBy(event.attacker.eosID, event.victim.eosID)) {
				await this.announceRevenge(event.attacker, event.victim);
			}
		});

		// Stats command
		if (this.options.enableStatsCommand) {
			this.on("CHAT_COMMAND", async (event) => {
				if (event.command === this.options.statsCommand) {
					await this.handleStatsCommand(event.player);
				}
			});
		}

		this.log.info("RevengeTracker mounted", {
			nemesisThreshold: this.options.nemesisThreshold,
			resetOnNewGame: this.options.resetOnNewGame,
		});
	}

	/**
	 * Reset all tracking data.
	 */
	private resetTracker(): void {
		this.kills.clear();
		this.announcedNemeses.clear();
		this.log.debug("Revenge tracker reset");
	}

	/**
	 * Record a kill and return the new kill count.
	 */
	private recordKill(attackerEosID: EOSID, victimEosID: EOSID): number {
		let attackerKills = this.kills.get(attackerEosID);
		if (!attackerKills) {
			attackerKills = new Map();
			this.kills.set(attackerEosID, attackerKills);
		}

		const currentCount = attackerKills.get(victimEosID) ?? 0;
		const newCount = currentCount + 1;
		attackerKills.set(victimEosID, newCount);

		return newCount;
	}

	/**
	 * Check if attacker was previously killed by victim.
	 */
	private wasKilledBy(attackerEosID: EOSID, victimEosID: EOSID): boolean {
		const victimKills = this.kills.get(victimEosID);
		if (!victimKills) {
			return false;
		}

		const killCount = victimKills.get(attackerEosID) ?? 0;
		return killCount > 0;
	}

	/**
	 * Announce nemesis status.
	 */
	private async announceNemesis(
		attacker: Player,
		victim: Player,
		kills: number,
	): Promise<void> {
		// Check if already announced
		const nemesisKey = `${attacker.eosID}->${victim.eosID}`;
		if (this.announcedNemeses.has(nemesisKey)) {
			return;
		}
		this.announcedNemeses.add(nemesisKey);

		const message = this.formatNemesisMessage(attacker, victim, kills);

		this.log.info(
			`Nemesis: ${attacker.name} -> ${victim.name} (${kills} kills)`,
		);

		await this.announce(message, attacker, victim);
	}

	/**
	 * Announce revenge kill.
	 */
	private async announceRevenge(
		attacker: Player,
		victim: Player,
	): Promise<void> {
		const message = this.formatRevengeMessage(attacker, victim);

		this.log.debug(`Revenge: ${attacker.name} -> ${victim.name}`);

		await this.announce(message, attacker, victim);
	}

	/**
	 * Send announcement based on configuration.
	 */
	private async announce(
		message: string,
		attacker: Player,
		victim: Player,
	): Promise<void> {
		const announceType = this.options.announceType as string;

		try {
			if (announceType === "broadcast" || announceType === "both") {
				await this.rcon.broadcast(message);
			}

			if (announceType === "warn-players" || announceType === "both") {
				await this.rcon.warn(attacker.eosID, message);
				await this.rcon.warn(victim.eosID, message);
			}
		} catch (error) {
			this.log.error(
				"Failed to send announcement",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Handle the stats command.
	 */
	private async handleStatsCommand(player: Player): Promise<void> {
		// Find who killed this player the most
		let nemesis: { eosID: EOSID; name: string; kills: number } | null = null;
		let nemesisKills = 0;

		for (const [attackerEosID, victims] of this.kills) {
			const killCount = victims.get(player.eosID) ?? 0;
			if (killCount > nemesisKills) {
				nemesisKills = killCount;
				// Find attacker name
				const attackerPlayer = this.server.getPlayerByEOSID(
					attackerEosID as EOSID,
				);
				nemesis = {
					eosID: attackerEosID as EOSID,
					name: attackerPlayer?.name ?? "Unknown",
					kills: killCount,
				};
			}
		}

		// Find who this player killed the most
		const playerKills = this.kills.get(player.eosID);
		let victim: { eosID: EOSID; name: string; kills: number } | null = null;
		let victimKills = 0;

		if (playerKills) {
			for (const [victimEosID, kills] of playerKills) {
				if (kills > victimKills) {
					victimKills = kills;
					const victimPlayer = this.server.getPlayerByEOSID(
						victimEosID as EOSID,
					);
					victim = {
						eosID: victimEosID as EOSID,
						name: victimPlayer?.name ?? "Unknown",
						kills,
					};
				}
			}
		}

		// Build response
		let response = "Your kill rivalries:\n";

		if (nemesis) {
			response += `Your Nemesis: ${nemesis.name} (killed you ${nemesis.kills}x)\n`;
		} else {
			response += "No one has established nemesis status on you.\n";
		}

		if (victim) {
			response += `Your Victim: ${victim.name} (you killed them ${victim.kills}x)`;
		} else {
			response += "You haven't dominated anyone yet.";
		}

		try {
			await this.rcon.warn(player.eosID, response);
		} catch (error) {
			this.log.error(
				"Failed to send stats response",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Format nemesis message.
	 */
	private formatNemesisMessage(
		attacker: Player,
		victim: Player,
		kills: number,
	): string {
		return (this.options.nemesisMessage as string)
			.replace(/{attacker}/g, attacker.name)
			.replace(/{victim}/g, victim.name)
			.replace(/{kills}/g, String(kills));
	}

	/**
	 * Format revenge message.
	 */
	private formatRevengeMessage(attacker: Player, victim: Player): string {
		return (this.options.revengeMessage as string)
			.replace(/{attacker}/g, attacker.name)
			.replace(/{victim}/g, victim.name);
	}
}

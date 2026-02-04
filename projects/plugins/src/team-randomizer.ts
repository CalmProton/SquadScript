/**
 * @squadscript/plugins
 *
 * TeamRandomizer Plugin
 *
 * Randomize team assignments via admin chat command.
 *
 * @example
 * ```typescript
 * server.registerPlugin(TeamRandomizer, {
 *   command: 'randomize',
 * });
 * // Then use !randomize in admin chat
 * ```
 *
 * @module
 */

import { BasePlugin } from "@squadscript/core";
import type { OptionsSpec, Player, PluginMeta } from "@squadscript/types";

/**
 * Options specification for TeamRandomizer plugin.
 */
const optionsSpec = {
	command: {
		type: "string",
		required: false,
		description: "Admin command trigger (without ! prefix)",
		default: "randomize",
	},
} as const satisfies OptionsSpec;

/**
 * TeamRandomizer Plugin
 *
 * Randomizes team assignments when an admin triggers the command.
 * Only responds to commands in admin chat.
 */
export class TeamRandomizer extends BasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "TeamRandomizer",
		description: "Randomize team assignments via admin command",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Subscribe to chat command events.
	 */
	async mount(): Promise<void> {
		const commandName = (this.options.command ?? "randomize").toLowerCase();

		this.on("CHAT_COMMAND", async (event) => {
			// Only respond to admin chat
			if (event.channel !== "ChatAdmin") {
				return;
			}

			// Check if it's our command
			if (event.command !== commandName) {
				return;
			}

			this.log.info(`Team randomization triggered by ${event.player.name}`);

			await this.rcon.broadcast("Randomizing teams...");

			try {
				await this.randomizeTeams();
				await this.rcon.broadcast("Teams have been randomized!");
			} catch (error) {
				this.log.error(
					"Failed to randomize teams",
					error instanceof Error ? error : new Error(String(error)),
				);
				await this.rcon.warn(
					event.player.eosID,
					"Failed to randomize teams. Check logs for details.",
				);
			}
		});

		this.log.info("TeamRandomizer mounted", { command: commandName });
	}

	/**
	 * Randomize all players across teams.
	 * Matches original behavior: shuffles players then alternates team assignments.
	 */
	private async randomizeTeams(): Promise<void> {
		// Get all players as an array
		const players: Player[] = [];
		for (const [, player] of this.server.players) {
			players.push(player);
		}

		// Shuffle the players using Fisher-Yates
		this.shuffle(players);

		this.log.debug(`Randomizing ${players.length} players across teams`);

		// Alternate team assignments (1, 2, 1, 2, ...)
		// Original uses string comparison for teamID
		let targetTeam: 1 | 2 = 1;

		for (const player of players) {
			// Switch team if player is not on the target team
			if (player.teamID !== targetTeam) {
				// Use AdminForceTeamChange RCON command (equivalent to switchTeam)
				await this.rcon.execute(`AdminForceTeamChange ${player.eosID}`);
			}

			// Alternate to next team
			targetTeam = targetTeam === 1 ? 2 : 1;
		}

		this.log.info(`Randomized ${players.length} players across teams`);
	}

	/**
	 * Fisher-Yates shuffle algorithm.
	 * Shuffles array in-place.
	 */
	private shuffle<T>(array: T[]): void {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			// Both indices are guaranteed to be within bounds due to loop conditions
			[array[i], array[j]] = [array[j] as T, array[i] as T];
		}
	}
}

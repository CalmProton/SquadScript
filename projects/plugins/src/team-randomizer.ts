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
	 */
	private async randomizeTeams(): Promise<void> {
		// Get all players as an array
		const players: Player[] = [];
		for (const [, player] of this.server.players) {
			players.push(player);
		}

		// Shuffle the players
		this.shuffle(players);

		// Split into two teams
		const halfPoint = Math.ceil(players.length / 2);
		const team1Players = players.slice(0, halfPoint);
		const team2Players = players.slice(halfPoint);

		this.log.debug(`Assigning ${team1Players.length} players to Team 1`);
		this.log.debug(`Assigning ${team2Players.length} players to Team 2`);

		// Move players to their new teams
		// Note: Players on the wrong team will be switched
		for (const player of team1Players) {
			if (player.teamID !== 1) {
				await this.rcon.execute(`AdminForceTeamChange ${player.eosID}`);
			}
		}

		for (const player of team2Players) {
			if (player.teamID !== 2) {
				await this.rcon.execute(`AdminForceTeamChange ${player.eosID}`);
			}
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

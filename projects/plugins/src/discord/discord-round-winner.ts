/**
 * @squadscript/plugins
 *
 * DiscordRoundWinner Plugin
 *
 * Posts round winner announcements to a Discord channel when a game ends.
 * Shows the winning team, factions, and final ticket counts.
 *
 * @example
 * ```typescript
 * server.registerPlugin(DiscordRoundWinner, {
 *   channelID: '123456789012345678',
 * });
 * ```
 *
 * @module
 */

import type { OptionsSpec, PluginMeta } from "@squadscript/types";
import {
	DiscordBasePlugin,
	discordBaseOptions,
} from "./discord-base-plugin.js";

/**
 * Options specification for DiscordRoundWinner plugin.
 */
const optionsSpec = {
	...discordBaseOptions,
	channelID: {
		type: "string",
		required: true,
		description: "Discord channel ID to post round winner announcements to",
	},
	color: {
		type: "number",
		required: false,
		description: "Embed color for winner announcements",
		default: 0xffd700, // Gold
	},
} as const satisfies OptionsSpec;

/**
 * DiscordRoundWinner Plugin
 *
 * Monitors for round end events and posts winner announcements to Discord.
 * Includes faction information, ticket counts, and round duration.
 */
export class DiscordRoundWinner extends DiscordBasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "DiscordRoundWinner",
		description: "Post round winner announcements to a Discord channel",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Subscribe to round ended events.
	 */
	async mount(): Promise<void> {
		this.on("ROUND_ENDED", async (event) => {
			// Determine winner text
			let winnerText = "Draw";
			if (event.winner !== null) {
				winnerText = `Team ${event.winner}`;
			}

			this.log.verbose(`Round ended: ${winnerText} wins`);

			// Format duration
			const durationMinutes = Math.floor(event.durationSeconds / 60);
			const durationSeconds = event.durationSeconds % 60;
			const durationText = `${durationMinutes}m ${durationSeconds}s`;

			// Build fields
			const fields: { name: string; value: string; inline?: boolean }[] = [
				{
					name: "🏆 Winner",
					value: winnerText,
					inline: true,
				},
				{
					name: "⏱️ Duration",
					value: durationText,
					inline: true,
				},
			];

			// Add ticket counts
			fields.push({
				name: "🎫 Final Tickets",
				value: `Team 1: ${event.team1Tickets} | Team 2: ${event.team2Tickets}`,
				inline: false,
			});

			// Add layer info if available
			if (event.layer) {
				fields.push({
					name: "🗺️ Layer",
					value: event.layer.name || "Unknown",
					inline: true,
				});

				if (event.layer.gameMode) {
					fields.push({
						name: "🎮 Gamemode",
						value: event.layer.gameMode,
						inline: true,
					});
				}

				// Add faction info
				if (event.layer.team1Faction && event.layer.team2Faction) {
					fields.push({
						name: "⚔️ Factions",
						value: `${event.layer.team1Faction} vs ${event.layer.team2Faction}`,
						inline: false,
					});
				}
			}

			// Determine title based on winner
			let title = "🎮 Round Ended";
			if (event.winner !== null) {
				title = `🏆 Team ${event.winner} Wins!`;
			}

			// Send to Discord
			await this.sendDiscordMessage(this.options.channelID as string, {
				embed: {
					title,
					color: this.options.color as number,
					fields,
					timestamp: new Date().toISOString(),
				},
			});
		});

		this.log.info(
			`Posting round winners to Discord channel ${this.options.channelID}`,
		);
	}
}

/**
 * @squadscript/plugins
 *
 * DiscordSquadCreated Plugin
 *
 * Logs squad creation events to a Discord channel. Shows who created
 * the squad, the squad name, and which team it was created on.
 *
 * @example
 * ```typescript
 * server.registerPlugin(DiscordSquadCreated, {
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
 * Options specification for DiscordSquadCreated plugin.
 */
const optionsSpec = {
	...discordBaseOptions,
	channelID: {
		type: "string",
		required: true,
		description: "Discord channel ID to post squad creation events to",
	},
	color: {
		type: "number",
		required: false,
		description: "Embed color for squad creation messages",
		default: 0x32cd32, // Lime green
	},
} as const satisfies OptionsSpec;

/**
 * DiscordSquadCreated Plugin
 *
 * Monitors for squad creation events and posts them to Discord.
 * Useful for tracking squad naming patterns or moderation.
 */
export class DiscordSquadCreated extends DiscordBasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "DiscordSquadCreated",
		description: "Log squad creation events to a Discord channel",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Subscribe to squad creation events.
	 */
	async mount(): Promise<void> {
		this.on("SQUAD_CREATED", async (event) => {
			const playerName = this.escapeMarkdown(event.player.name);
			const squadName = this.escapeMarkdown(event.squadName);

			this.log.verbose(
				`Squad created: "${event.squadName}" by ${event.player.name}`,
			);

			// Build fields
			const fields: { name: string; value: string; inline?: boolean }[] = [
				{
					name: "Squad Leader",
					value: playerName,
					inline: true,
				},
				{
					name: "Squad Name",
					value: squadName,
					inline: true,
				},
				{
					name: "Team",
					value: `Team ${event.teamID}`,
					inline: true,
				},
				{
					name: "Squad ID",
					value: `#${event.squadID}`,
					inline: true,
				},
			];

			// Add Steam ID if available
			if (event.player.steamID) {
				fields.push({
					name: "Steam ID",
					value: event.player.steamID,
					inline: true,
				});
			}

			// Send to Discord
			await this.sendDiscordMessage(this.options.channelID as string, {
				embed: {
					title: "🎖️ Squad Created",
					description: `**${playerName}** created squad **${squadName}**`,
					color: this.options.color as number,
					fields,
					timestamp: new Date().toISOString(),
				},
			});
		});

		this.log.info(
			`Logging squad creation to Discord channel ${this.options.channelID}`,
		);
	}
}

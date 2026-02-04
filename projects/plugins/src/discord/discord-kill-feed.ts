/**
 * @squadscript/plugins
 *
 * DiscordKillFeed Plugin
 *
 * Logs all wounds/kills to a Discord channel. Useful for debugging,
 * analysis, or creating kill feeds. Note: This can generate high volume!
 *
 * @example
 * ```typescript
 * server.registerPlugin(DiscordKillFeed, {
 *   channelID: '123456789012345678',
 *   includeWounds: true,
 *   includeTeamkillsOnly: false,
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
 * Options specification for DiscordKillFeed plugin.
 */
const optionsSpec = {
	...discordBaseOptions,
	channelID: {
		type: "string",
		required: true,
		description: "Discord channel ID to post kill feed to",
	},
	includeWounds: {
		type: "boolean",
		required: false,
		description: "Include wound events (not just deaths)",
		default: false,
	},
	includeTeamkillsOnly: {
		type: "boolean",
		required: false,
		description: "Only log teamkills (filter out regular kills)",
		default: false,
	},
	woundColor: {
		type: "number",
		required: false,
		description: "Embed color for wound events",
		default: 0xffa500, // Orange
	},
	deathColor: {
		type: "number",
		required: false,
		description: "Embed color for death events",
		default: 0xff0000, // Red
	},
	teamkillColor: {
		type: "number",
		required: false,
		description: "Embed color for teamkill events",
		default: 0x8b0000, // Dark red
	},
} as const satisfies OptionsSpec;

/**
 * DiscordKillFeed Plugin
 *
 * Streams combat events to a Discord channel. Can be configured to
 * show wounds, deaths, or teamkills only.
 *
 * ⚠️ Warning: This plugin can generate very high message volume on
 * active servers. Consider using a dedicated channel.
 */
export class DiscordKillFeed extends DiscordBasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "DiscordKillFeed",
		description: "Log all wounds/kills to a Discord channel",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Subscribe to combat events.
	 */
	async mount(): Promise<void> {
		// Handle wounds if enabled
		if (this.options.includeWounds) {
			this.on("PLAYER_WOUNDED", async (event) => {
				// Check teamkill-only filter
				if (this.options.includeTeamkillsOnly && !event.teamkill) {
					return;
				}

				const attackerName = event.attacker
					? this.escapeMarkdown(event.attacker.name)
					: "Unknown";
				const victimName = this.escapeMarkdown(event.victim.name);

				const color = event.teamkill
					? (this.options.teamkillColor as number)
					: (this.options.woundColor as number);

				const title = event.teamkill ? "⚠️ Teamwound" : "🔫 Wound";

				await this.sendDiscordMessage(this.options.channelID as string, {
					embed: {
						title,
						description: `**${attackerName}** wounded **${victimName}**`,
						color,
						fields: [
							{
								name: "Weapon",
								value: event.weapon ?? "Unknown",
								inline: true,
							},
							{
								name: "Damage",
								value: `${event.damage}`,
								inline: true,
							},
						],
						timestamp: new Date().toISOString(),
					},
				});
			});
		}

		// Always handle deaths
		this.on("PLAYER_DIED", async (event) => {
			// Skip suicides
			if (event.suicide) {
				return;
			}

			// Determine if this is a teamkill
			const isTeamkill =
				event.attacker && event.attacker.teamID === event.victim.teamID;

			// Check teamkill-only filter
			if (this.options.includeTeamkillsOnly && !isTeamkill) {
				return;
			}

			const attackerName = event.attacker
				? this.escapeMarkdown(event.attacker.name)
				: "Unknown";
			const victimName = this.escapeMarkdown(event.victim.name);

			const color = isTeamkill
				? (this.options.teamkillColor as number)
				: (this.options.deathColor as number);

			const title = isTeamkill ? "💀 Teamkill" : "💀 Kill";

			await this.sendDiscordMessage(this.options.channelID as string, {
				embed: {
					title,
					description: `**${attackerName}** killed **${victimName}**`,
					color,
					fields: [
						{
							name: "Weapon",
							value: event.weapon ?? "Unknown",
							inline: true,
						},
						{
							name: "Damage",
							value: `${event.damage}`,
							inline: true,
						},
					],
					timestamp: new Date().toISOString(),
				},
			});
		});

		this.log.info(
			`Streaming kill feed to Discord channel ${this.options.channelID}`,
		);

		if (this.options.includeWounds) {
			this.log.warn(
				"Kill feed includes wounds - this may generate high volume!",
			);
		}
	}
}

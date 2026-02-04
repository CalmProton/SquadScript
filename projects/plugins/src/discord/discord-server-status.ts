/**
 * @squadscript/plugins
 *
 * DiscordServerStatus Plugin
 *
 * Displays live server status in a Discord channel. Updates periodically
 * with player count, current layer, and queue information.
 *
 * @example
 * ```typescript
 * server.registerPlugin(DiscordServerStatus, {
 *   channelID: '123456789012345678',
 *   updateInterval: 60000, // 1 minute
 *   setBotStatus: true,
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
 * Options specification for DiscordServerStatus plugin.
 */
const optionsSpec = {
	...discordBaseOptions,
	channelID: {
		type: "string",
		required: true,
		description: "Discord channel ID to post server status to",
	},
	updateInterval: {
		type: "number",
		required: false,
		description: "Status update interval in milliseconds",
		default: 60000, // 1 minute
	},
	color: {
		type: "number",
		required: false,
		description: "Embed color for status messages",
		default: 0x00ff00, // Green
	},
	showNextLayer: {
		type: "boolean",
		required: false,
		description: "Show the next layer in the status",
		default: true,
	},
} as const satisfies OptionsSpec;

/**
 * DiscordServerStatus Plugin
 *
 * Posts and updates a server status message in Discord.
 * Shows player count, queue sizes, current layer, and more.
 */
export class DiscordServerStatus extends DiscordBasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "DiscordServerStatus",
		description: "Display live server status in a Discord channel",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Subscribe to update the server status periodically.
	 */
	async mount(): Promise<void> {
		// Post initial status
		await this.postStatus();

		// Set up periodic updates
		this.setInterval(
			() => this.postStatus(),
			this.options.updateInterval as number,
			"server-status-update",
		);

		this.log.info(
			`Posting server status to Discord channel ${this.options.channelID} every ${(this.options.updateInterval as number) / 1000}s`,
		);
	}

	/**
	 * Posts the current server status to Discord.
	 */
	private async postStatus(): Promise<void> {
		try {
			// Get server state
			const playerCount = this.server.playerCount;
			const currentLayer = this.server.currentLayer;
			const nextLayer = this.server.nextLayer;

			// Build status fields
			const fields: { name: string; value: string; inline?: boolean }[] = [
				{
					name: "👥 Players",
					value: `${playerCount}/100`,
					inline: true,
				},
			];

			// Add current layer
			if (currentLayer) {
				fields.push({
					name: "🗺️ Current Layer",
					value: currentLayer.name || "Unknown",
					inline: true,
				});

				if (currentLayer.gameMode) {
					fields.push({
						name: "🎮 Gamemode",
						value: currentLayer.gameMode,
						inline: true,
					});
				}
			} else {
				fields.push({
					name: "🗺️ Current Layer",
					value: "Loading...",
					inline: true,
				});
			}

			// Add next layer if enabled
			if (this.options.showNextLayer && nextLayer) {
				fields.push({
					name: "⏭️ Next Layer",
					value: nextLayer.name || "Unknown",
					inline: true,
				});
			}

			// Add factions if available
			if (currentLayer?.team1Faction && currentLayer?.team2Faction) {
				fields.push({
					name: "⚔️ Factions",
					value: `${currentLayer.team1Faction} vs ${currentLayer.team2Faction}`,
					inline: false,
				});
			}

			// Determine color based on player count
			let color = this.options.color as number;
			if (playerCount >= 90) {
				color = 0xff0000; // Red - nearly full
			} else if (playerCount >= 70) {
				color = 0xffa500; // Orange - getting full
			} else if (playerCount >= 40) {
				color = 0x00ff00; // Green - healthy
			} else {
				color = 0x808080; // Gray - low population
			}

			// Post status
			await this.sendDiscordMessage(this.options.channelID as string, {
				embed: {
					title: "🖥️ Server Status",
					color,
					fields,
					footer: { text: "Last updated" },
					timestamp: new Date().toISOString(),
				},
			});
		} catch (error) {
			this.log.error(
				"Failed to post server status",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}
}

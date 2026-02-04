/**
 * @squadscript/plugins
 *
 * DiscordAdminCamLogs Plugin
 *
 * Logs admin camera usage to a Discord channel. Tracks when admins
 * enter and exit admin camera mode for accountability.
 *
 * @example
 * ```typescript
 * server.registerPlugin(DiscordAdminCamLogs, {
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
 * Options specification for DiscordAdminCamLogs plugin.
 */
const optionsSpec = {
	...discordBaseOptions,
	channelID: {
		type: "string",
		required: true,
		description: "Discord channel ID to post admin camera logs to",
	},
	enterColor: {
		type: "number",
		required: false,
		description: "Embed color when admin enters camera",
		default: 0xffa500, // Orange
	},
	exitColor: {
		type: "number",
		required: false,
		description: "Embed color when admin exits camera",
		default: 0x00ff00, // Green
	},
} as const satisfies OptionsSpec;

/**
 * DiscordAdminCamLogs Plugin
 *
 * Monitors admin camera events and logs them to Discord.
 * Shows when admins enter and exit admin camera mode.
 */
export class DiscordAdminCamLogs extends DiscordBasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "DiscordAdminCamLogs",
		description: "Log admin camera usage to a Discord channel",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Track admin camera sessions for duration calculation.
	 */
	private cameraSessions = new Map<string, number>();

	/**
	 * Subscribe to admin camera events.
	 */
	async mount(): Promise<void> {
		this.on("ADMIN_CAMERA", async (event) => {
			const playerName = this.escapeMarkdown(event.player.name);

			if (event.entering) {
				// Admin entered camera
				this.cameraSessions.set(event.player.eosID, Date.now());

				this.log.verbose(`Admin cam entered: ${event.player.name}`);

				await this.sendDiscordMessage(this.options.channelID as string, {
					embed: {
						title: "📷 Admin Camera Entered",
						description: `**${playerName}** entered admin camera`,
						color: this.options.enterColor as number,
						fields: [
							{
								name: "Admin",
								value: playerName,
								inline: true,
							},
							{
								name: "Steam ID",
								value: event.player.steamID ?? "N/A",
								inline: true,
							},
						],
						timestamp: new Date().toISOString(),
					},
				});
			} else {
				// Admin exited camera
				const startTime = this.cameraSessions.get(event.player.eosID);
				this.cameraSessions.delete(event.player.eosID);

				let durationText = "Unknown";
				if (startTime) {
					const durationMs = Date.now() - startTime;
					const durationSec = Math.floor(durationMs / 1000);
					const minutes = Math.floor(durationSec / 60);
					const seconds = durationSec % 60;
					durationText =
						minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
				}

				this.log.verbose(
					`Admin cam exited: ${event.player.name} (${durationText})`,
				);

				await this.sendDiscordMessage(this.options.channelID as string, {
					embed: {
						title: "📷 Admin Camera Exited",
						description: `**${playerName}** exited admin camera`,
						color: this.options.exitColor as number,
						fields: [
							{
								name: "Admin",
								value: playerName,
								inline: true,
							},
							{
								name: "Duration",
								value: durationText,
								inline: true,
							},
							{
								name: "Steam ID",
								value: event.player.steamID ?? "N/A",
								inline: true,
							},
						],
						timestamp: new Date().toISOString(),
					},
				});
			}
		});

		this.log.info(
			`Logging admin camera usage to Discord channel ${this.options.channelID}`,
		);
	}

	/**
	 * Clean up camera session tracking on unmount.
	 */
	async unmount(): Promise<void> {
		this.cameraSessions.clear();
		await super.unmount();
	}
}

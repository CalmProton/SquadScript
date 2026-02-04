/**
 * @squadscript/plugins
 *
 * DiscordAdminBroadcast Plugin
 *
 * Mirrors admin broadcasts to a Discord channel. Useful for keeping
 * Discord users informed about server announcements.
 *
 * @example
 * ```typescript
 * server.registerPlugin(DiscordAdminBroadcast, {
 *   channelID: '123456789012345678',
 *   color: 0xffa500,
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
 * Options specification for DiscordAdminBroadcast plugin.
 */
const optionsSpec = {
	...discordBaseOptions,
	channelID: {
		type: "string",
		required: true,
		description: "Discord channel ID to post admin broadcasts to",
	},
	color: {
		type: "number",
		required: false,
		description: "Embed color for broadcast messages",
		default: 0xffa500, // Orange
	},
} as const satisfies OptionsSpec;

/**
 * DiscordAdminBroadcast Plugin
 *
 * Listens for admin broadcast events and posts them to a Discord channel.
 * Displays the broadcast message with timestamp.
 */
export class DiscordAdminBroadcast extends DiscordBasePlugin<
	typeof optionsSpec
> {
	static readonly meta: PluginMeta = {
		name: "DiscordAdminBroadcast",
		description: "Mirror admin broadcasts to a Discord channel",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Subscribe to admin broadcast events.
	 */
	async mount(): Promise<void> {
		this.on("ADMIN_BROADCAST", async (event) => {
			this.log.verbose(`Admin broadcast: ${event.message}`);

			// Build fields
			const fields: { name: string; value: string; inline?: boolean }[] = [];

			if (event.duration !== null) {
				fields.push({
					name: "Duration",
					value: `${event.duration} seconds`,
					inline: true,
				});
			}

			// Send to Discord
			await this.sendDiscordMessage(this.options.channelID as string, {
				embed: {
					title: "📢 Admin Broadcast",
					description: event.message,
					color: this.options.color as number,
					fields: fields.length > 0 ? fields : undefined,
					timestamp: new Date().toISOString(),
				},
			});
		});

		this.log.info(
			`Logging admin broadcasts to Discord channel ${this.options.channelID}`,
		);
	}
}

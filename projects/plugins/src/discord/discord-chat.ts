/**
 * @squadscript/plugins
 *
 * DiscordChat Plugin
 *
 * Logs in-game chat messages to a Discord channel. Supports filtering
 * by chat channel and customizable embed colors.
 *
 * @example
 * ```typescript
 * server.registerPlugin(DiscordChat, {
 *   channelID: '123456789012345678',
 *   ignoreChats: ['ChatSquad'],
 *   chatColors: {
 *     ChatAll: 0x00ff00,
 *     ChatTeam: 0x0000ff,
 *     ChatAdmin: 0xff0000,
 *   },
 * });
 * ```
 *
 * @module
 */

import type { ChatChannel, OptionsSpec, PluginMeta } from "@squadscript/types";
import {
	DiscordBasePlugin,
	discordBaseOptions,
} from "./discord-base-plugin.js";

/**
 * Default colors for chat channels.
 */
const DEFAULT_CHAT_COLORS: Record<ChatChannel, number> = {
	ChatAll: 0xffd700, // Gold
	ChatTeam: 0x00bfff, // Deep Sky Blue
	ChatSquad: 0x32cd32, // Lime Green
	ChatAdmin: 0xff4500, // Orange Red
};

/**
 * Options specification for DiscordChat plugin.
 */
const optionsSpec = {
	...discordBaseOptions,
	channelID: {
		type: "string",
		required: true,
		description: "Discord channel ID to post chat messages to",
	},
	color: {
		type: "number",
		required: false,
		description: "Default embed color (used if no chat-specific color)",
		default: 0xffd700,
	},
	chatColors: {
		type: "object",
		required: false,
		description:
			"Colors for specific chat channels (e.g., { ChatAll: 0x00ff00 })",
		default: {},
	},
	ignoreChats: {
		type: "array",
		required: false,
		description: "Chat channels to ignore (e.g., ['ChatSquad'])",
		default: [],
	},
} as const satisfies OptionsSpec;

/**
 * DiscordChat Plugin
 *
 * Logs in-game chat messages to a Discord channel with colored embeds.
 * Each message shows the player name, team, squad, and message content.
 */
export class DiscordChat extends DiscordBasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "DiscordChat",
		description: "Log in-game chat messages to a Discord channel",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Subscribe to chat message events.
	 */
	async mount(): Promise<void> {
		this.on("CHAT_MESSAGE", async (event) => {
			// Check if this chat channel should be ignored
			const ignoreChats = (this.options.ignoreChats ?? []) as ChatChannel[];
			if (ignoreChats.includes(event.channel)) {
				return;
			}

			// Determine embed color
			const chatColors = (this.options.chatColors ?? {}) as Record<
				string,
				number
			>;
			const color =
				chatColors[event.channel] ??
				DEFAULT_CHAT_COLORS[event.channel] ??
				(this.options.color as number);

			// Format the channel name for display
			const channelDisplay = event.channel.replace("Chat", "");

			// Build squad info string
			const squadInfo = event.player.squadID
				? `Squad ${event.player.squadID}`
				: "Unassigned";

			// Build fields array - matches original by including Steam ID and EOS ID
			const fields: { name: string; value: string; inline?: boolean }[] = [
				{
					name: "Player",
					value: this.escapeMarkdown(event.player.name),
					inline: true,
				},
				{
					name: "SteamID",
					value: event.player.steamID
						? `[${event.player.steamID}](https://steamcommunity.com/profiles/${event.player.steamID})`
						: "N/A",
					inline: true,
				},
				{
					name: "EosID",
					value: event.player.eosID,
					inline: true,
				},
				{
					name: "Team & Squad",
					value: `Team: ${event.player.teamID ?? "?"}, Squad: ${squadInfo}`,
					inline: false,
				},
				{
					name: "Message",
					value: event.message,
					inline: false,
				},
			];

			// Send to Discord
			await this.sendDiscordMessage(this.options.channelID as string, {
				embed: {
					title: channelDisplay,
					color,
					fields,
					timestamp: new Date().toISOString(),
				},
			});
		});

		this.log.info(`Logging chat to Discord channel ${this.options.channelID}`);
	}
}

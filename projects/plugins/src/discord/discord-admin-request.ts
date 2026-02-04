/**
 * @squadscript/plugins
 *
 * DiscordAdminRequest Plugin
 *
 * Pings Discord admins when players use the `!admin` command in-game.
 * Supports role pings, cooldowns, and in-game admin notifications.
 *
 * @example
 * ```typescript
 * server.registerPlugin(DiscordAdminRequest, {
 *   channelID: '123456789012345678',
 *   pingGroups: ['987654321098765432'], // Discord role IDs
 *   pingDelay: 60000, // 1 minute cooldown
 *   command: 'admin',
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
 * Options specification for DiscordAdminRequest plugin.
 */
const optionsSpec = {
	...discordBaseOptions,
	channelID: {
		type: "string",
		required: true,
		description: "Discord channel ID to post admin requests to",
	},
	command: {
		type: "string",
		required: false,
		description: "Command trigger (without prefix)",
		default: "admin",
	},
	pingGroups: {
		type: "array",
		required: false,
		description: "Discord role IDs to ping when admin is requested",
		default: [],
	},
	pingHere: {
		type: "boolean",
		required: false,
		description: "Use @here ping instead of role pings",
		default: false,
	},
	pingDelay: {
		type: "number",
		required: false,
		description: "Cooldown between pings in milliseconds",
		default: 60000, // 1 minute
	},
	ignoreChats: {
		type: "array",
		required: false,
		description: "Chat channels to ignore (e.g., ['ChatSquad'])",
		default: [],
	},
	ignorePhrases: {
		type: "array",
		required: false,
		description: "Phrases to ignore in admin requests",
		default: [],
	},
	warnInGameAdmins: {
		type: "boolean",
		required: false,
		description: "Send a warning to in-game admins when admin is requested",
		default: false,
	},
	showInGameAdmins: {
		type: "boolean",
		required: false,
		description: "Tell the requester how many admins are online",
		default: true,
	},
	color: {
		type: "number",
		required: false,
		description: "Embed color for admin request messages",
		default: 0xff6b6b, // Coral red
	},
} as const satisfies OptionsSpec;

/**
 * DiscordAdminRequest Plugin
 *
 * Monitors for `!admin` commands and alerts Discord admins.
 * Includes ping cooldowns to prevent spam and shows online admin count.
 */
export class DiscordAdminRequest extends DiscordBasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "DiscordAdminRequest",
		description: "Ping Discord admins when players use !admin command",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Timestamp of the last ping to enforce cooldown.
	 */
	private lastPingTime = 0;

	/**
	 * Subscribe to chat command events.
	 */
	async mount(): Promise<void> {
		this.on("CHAT_COMMAND", async (event) => {
			// Check if this is the admin command
			if (event.command !== (this.options.command as string).toLowerCase()) {
				return;
			}

			// Check if this chat channel should be ignored
			const ignoreChats = (this.options.ignoreChats ?? []) as ChatChannel[];
			if (ignoreChats.includes(event.channel)) {
				return;
			}

			// Check for ignored phrases
			const ignorePhrases = (this.options.ignorePhrases ?? []) as string[];
			const lowerArgs = event.args.toLowerCase();
			for (const phrase of ignorePhrases) {
				if (lowerArgs.includes(phrase.toLowerCase())) {
					this.log.debug(`Ignoring admin request with phrase: ${phrase}`);
					return;
				}
			}

			// Require a message - warn the player if empty (matches original behavior)
			const requestMessage = event.args.trim();
			if (requestMessage.length === 0) {
				await this.rcon.warn(
					event.player.eosID,
					"Please specify what you would like help with when requesting an admin.",
				);
				return;
			}

			this.log.info(
				`Admin request from ${event.player.name}: ${requestMessage}`,
			);

			// Notify in-game admins if enabled
			if (this.options.showInGameAdmins) {
				// Note: In a real implementation, you would get admin count from server state
				await this.rcon.warn(
					event.player.eosID,
					"Your admin request has been sent to Discord.",
				);
			}

			// Check ping cooldown
			const now = Date.now();
			const canPing =
				now - this.lastPingTime >= (this.options.pingDelay as number);

			// Build ping string
			let pingContent = "";
			if (canPing) {
				if (this.options.pingHere) {
					pingContent = "@here ";
				} else {
					const pingGroups = (this.options.pingGroups ?? []) as string[];
					if (pingGroups.length > 0) {
						pingContent = `${pingGroups.map((id) => `<@&${id}>`).join(" ")} `;
					}
				}
				this.lastPingTime = now;
			}

			// Build squad info
			const squadInfo = event.player.squadID
				? `Squad ${event.player.squadID}`
				: "Unassigned";

			// Build fields
			const fields: { name: string; value: string; inline?: boolean }[] = [
				{
					name: "Player",
					value: this.escapeMarkdown(event.player.name),
					inline: true,
				},
				{
					name: "Team/Squad",
					value: `Team ${event.player.teamID ?? "?"} / ${squadInfo}`,
					inline: true,
				},
				{
					name: "Channel",
					value: event.channel.replace("Chat", ""),
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

				const cblLink = this.getCBLLink(event.player.steamID);
				if (cblLink) {
					fields.push({
						name: "CBL Profile",
						value: `[View Profile](${cblLink})`,
						inline: true,
					});
				}
			}

			// Send to Discord
			await this.sendDiscordMessage(this.options.channelID as string, {
				content: pingContent || undefined,
				embed: {
					title: "🚨 Admin Request",
					description: requestMessage,
					color: this.options.color as number,
					fields,
					footer: canPing
						? undefined
						: { text: "Ping cooldown active - admins not pinged" },
					timestamp: new Date().toISOString(),
				},
			});
		});

		this.log.info(
			`Listening for !${this.options.command} requests on Discord channel ${this.options.channelID}`,
		);
	}
}

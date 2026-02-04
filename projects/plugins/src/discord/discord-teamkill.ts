/**
 * @squadscript/plugins
 *
 * DiscordTeamkill Plugin
 *
 * Logs teamkills to a Discord channel for admin review. Includes
 * player information, weapon used, and optional Community Ban List links.
 *
 * @example
 * ```typescript
 * server.registerPlugin(DiscordTeamkill, {
 *   channelID: '123456789012345678',
 *   includeCBL: true,
 *   color: 0xff0000,
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
 * Options specification for DiscordTeamkill plugin.
 */
const optionsSpec = {
	...discordBaseOptions,
	channelID: {
		type: "string",
		required: true,
		description: "Discord channel ID to post teamkill notifications to",
	},
	color: {
		type: "number",
		required: false,
		description: "Embed color for teamkill messages",
		default: 0xff0000, // Red
	},
	includeCBL: {
		type: "boolean",
		required: false,
		description: "Include Community Ban List profile links",
		default: true,
	},
} as const satisfies OptionsSpec;

/**
 * DiscordTeamkill Plugin
 *
 * Monitors for teamkill events and posts detailed information to Discord.
 * Helps admins track teamkill incidents and identify repeat offenders.
 */
export class DiscordTeamkill extends DiscordBasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "DiscordTeamkill",
		description: "Log teamkills to a Discord channel for admin review",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Subscribe to player death events to detect teamkills.
	 */
	async mount(): Promise<void> {
		this.on("PLAYER_DIED", async (event) => {
			// Skip if no attacker (suicide, environmental)
			if (!event.attacker) {
				return;
			}

			// Skip if different teams (not a teamkill)
			if (event.attacker.teamID !== event.victim.teamID) {
				return;
			}

			// Skip suicides
			if (event.suicide) {
				return;
			}

			this.log.verbose(
				`Teamkill: ${event.attacker.name} -> ${event.victim.name}`,
			);

			// Build fields - matches original by including Steam ID and EOS ID
			const fields: { name: string; value: string; inline?: boolean }[] = [
				{
					name: "Attacker's Name",
					value: this.escapeMarkdown(event.attacker.name),
					inline: true,
				},
				{
					name: "Attacker's SteamID",
					value: event.attacker.steamID
						? `[${event.attacker.steamID}](https://steamcommunity.com/profiles/${event.attacker.steamID})`
						: "N/A",
					inline: true,
				},
				{
					name: "Attacker's EosID",
					value: event.attacker.eosID,
					inline: true,
				},
				{
					name: "Weapon",
					value: event.weapon ?? "Unknown",
					inline: false,
				},
				{
					name: "Victim's Name",
					value: this.escapeMarkdown(event.victim.name),
					inline: true,
				},
				{
					name: "Victim's SteamID",
					value: event.victim.steamID
						? `[${event.victim.steamID}](https://steamcommunity.com/profiles/${event.victim.steamID})`
						: "N/A",
					inline: true,
				},
				{
					name: "Victim's EosID",
					value: event.victim.eosID,
					inline: true,
				},
			];

			// Add CBL links if enabled (matches original disableCBL option, but inverted)
			if (this.options.includeCBL && event.attacker.steamID) {
				fields.push({
					name: "Community Ban List",
					value: `[Attacker's Bans](https://communitybanlist.com/search/${event.attacker.steamID})`,
					inline: false,
				});
			}

			// Send to Discord (title matches original format)
			await this.sendDiscordMessage(this.options.channelID as string, {
				embed: {
					title: `Teamkill: ${this.escapeMarkdown(event.attacker.name)}`,
					color: this.options.color as number,
					fields,
					timestamp: new Date().toISOString(),
				},
			});
		});

		this.log.info(
			`Logging teamkills to Discord channel ${this.options.channelID}`,
		);
	}
}

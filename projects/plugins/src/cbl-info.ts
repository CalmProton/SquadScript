/**
 * @squadscript/plugins
 *
 * CBLInfo Plugin
 *
 * Alerts admins when players with Community Ban List (CBL) reputation join.
 * Queries the CBL API on player connect and posts alerts to Discord if
 * the player has a reputation above the configured threshold.
 *
 * @example
 * ```typescript
 * server.registerPlugin(CBLInfo, {
 *   channelID: '123456789012345678',
 *   threshold: 1, // Alert on any CBL reputation
 *   pingGroups: ['987654321098765432'], // Role IDs to ping
 * });
 * ```
 *
 * @module
 */

import type {
	DiscordMessageOptions,
	OptionsSpec,
	PluginMeta,
} from "@squadscript/types";
import { DiscordBasePlugin, discordBaseOptions } from "./discord/index.js";

/**
 * CBL API response type for a player.
 */
interface CBLPlayerInfo {
	/** Steam ID of the player. */
	readonly steamID: string;
	/** Number of active bans on CBL. */
	readonly activeBans: number;
	/** Number of expired bans on CBL. */
	readonly expiredBans: number;
	/** Total reputation score (higher = worse). */
	readonly reputationPoints: number;
	/** Risk rating from CBL (0-10 scale). */
	readonly riskRating: number;
	/** Array of ban reasons. */
	readonly banReasons: readonly string[];
}

/**
 * Options specification for CBLInfo plugin.
 */
const optionsSpec = {
	...discordBaseOptions,
	channelID: {
		type: "string",
		required: true,
		description: "Discord channel ID for CBL alerts",
	},
	threshold: {
		type: "number",
		required: false,
		description:
			"Minimum reputation points to trigger an alert (0 = any record)",
		default: 1,
	},
	pingGroups: {
		type: "array",
		required: false,
		description: "Discord role IDs to ping on alerts",
		default: [],
	},
	pingHere: {
		type: "boolean",
		required: false,
		description: "Use @here ping on alerts",
		default: false,
	},
	color: {
		type: "number",
		required: false,
		description: "Embed color for alerts (hex number)",
		default: 0xff4444,
	},
	apiEndpoint: {
		type: "string",
		required: false,
		description: "CBL API endpoint URL",
		default: "https://communitybanlist.com/api/player",
	},
	timeout: {
		type: "number",
		required: false,
		description: "API request timeout in milliseconds",
		default: 5000,
	},
	showExpiredBans: {
		type: "boolean",
		required: false,
		description: "Include expired bans in the alert",
		default: true,
	},
} as const satisfies OptionsSpec;

/**
 * CBLInfo Plugin
 *
 * Monitors player connections and alerts admins when players with
 * Community Ban List reputation join the server.
 */
export class CBLInfo extends DiscordBasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "CBLInfo",
		description: "Alert admins when players with CBL reputation join",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Subscribe to player connection events.
	 */
	async mount(): Promise<void> {
		this.on("PLAYER_CONNECTED", async (event) => {
			const { player } = event;

			// CBL requires Steam ID
			if (!player.steamID) {
				this.log.debug(
					`Player ${player.name} has no Steam ID, skipping CBL check`,
				);
				return;
			}

			try {
				const cblInfo = await this.queryCBL(player.steamID);

				if (cblInfo && this.shouldAlert(cblInfo)) {
					await this.sendAlert(
						player.name ?? "Unknown",
						player.steamID,
						cblInfo,
					);
				}
			} catch (error) {
				this.log.warn(
					`Failed to query CBL for ${player.name}`,
					error instanceof Error ? { error: error.message } : undefined,
				);
			}
		});

		this.log.info("CBL monitoring enabled", {
			threshold: this.options.threshold,
		});
	}

	/**
	 * Query the CBL API for player information.
	 *
	 * @param steamID - The player's Steam ID
	 * @returns CBL player info or null if not found/error
	 */
	private async queryCBL(steamID: string): Promise<CBLPlayerInfo | null> {
		const controller = new AbortController();
		const timeoutId = setTimeout(
			() => controller.abort(),
			this.options.timeout,
		);

		try {
			const response = await fetch(`${this.options.apiEndpoint}/${steamID}`, {
				method: "GET",
				headers: {
					Accept: "application/json",
				},
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				if (response.status === 404) {
					// Player not in CBL database - this is fine
					return null;
				}
				throw new Error(`CBL API returned ${response.status}`);
			}

			const data = (await response.json()) as {
				activeBans?: number;
				expiredBans?: number;
				reputationPoints?: number;
				riskRating?: number;
				bans?: readonly { reason?: string }[];
			};

			return {
				steamID,
				activeBans: data.activeBans ?? 0,
				expiredBans: data.expiredBans ?? 0,
				reputationPoints: data.reputationPoints ?? 0,
				riskRating: data.riskRating ?? 0,
				banReasons: data.bans?.map((b) => b.reason ?? "Unknown") ?? [],
			};
		} catch (error) {
			clearTimeout(timeoutId);

			if (error instanceof Error && error.name === "AbortError") {
				throw new Error("CBL API request timed out");
			}
			throw error;
		}
	}

	/**
	 * Check if a player's CBL info should trigger an alert.
	 *
	 * @param info - CBL player information
	 * @returns True if an alert should be sent
	 */
	private shouldAlert(info: CBLPlayerInfo): boolean {
		// Check reputation threshold
		if (info.reputationPoints >= (this.options.threshold ?? 1)) {
			return true;
		}

		// Also alert on active bans regardless of threshold
		if (info.activeBans > 0) {
			return true;
		}

		return false;
	}

	/**
	 * Send a CBL alert to Discord.
	 *
	 * @param playerName - The player's name
	 * @param steamID - The player's Steam ID
	 * @param info - CBL player information
	 */
	private async sendAlert(
		playerName: string,
		steamID: string,
		info: CBLPlayerInfo,
	): Promise<void> {
		const pingMentions: string[] = [];

		if (this.options.pingHere) {
			pingMentions.push("@here");
		}

		const pingGroups = this.options.pingGroups as readonly string[];
		for (const roleId of pingGroups) {
			pingMentions.push(`<@&${roleId}>`);
		}

		const fields: { name: string; value: string; inline: boolean }[] = [
			{
				name: "Player",
				value: this.escapeMarkdown(playerName),
				inline: true,
			},
			{
				name: "Steam ID",
				value: `[${steamID}](https://steamcommunity.com/profiles/${steamID})`,
				inline: true,
			},
			{
				name: "CBL Profile",
				value: `[View on CBL](https://communitybanlist.com/search/${steamID})`,
				inline: true,
			},
			{
				name: "Active Bans",
				value: String(info.activeBans),
				inline: true,
			},
			{
				name: "Reputation Points",
				value: String(info.reputationPoints),
				inline: true,
			},
			{
				name: "Risk Rating",
				value: `${info.riskRating}/10`,
				inline: true,
			},
		];

		if (this.options.showExpiredBans) {
			fields.push({
				name: "Expired Bans",
				value: String(info.expiredBans),
				inline: true,
			});
		}

		if (info.banReasons.length > 0) {
			fields.push({
				name: "Ban Reasons",
				value:
					info.banReasons.slice(0, 5).join(", ") +
					(info.banReasons.length > 5
						? ` (+${info.banReasons.length - 5} more)`
						: ""),
				inline: false,
			});
		}

		const message: DiscordMessageOptions = {
			content: pingMentions.length > 0 ? pingMentions.join(" ") : undefined,
			embed: {
				title: "⚠️ CBL Alert - Player Connected",
				description: `A player with Community Ban List history has joined the server.`,
				color: this.options.color,
				fields,
				footer: { text: "Community Ban List" },
				timestamp: new Date().toISOString(),
			},
		};

		await this.sendDiscordMessage(this.options.channelID, message);

		this.log.info(`CBL alert sent for ${playerName}`, {
			steamID,
			activeBans: info.activeBans,
			reputationPoints: info.reputationPoints,
		});
	}
}

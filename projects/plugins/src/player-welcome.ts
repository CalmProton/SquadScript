/**
 * @squadscript/plugins
 *
 * PlayerWelcome Plugin
 *
 * Sends personalized welcome messages to players when they connect,
 * with different messages for first-time visitors vs. returning players.
 *
 * @example
 * ```typescript
 * server.registerPlugin(PlayerWelcome, {
 *   newPlayerMessage: 'Welcome to {server}, {player}! Type !help for commands.',
 *   returningPlayerMessage: 'Welcome back, {player}! This is visit #{visits}.',
 *   messageDelay: 10000,
 * });
 * ```
 *
 * @module
 */

import { BasePlugin } from "@squadscript/core";
import type { EOSID, OptionsSpec, PluginMeta } from "@squadscript/types";

/**
 * Player visit tracking data.
 */
interface PlayerVisitData {
	eosID: EOSID;
	visitCount: number;
	firstSeen: Date;
	lastSeen: Date;
}

/**
 * Options specification for PlayerWelcome plugin.
 */
const optionsSpec = {
	newPlayerMessage: {
		type: "string",
		required: false,
		description: "Message for first-time players",
		default: "Welcome to {server}, {player}! Type !help for commands.",
	},
	returningPlayerMessage: {
		type: "string",
		required: false,
		description: "Message for returning players",
		default: "Welcome back, {player}! This is visit #{visits}.",
	},
	messageDelay: {
		type: "number",
		required: false,
		description: "Delay before sending welcome message (ms)",
		default: 10000,
	},
	trackVisits: {
		type: "boolean",
		required: false,
		description: "Track player visit counts",
		default: true,
	},
	vipMessage: {
		type: "string",
		required: false,
		description:
			"Special message for VIP/reserved slot players (null to disable)",
		default: null,
	},
	adminMessage: {
		type: "string",
		required: false,
		description: "Special message for admins (null to disable)",
		default: null,
	},
	serverName: {
		type: "string",
		required: false,
		description: "Server name for {server} placeholder",
		default: "our server",
	},
} as const satisfies OptionsSpec;

/**
 * PlayerWelcome Plugin
 *
 * Sends personalized welcome messages to players based on their visit history.
 */
export class PlayerWelcome extends BasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "PlayerWelcome",
		description: "Sends personalized welcome messages to players",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * In-memory visit tracking (resets on server restart).
	 */
	private playerVisits = new Map<string, PlayerVisitData>();

	/**
	 * Pending welcome messages to prevent duplicates.
	 */
	private pendingWelcomes = new Set<string>();

	/**
	 * Subscribe to player join events.
	 */
	async mount(): Promise<void> {
		this.on("PLAYER_JOIN_SUCCEEDED", (event) => {
			const eosID = event.eosID;

			// Prevent duplicate welcomes for same player
			if (this.pendingWelcomes.has(eosID)) {
				return;
			}

			this.pendingWelcomes.add(eosID);

			// Delay to let player fully load and avoid mass-join spam
			const delay = this.options.messageDelay ?? 10000;
			this.setTimeout(
				() => this.welcomePlayer(eosID),
				delay,
				`welcome-${eosID}`,
			);
		});

		this.log.info("PlayerWelcome mounted", {
			messageDelay: this.options.messageDelay,
			trackVisits: this.options.trackVisits,
		});
	}

	/**
	 * Send welcome message to player.
	 */
	private async welcomePlayer(eosID: EOSID): Promise<void> {
		this.pendingWelcomes.delete(eosID);

		// Find the player in current player list
		const player = this.server.getPlayerByEOSID(eosID);
		if (!player) {
			this.log.debug(`Player ${eosID} no longer connected, skipping welcome`);
			return;
		}

		// Get or create visit data
		const visitData = this.getOrCreateVisitData(eosID);
		const isNewPlayer = visitData.visitCount === 0;

		if (this.options.trackVisits) {
			visitData.visitCount++;
			visitData.lastSeen = new Date();
		}

		// Determine which message to send
		let message: string;

		// Note: Admin/VIP messages require external admin list integration
		// which is not available in ServerStateReader
		if (isNewPlayer) {
			message = this.options.newPlayerMessage as string;
		} else {
			message = this.options.returningPlayerMessage as string;
		}

		// Format the message
		const formattedMessage = this.formatMessage(
			message,
			player.name,
			visitData,
		);

		this.log.debug(`Welcoming ${player.name}`, {
			isNew: isNewPlayer,
			visits: visitData.visitCount,
		});

		try {
			await this.rcon.warn(eosID, formattedMessage);
		} catch (error) {
			this.log.error(
				`Failed to send welcome message to ${player.name}`,
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Get or create visit data for a player.
	 */
	private getOrCreateVisitData(eosID: EOSID): PlayerVisitData {
		let data = this.playerVisits.get(eosID);

		if (!data) {
			data = {
				eosID,
				visitCount: 0,
				firstSeen: new Date(),
				lastSeen: new Date(),
			};
			this.playerVisits.set(eosID, data);
		}

		return data;
	}

	/**
	 * Format message with placeholders.
	 */
	private formatMessage(
		template: string,
		playerName: string,
		visitData: PlayerVisitData,
	): string {
		const serverName = this.options.serverName as string;
		const playerCount = this.server.playerCount;

		return template
			.replace(/{player}/g, playerName)
			.replace(/{server}/g, serverName)
			.replace(/{visits}/g, String(visitData.visitCount))
			.replace(/{playercount}/g, String(playerCount))
			.replace(/{firstseen}/g, visitData.firstSeen.toLocaleDateString());
	}
}

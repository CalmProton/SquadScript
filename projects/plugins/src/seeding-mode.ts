/**
 * @squadscript/plugins
 *
 * SeedingMode Plugin
 *
 * Broadcast seeding rule messages when the server is below a player count threshold.
 *
 * @example
 * ```typescript
 * server.registerPlugin(SeedingMode, {
 *   seedingThreshold: 50,
 *   seedingMessage: 'Seeding Rules Active! Fight only over the middle flags!',
 *   liveThreshold: 52,
 *   liveMessage: 'Server is now LIVE! Normal rules apply.',
 * });
 * ```
 *
 * @module
 */

import { BasePlugin } from "@squadscript/core";
import type { OptionsSpec, PluginMeta } from "@squadscript/types";

/**
 * Options specification for SeedingMode plugin.
 */
const optionsSpec = {
	interval: {
		type: "number",
		required: false,
		description: "Broadcast interval in milliseconds",
		default: 150000, // 2.5 minutes
	},
	seedingThreshold: {
		type: "number",
		required: false,
		description: "Player count below which seeding rules are active",
		default: 50,
	},
	seedingMessage: {
		type: "string",
		required: false,
		description: "Message broadcast when seeding rules are active",
		default: "Seeding Rules Active! Fight only over the middle flags!",
	},
	liveEnabled: {
		type: "boolean",
		required: false,
		description: 'Enable "Live" announcements when transitioning from seeding',
		default: true,
	},
	liveThreshold: {
		type: "number",
		required: false,
		description: 'Player count at which "Live" message is broadcast',
		default: 52,
	},
	liveMessage: {
		type: "string",
		required: false,
		description: "Message broadcast when server goes live",
		default: "Server is now LIVE! Normal rules apply.",
	},
	waitOnNewGames: {
		type: "boolean",
		required: false,
		description: "Pause broadcasts briefly after new game starts",
		default: true,
	},
	waitTimeOnNewGame: {
		type: "number",
		required: false,
		description: "How long to pause after new game in milliseconds",
		default: 30000, // 30 seconds
	},
} as const satisfies OptionsSpec;

/**
 * SeedingMode Plugin
 *
 * Broadcasts seeding rule messages when the server is below a player count threshold.
 * Can also announce when the server transitions to "live" mode.
 */
export class SeedingMode extends BasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "SeedingMode",
		description:
			"Broadcast seeding rule messages when server is below player threshold",
		version: "1.0.0",
		defaultEnabled: true,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Whether broadcasts are currently paused (after new game).
	 */
	private isPaused = false;

	/**
	 * Track whether we've already announced going live.
	 */
	private hasAnnouncedLive = false;

	/**
	 * Subscribe to events and start broadcast interval.
	 */
	async mount(): Promise<void> {
		// Handle new game pause
		if (this.options.waitOnNewGames) {
			this.on("NEW_GAME", () => {
				this.log.debug("New game started, pausing broadcasts");
				this.isPaused = true;
				this.hasAnnouncedLive = false; // Reset live announcement

				this.setTimeout(
					() => {
						this.isPaused = false;
						this.log.debug("Broadcast pause ended");
					},
					this.options.waitTimeOnNewGame ?? 30000,
					"new-game-pause",
				);
			});
		}

		// Start broadcast interval
		const interval = this.options.interval ?? 150000;
		this.setInterval(() => this.broadcast(), interval, "seeding-broadcast");

		this.log.info("SeedingMode mounted", {
			seedingThreshold: this.options.seedingThreshold,
			interval,
		});
	}

	/**
	 * Check player count and broadcast appropriate message.
	 */
	private async broadcast(): Promise<void> {
		if (this.isPaused) {
			return;
		}

		const playerCount = this.server.playerCount;
		const seedingThreshold = this.options.seedingThreshold ?? 50;
		const liveThreshold = this.options.liveThreshold ?? 52;

		this.log.debug(`Player count: ${playerCount}`, {
			seedingThreshold,
			liveThreshold,
		});

		try {
			if (playerCount < seedingThreshold) {
				// Server is in seeding mode
				this.hasAnnouncedLive = false; // Reset so we can announce again later

				if (this.options.seedingMessage) {
					await this.rcon.broadcast(this.options.seedingMessage);
					this.log.verbose("Broadcast seeding message");
				}
			} else if (
				this.options.liveEnabled &&
				playerCount >= liveThreshold &&
				!this.hasAnnouncedLive
			) {
				// Server is now live
				if (this.options.liveMessage) {
					await this.rcon.broadcast(this.options.liveMessage);
					this.log.info("Server transitioned to LIVE");
					this.hasAnnouncedLive = true;
				}
			}
		} catch (error) {
			this.log.error(
				"Failed to broadcast seeding message",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}
}

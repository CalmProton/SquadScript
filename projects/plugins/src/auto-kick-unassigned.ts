/**
 * @squadscript/plugins
 *
 * AutoKickUnassigned Plugin
 *
 * Automatically kick players who remain unassigned (not in a squad) for too long.
 *
 * @example
 * ```typescript
 * server.registerPlugin(AutoKickUnassigned, {
 *   warningMessage: 'Join a squad, you are unassigned and will be kicked',
 *   kickMessage: 'Unassigned - automatically removed',
 *   unassignedTimer: 360000, // 6 minutes
 *   playerThreshold: 93,
 * });
 * ```
 *
 * @module
 */

import { BasePlugin } from "@squadscript/core";
import type {
	EOSID,
	OptionsSpec,
	Player,
	PluginMeta,
} from "@squadscript/types";

/**
 * Options specification for AutoKickUnassigned plugin.
 */
const optionsSpec = {
	warningMessage: {
		type: "string",
		required: false,
		description: "Warning message sent to unassigned players",
		default: "Join a squad, you are unassigned and will be kicked",
	},
	kickMessage: {
		type: "string",
		required: false,
		description: "Kick reason shown to the player",
		default: "Unassigned - automatically removed",
	},
	frequencyOfWarnings: {
		type: "number",
		required: false,
		description: "Interval between warnings in milliseconds",
		default: 30000, // 30 seconds
	},
	unassignedTimer: {
		type: "number",
		required: false,
		description: "Time before kick in milliseconds",
		default: 360000, // 6 minutes
	},
	playerThreshold: {
		type: "number",
		required: false,
		description: "Minimum player count for auto-kick (-1 to disable)",
		default: 93,
	},
	roundStartDelay: {
		type: "number",
		required: false,
		description: "Grace period after round start in milliseconds",
		default: 900000, // 15 minutes
	},
	ignoreAdmins: {
		type: "boolean",
		required: false,
		description: "Exempt admins from auto-kick",
		default: false,
	},
	ignoreWhitelist: {
		type: "boolean",
		required: false,
		description: "Exempt reserved slot players from auto-kick",
		default: false,
	},
} as const satisfies OptionsSpec;

/**
 * Tracked player state for unassigned detection.
 */
interface TrackedPlayer {
	eosID: EOSID;
	name: string;
	unassignedSince: number;
	lastWarning: number;
	warnCount: number;
}

/**
 * AutoKickUnassigned Plugin
 *
 * Tracks players who are not in a squad and kicks them after a configurable
 * timeout. Sends progressive warnings before kicking.
 */
export class AutoKickUnassigned extends BasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "AutoKickUnassigned",
		description:
			"Automatically kick players who remain unassigned for too long",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Map of player EOS ID to tracking information.
	 */
	private trackedPlayers = new Map<EOSID, TrackedPlayer>();

	/**
	 * Whether we're in the grace period after round start.
	 */
	private inGracePeriod = false;

	/**
	 * Subscribe to events and start the check interval.
	 */
	async mount(): Promise<void> {
		// Handle new game - start grace period
		this.on("NEW_GAME", () => {
			this.log.debug("New game started, entering grace period");
			this.inGracePeriod = true;
			this.trackedPlayers.clear();

			const delay = this.options.roundStartDelay ?? 900000;
			this.setTimeout(
				() => {
					this.inGracePeriod = false;
					this.log.debug("Grace period ended");
				},
				delay,
				"round-start-grace",
			);
		});

		// Track disconnections
		this.on("PLAYER_DISCONNECTED", (event) => {
			this.trackedPlayers.delete(event.player.eosID);
			this.log.debug(`Stopped tracking ${event.player.name} (disconnected)`);
		});

		// Periodic check for unassigned players
		const checkInterval = this.options.frequencyOfWarnings ?? 30000;
		this.setInterval(
			() => this.checkPlayers(),
			checkInterval,
			"unassigned-check",
		);

		this.log.info("AutoKickUnassigned mounted", {
			unassignedTimer: this.options.unassignedTimer,
			playerThreshold: this.options.playerThreshold,
		});
	}

	/**
	 * Check all players and handle unassigned ones.
	 */
	private async checkPlayers(): Promise<void> {
		// Skip during grace period
		if (this.inGracePeriod) {
			return;
		}

		// Check player threshold
		const threshold = this.options.playerThreshold ?? 93;
		if (threshold !== -1 && this.server.playerCount < threshold) {
			this.log.debug(
				`Player count ${this.server.playerCount} below threshold ${threshold}`,
			);
			return;
		}

		const now = Date.now();
		const unassignedTimer = this.options.unassignedTimer ?? 360000;
		const warningInterval = this.options.frequencyOfWarnings ?? 30000;

		for (const [eosID, player] of this.server.players) {
			// Skip players in a squad
			if (player.squadID !== null) {
				// Player joined a squad, stop tracking
				if (this.trackedPlayers.has(eosID)) {
					this.trackedPlayers.delete(eosID);
					this.log.debug(`${player.name} joined a squad, stopped tracking`);
				}
				continue;
			}

			// Skip exempt players
			if (await this.isExempt(player)) {
				continue;
			}

			// Start tracking if not already tracked
			let tracked = this.trackedPlayers.get(eosID);
			if (!tracked) {
				tracked = {
					eosID,
					name: player.name,
					unassignedSince: now,
					lastWarning: 0,
					warnCount: 0,
				};
				this.trackedPlayers.set(eosID, tracked);
				this.log.debug(`Started tracking unassigned player: ${player.name}`);
			}

			const timeUnassigned = now - tracked.unassignedSince;

			// Check if it's time to kick
			if (timeUnassigned >= unassignedTimer) {
				await this.kickPlayer(player, tracked);
				continue;
			}

			// Check if it's time for a warning
			if (now - tracked.lastWarning >= warningInterval) {
				await this.warnPlayer(
					player,
					tracked,
					unassignedTimer - timeUnassigned,
				);
			}
		}
	}

	/**
	 * Check if a player is exempt from auto-kick.
	 */
	private async isExempt(_player: Player): Promise<boolean> {
		// TODO: Check admin status if ignoreAdmins is enabled
		// This requires access to the admin list through server state
		// For now, we skip this check

		// TODO: Check whitelist/reserved status if ignoreWhitelist is enabled
		// This also requires access to the admin/whitelist system

		return false;
	}

	/**
	 * Send a warning to an unassigned player.
	 */
	private async warnPlayer(
		player: Player,
		tracked: TrackedPlayer,
		timeRemaining: number,
	): Promise<void> {
		try {
			const warningMessage =
				this.options.warningMessage ??
				"Join a squad, you are unassigned and will be kicked";

			const secondsRemaining = Math.ceil(timeRemaining / 1000);
			const message = `${warningMessage} (${secondsRemaining}s remaining)`;

			await this.rcon.warn(player.eosID, message);

			tracked.lastWarning = Date.now();
			tracked.warnCount++;

			this.log.debug(
				`Warned unassigned player: ${player.name} (warning #${tracked.warnCount})`,
			);
		} catch (error) {
			this.log.error(
				`Failed to warn ${player.name}`,
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Kick an unassigned player.
	 */
	private async kickPlayer(
		player: Player,
		tracked: TrackedPlayer,
	): Promise<void> {
		try {
			const kickMessage =
				this.options.kickMessage ?? "Unassigned - automatically removed";

			await this.rcon.kick(player.eosID, kickMessage);

			this.log.info(`Kicked unassigned player: ${player.name}`, {
				warnCount: tracked.warnCount,
				timeUnassigned: Date.now() - tracked.unassignedSince,
			});

			this.trackedPlayers.delete(player.eosID);
		} catch (error) {
			this.log.error(
				`Failed to kick ${player.name}`,
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}
}

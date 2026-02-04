/**
 * @squadscript/plugins
 *
 * VehicleClaimTracker Plugin
 *
 * Tracks vehicle claims and re-claims for admin review, with player report
 * functionality for claim disputes.
 *
 * @example
 * ```typescript
 * server.registerPlugin(VehicleClaimTracker, {
 *   reportCommand: 'reportclaim',
 *   reportCooldown: 60000,
 *   notifyAdmins: true,
 * });
 * ```
 *
 * @module
 */

import { BasePlugin } from "@squadscript/server";
import type {
	EOSID,
	OptionsSpec,
	Player,
	PluginMeta,
	SquadID,
	TeamID,
} from "@squadscript/types";

/**
 * Vehicle claim record.
 */
interface VehicleClaim {
	vehicleType: string;
	squadKey: string;
	squadID: SquadID;
	teamID: TeamID;
	squadName: string;
	leaderEosID: EOSID;
	leaderName: string;
	claimTime: Date;
}

/**
 * Vehicle pattern for detection.
 */
interface VehiclePattern {
	pattern: RegExp;
	type: string;
}

/**
 * Options specification for VehicleClaimTracker plugin.
 */
const optionsSpec = {
	reportCommand: {
		type: "string",
		required: false,
		description: "Command to report a stolen vehicle claim",
		default: "reportclaim",
	},
	reportCooldown: {
		type: "number",
		required: false,
		description: "Cooldown between reports per player (ms)",
		default: 60000,
	},
	reportMessage: {
		type: "string",
		required: false,
		description: "Response to reporter after filing report",
		default: "Your vehicle claim report has been logged for admin review.",
	},
	trackDuration: {
		type: "number",
		required: false,
		description: "How long to keep claim history (ms)",
		default: 300000,
	},
	notifyAdmins: {
		type: "boolean",
		required: false,
		description: "Ping in-game admins on reports",
		default: true,
	},
	checkInterval: {
		type: "number",
		required: false,
		description: "How often to scan for vehicle claims (ms)",
		default: 10000,
	},
} as const satisfies OptionsSpec;

/**
 * VehicleClaimTracker Plugin
 *
 * Tracks vehicle claims via squad names and allows players to report disputes.
 */
export class VehicleClaimTracker extends BasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "VehicleClaimTracker",
		description: "Tracks vehicle claims and handles claim dispute reports",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Vehicle patterns for detection in squad names.
	 */
	private readonly VEHICLE_PATTERNS: VehiclePattern[] = [
		{ pattern: /\b(btr|apc)\b/i, type: "APC" },
		{
			pattern: /\b(tank|mbt|abrams|t-?72|t-?90|leo|leopard|challenger)\b/i,
			type: "MBT",
		},
		{
			pattern: /\b(heli|helicopter|blackhawk|mi-?8|uh-?60|chinook)\b/i,
			type: "Helicopter",
		},
		{ pattern: /\b(logi|logistics|truck)\b/i, type: "Logistics" },
		{ pattern: /\b(ifv|bradley|bmp|warrior|cv90)\b/i, type: "IFV" },
		{ pattern: /\b(spg|spaa|zu-?23|tunguska)\b/i, type: "AA/SPG" },
		{
			pattern: /\b(arty|artillery|mortar\s*vic|m119|d-?30)\b/i,
			type: "Artillery",
		},
		{ pattern: /\b(stryker|cougar|mrap)\b/i, type: "MRAP" },
	];

	/**
	 * Claim history for tracking changes.
	 */
	private claimHistory: VehicleClaim[] = [];

	/**
	 * Current claims by squad key.
	 */
	private currentClaims = new Map<string, VehicleClaim>();

	/**
	 * Report cooldowns per player.
	 */
	private reportCooldowns = new Map<string, Date>();

	/**
	 * Subscribe to events and start monitoring.
	 */
	async mount(): Promise<void> {
		// Scan for vehicle claims periodically
		const interval = this.options.checkInterval ?? 10000;
		this.setInterval(
			() => this.scanForVehicleClaims(),
			interval,
			"vehicle-claim-scan",
		);

		// Handle report command
		this.on("CHAT_COMMAND", async (event) => {
			if (event.command === this.options.reportCommand) {
				await this.handleReportCommand(event.player, event.args);
			}
		});

		// Reset on new game
		this.on("NEW_GAME", () => {
			this.claimHistory = [];
			this.currentClaims.clear();
			this.log.debug("New game - cleared vehicle claim history");
		});

		// Clean up old claims periodically
		this.setInterval(() => this.cleanupOldClaims(), 60000, "claim-cleanup");

		this.log.info("VehicleClaimTracker mounted", {
			reportCommand: this.options.reportCommand,
			trackDuration: this.options.trackDuration,
		});
	}

	/**
	 * Scan all squads for vehicle claims.
	 */
	private scanForVehicleClaims(): void {
		for (const [, squad] of this.server.squads) {
			const vehicleType = this.detectVehicleType(squad.name);
			if (!vehicleType) {
				continue;
			}

			const squadKey = `${squad.teamID}-${squad.squadID}`;
			const existingClaim = this.currentClaims.get(squadKey);

			// Find squad leader
			let leader: Player | undefined;
			for (const [, player] of this.server.players) {
				if (
					player.teamID === squad.teamID &&
					player.squadID === squad.squadID &&
					player.isSquadLeader
				) {
					leader = player;
					break;
				}
			}

			if (!leader) {
				continue;
			}

			// Check if this is a new claim or changed claim
			if (
				!existingClaim ||
				existingClaim.vehicleType !== vehicleType ||
				existingClaim.leaderEosID !== leader.eosID
			) {
				const claim: VehicleClaim = {
					vehicleType,
					squadKey,
					squadID: squad.squadID,
					teamID: squad.teamID,
					squadName: squad.name,
					leaderEosID: leader.eosID,
					leaderName: leader.name,
					claimTime: new Date(),
				};

				// Log claim change
				if (existingClaim) {
					this.log.debug(`Vehicle claim changed: ${squad.name}`, {
						oldLeader: existingClaim.leaderName,
						newLeader: leader.name,
						vehicleType,
					});
				} else {
					this.log.debug(`New vehicle claim: ${squad.name}`, {
						leader: leader.name,
						vehicleType,
					});
				}

				// Update current claims
				this.currentClaims.set(squadKey, claim);

				// Add to history
				this.claimHistory.push(claim);
			}
		}

		// Remove claims for disbanded squads
		const activeSquadKeys = new Set<string>();
		for (const [, squad] of this.server.squads) {
			activeSquadKeys.add(`${squad.teamID}-${squad.squadID}`);
		}
		for (const key of this.currentClaims.keys()) {
			if (!activeSquadKeys.has(key)) {
				this.currentClaims.delete(key);
			}
		}
	}

	/**
	 * Detect vehicle type from squad name.
	 */
	private detectVehicleType(squadName: string): string | null {
		for (const { pattern, type } of this.VEHICLE_PATTERNS) {
			if (pattern.test(squadName)) {
				return type;
			}
		}
		return null;
	}

	/**
	 * Handle the report command.
	 */
	private async handleReportCommand(
		player: Player,
		args: string,
	): Promise<void> {
		// Check cooldown
		const cooldown = this.options.reportCooldown ?? 60000;
		const lastReport = this.reportCooldowns.get(player.eosID);

		if (lastReport) {
			const elapsed = Date.now() - lastReport.getTime();
			if (elapsed < cooldown) {
				const remaining = Math.ceil((cooldown - elapsed) / 1000);
				await this.rcon.warn(
					player.eosID,
					`Please wait ${remaining} seconds before reporting again.`,
				);
				return;
			}
		}

		// Update cooldown
		this.reportCooldowns.set(player.eosID, new Date());

		// Get vehicle type from args or auto-detect from player's squad
		let vehicleType = args.trim() || null;

		if (!vehicleType && player.squadID && player.teamID) {
			const teamSquads = this.server.getSquadsByTeam(player.teamID);
			const squad = teamSquads.find((s) => s.squadID === player.squadID);
			if (squad) {
				vehicleType = this.detectVehicleType(squad.name);
			}
		}

		// Build report
		const relevantClaims = vehicleType
			? this.claimHistory.filter(
					(c) => c.vehicleType === vehicleType && c.teamID === player.teamID,
				)
			: this.claimHistory.filter((c) => c.teamID === player.teamID);

		// Get recent claims (last 5 minutes)
		const trackDuration = this.options.trackDuration ?? 300000;
		const cutoff = Date.now() - trackDuration;
		const recentClaims = relevantClaims.filter(
			(c) => c.claimTime.getTime() > cutoff,
		);

		this.log.info(`Vehicle claim report from ${player.name}`, {
			vehicleType,
			claimsFound: recentClaims.length,
		});

		// Notify reporter
		await this.rcon.warn(player.eosID, this.options.reportMessage as string);

		// Notify admins if enabled
		if (this.options.notifyAdmins) {
			await this.notifyAdmins(player, vehicleType, recentClaims);
		}
	}

	/**
	 * Notify in-game admins about the report.
	 * Note: Admin notification requires admin list integration which is not
	 * available in ServerStateReader. This currently broadcasts to all.
	 */
	private async notifyAdmins(
		reporter: Player,
		vehicleType: string | null,
		claims: VehicleClaim[],
	): Promise<void> {
		// Build admin message
		let message = `[ClaimReport] ${reporter.name} reported a ${vehicleType ?? "vehicle"} claim dispute.\n`;

		if (claims.length > 0) {
			message += "Recent claims:\n";
			const recent = claims.slice(-3); // Last 3 claims
			for (const claim of recent) {
				const timeAgo = Math.floor(
					(Date.now() - claim.claimTime.getTime()) / 1000,
				);
				message += `- ${claim.squadName} (${claim.leaderName}) ${timeAgo}s ago\n`;
			}
		} else {
			message += "No recent claims found for this vehicle type.";
		}

		// Since admin list is not available in ServerStateReader,
		// we log the message. In a real deployment, this would need
		// to be extended with admin list integration via a connector.
		this.log.info(`Vehicle claim report: ${message}`);

		// Optionally broadcast to server
		try {
			await this.rcon.broadcast(`[Admin Alert] ${message.split("\n")[0]}`);
		} catch (error) {
			this.log.error(
				"Failed to broadcast claim report alert",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Clean up old claims from history.
	 */
	private cleanupOldClaims(): void {
		const trackDuration = this.options.trackDuration ?? 300000;
		const cutoff = Date.now() - trackDuration;

		const before = this.claimHistory.length;
		this.claimHistory = this.claimHistory.filter(
			(c) => c.claimTime.getTime() > cutoff,
		);
		const after = this.claimHistory.length;

		if (before !== after) {
			this.log.debug(`Cleaned up ${before - after} old claims`);
		}

		// Also clean up cooldowns
		const cooldown = this.options.reportCooldown ?? 60000;
		const cooldownCutoff = Date.now() - cooldown;

		for (const [eosID, time] of this.reportCooldowns) {
			if (time.getTime() < cooldownCutoff) {
				this.reportCooldowns.delete(eosID);
			}
		}
	}
}

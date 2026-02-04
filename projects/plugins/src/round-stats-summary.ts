/**
 * @squadscript/plugins
 *
 * RoundStatsSummary Plugin
 *
 * Broadcasts top performers at the end of each round in various categories.
 *
 * @example
 * ```typescript
 * server.registerPlugin(RoundStatsSummary, {
 *   categories: ['kills', 'revives', 'teamkills'],
 *   topCount: 3,
 *   broadcastInGame: true,
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
 * Player stats for the round.
 */
interface PlayerRoundStats {
	eosID: EOSID;
	name: string;
	kills: number;
	rifleKills: number;
	mortarKills: number;
	vehicleKills: number;
	deaths: number;
	revives: number;
	teamkills: number;
	teamdeaths: number;
}

/**
 * Options specification for RoundStatsSummary plugin.
 */
const optionsSpec = {
	announceDelay: {
		type: "number",
		required: false,
		description: "Delay after round end before announcing (ms)",
		default: 10000,
	},
	categories: {
		type: "array",
		required: false,
		description: "Categories to announce",
		default: ["kills", "deaths", "revives", "teamkills"],
	},
	topCount: {
		type: "number",
		required: false,
		description: "Number of top players per category",
		default: 3,
	},
	separateKillTypes: {
		type: "boolean",
		required: false,
		description: "Separate rifle/mortar/vehicle kills",
		default: false,
	},
	rifleKillPatterns: {
		type: "array",
		required: false,
		description: "Weapon patterns for rifle kills",
		default: [
			"Rifle",
			"Carbine",
			"SMG",
			"Pistol",
			"Knife",
			"AK",
			"M4",
			"G3",
			"FAL",
			"L85",
		],
	},
	mortarKillPatterns: {
		type: "array",
		required: false,
		description: "Weapon patterns for mortar kills",
		default: ["Mortar", "M252", "Hell Cannon", "2B14"],
	},
	vehicleKillPatterns: {
		type: "array",
		required: false,
		description: "Weapon patterns for vehicle kills",
		default: [
			"Coax",
			"Turret",
			"CROWS",
			"HMG",
			"Tank",
			".50cal",
			"30mm",
			"14.5mm",
			"KPVT",
			"M2",
			"NSV",
		],
	},
	broadcastInGame: {
		type: "boolean",
		required: false,
		description: "Broadcast stats in-game",
		default: true,
	},
	broadcastDelay: {
		type: "number",
		required: false,
		description: "Delay between broadcast messages (ms)",
		default: 3000,
	},
} as const satisfies OptionsSpec;

/**
 * RoundStatsSummary Plugin
 *
 * Tracks and announces top performers at the end of each round.
 */
export class RoundStatsSummary extends BasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "RoundStatsSummary",
		description: "Announces top performers at round end",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Player stats for current round.
	 */
	private stats = new Map<string, PlayerRoundStats>();

	/**
	 * Subscribe to events.
	 */
	async mount(): Promise<void> {
		// Track deaths/kills
		this.on("PLAYER_DIED", (event) => {
			// Track death for victim
			const victimStats = this.getOrCreateStats(event.victim);
			victimStats.deaths++;

			// Track kill for attacker
			if (event.attacker && !event.suicide) {
				const attackerStats = this.getOrCreateStats(event.attacker);

				// Check if teamkill
				if (event.attacker.teamID === event.victim.teamID) {
					attackerStats.teamkills++;
					victimStats.teamdeaths++;
				} else {
					attackerStats.kills++;

					// Categorize kill by weapon
					if (event.weapon) {
						const killType = this.categorizeWeapon(event.weapon);
						if (killType === "rifle") {
							attackerStats.rifleKills++;
						} else if (killType === "mortar") {
							attackerStats.mortarKills++;
						} else if (killType === "vehicle") {
							attackerStats.vehicleKills++;
						}
					}
				}
			}
		});

		// Track revives
		this.on("PLAYER_REVIVED", (event) => {
			const reviverStats = this.getOrCreateStats(event.reviver);
			reviverStats.revives++;
		});

		// Announce stats and reset on new game
		this.on("NEW_GAME", async () => {
			// Announce previous round stats
			if (this.stats.size > 0) {
				const delay = this.options.announceDelay ?? 10000;
				this.setTimeout(() => this.announceStats(), delay, "stats-announce");
			}
		});

		this.log.info("RoundStatsSummary mounted", {
			categories: this.options.categories,
			topCount: this.options.topCount,
		});
	}

	/**
	 * Get or create stats for a player.
	 */
	private getOrCreateStats(player: Player): PlayerRoundStats {
		let stats = this.stats.get(player.eosID);

		if (!stats) {
			stats = {
				eosID: player.eosID,
				name: player.name,
				kills: 0,
				rifleKills: 0,
				mortarKills: 0,
				vehicleKills: 0,
				deaths: 0,
				revives: 0,
				teamkills: 0,
				teamdeaths: 0,
			};
			this.stats.set(player.eosID, stats);
		} else {
			// Update name in case it changed
			stats.name = player.name;
		}

		return stats;
	}

	/**
	 * Categorize weapon into kill type.
	 */
	private categorizeWeapon(
		weapon: string,
	): "rifle" | "mortar" | "vehicle" | "other" {
		const w = weapon.toLowerCase();

		// Check mortar patterns first (more specific)
		const mortarPatterns = (this.options.mortarKillPatterns ?? []) as string[];
		for (const pattern of mortarPatterns) {
			if (w.includes(pattern.toLowerCase())) {
				return "mortar";
			}
		}

		// Check vehicle patterns
		const vehiclePatterns = (this.options.vehicleKillPatterns ??
			[]) as string[];
		for (const pattern of vehiclePatterns) {
			if (w.includes(pattern.toLowerCase())) {
				return "vehicle";
			}
		}

		// Check rifle patterns
		const riflePatterns = (this.options.rifleKillPatterns ?? []) as string[];
		for (const pattern of riflePatterns) {
			if (w.includes(pattern.toLowerCase())) {
				return "rifle";
			}
		}

		return "other";
	}

	/**
	 * Announce the round stats.
	 */
	private async announceStats(): Promise<void> {
		const statsArray = Array.from(this.stats.values());

		if (statsArray.length === 0) {
			this.log.debug("No stats to announce");
			this.stats.clear();
			return;
		}

		const categories = (this.options.categories ?? []) as string[];
		const topCount = this.options.topCount ?? 3;
		const leaderboards: string[] = [];

		// Build leaderboards
		if (categories.includes("kills")) {
			const sorted = [...statsArray].sort((a, b) => b.kills - a.kills);
			const top = sorted.slice(0, topCount).filter((p) => p.kills > 0);
			if (top.length > 0) {
				leaderboards.push(this.formatLeaderboard("Top Killers", top, "kills"));
			}
		}

		if (this.options.separateKillTypes) {
			if (categories.includes("rifleKills")) {
				const sorted = [...statsArray].sort(
					(a, b) => b.rifleKills - a.rifleKills,
				);
				const top = sorted.slice(0, topCount).filter((p) => p.rifleKills > 0);
				if (top.length > 0) {
					leaderboards.push(
						this.formatLeaderboard("Top Infantry", top, "rifleKills"),
					);
				}
			}

			if (categories.includes("mortarKills")) {
				const sorted = [...statsArray].sort(
					(a, b) => b.mortarKills - a.mortarKills,
				);
				const top = sorted.slice(0, topCount).filter((p) => p.mortarKills > 0);
				if (top.length > 0) {
					leaderboards.push(
						this.formatLeaderboard("Top Mortars", top, "mortarKills"),
					);
				}
			}

			if (categories.includes("vehicleKills")) {
				const sorted = [...statsArray].sort(
					(a, b) => b.vehicleKills - a.vehicleKills,
				);
				const top = sorted.slice(0, topCount).filter((p) => p.vehicleKills > 0);
				if (top.length > 0) {
					leaderboards.push(
						this.formatLeaderboard("Top Vehicle Gunners", top, "vehicleKills"),
					);
				}
			}
		}

		if (categories.includes("deaths")) {
			const sorted = [...statsArray].sort((a, b) => b.deaths - a.deaths);
			const top = sorted.slice(0, topCount).filter((p) => p.deaths > 0);
			if (top.length > 0) {
				leaderboards.push(this.formatLeaderboard("Most Deaths", top, "deaths"));
			}
		}

		if (categories.includes("revives")) {
			const sorted = [...statsArray].sort((a, b) => b.revives - a.revives);
			const top = sorted.slice(0, topCount).filter((p) => p.revives > 0);
			if (top.length > 0) {
				leaderboards.push(this.formatLeaderboard("Top Medics", top, "revives"));
			}
		}

		if (categories.includes("teamkills")) {
			const sorted = [...statsArray].sort((a, b) => b.teamkills - a.teamkills);
			const top = sorted.slice(0, topCount).filter((p) => p.teamkills > 0);
			if (top.length > 0) {
				leaderboards.push(
					this.formatLeaderboard("Most Teamkills (Shame!)", top, "teamkills"),
				);
			}
		}

		// Broadcast in-game
		if (this.options.broadcastInGame && leaderboards.length > 0) {
			await this.broadcastLeaderboards(leaderboards);
		}

		this.log.info(`Round stats announced: ${leaderboards.length} categories`);

		// Reset stats for next round
		this.stats.clear();
	}

	/**
	 * Format a leaderboard string.
	 */
	private formatLeaderboard(
		title: string,
		players: PlayerRoundStats[],
		stat: keyof PlayerRoundStats,
	): string {
		let result = `${title}:\n`;

		players.forEach((player, index) => {
			const value = player[stat];
			result += `${index + 1}. ${player.name}: ${value}\n`;
		});

		return result.trim();
	}

	/**
	 * Broadcast leaderboards in-game with delays.
	 */
	private async broadcastLeaderboards(leaderboards: string[]): Promise<void> {
		const delay = this.options.broadcastDelay ?? 3000;

		for (let i = 0; i < leaderboards.length; i++) {
			if (i > 0) {
				// Wait between broadcasts
				await this.sleep(delay);
			}

			const board = leaderboards[i];
			if (!board) continue;

			try {
				await this.rcon.broadcast(board);
			} catch (error) {
				this.log.error(
					"Failed to broadcast leaderboard",
					error instanceof Error ? error : new Error(String(error)),
				);
			}
		}
	}

	/**
	 * Sleep helper.
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

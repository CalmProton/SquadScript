/**
 * @squadscript/plugins
 *
 * SquadNameEnforcer Plugin
 *
 * Monitors squad names for inappropriate content and automatically warns
 * squad leaders or disbands offending squads.
 *
 * @example
 * ```typescript
 * server.registerPlugin(SquadNameEnforcer, {
 *   blockedWords: ['offensive', 'inappropriate'],
 *   blockedPatterns: ['\\d{3}'],
 *   action: 'warn',
 *   warnMessage: 'Your squad name violates server rules. Please rename it.',
 * });
 * ```
 *
 * @module
 */

import { BasePlugin } from "@squadscript/server";
import type { EOSID, OptionsSpec, PluginMeta, Squad } from "@squadscript/types";

/**
 * Tracked violation for repeat offender detection.
 */
interface TrackedViolation {
	squadKey: string;
	squadName: string;
	leaderEosID: EOSID;
	warnCount: number;
	lastWarnTime: Date;
}

/**
 * Options specification for SquadNameEnforcer plugin.
 */
const optionsSpec = {
	blockedPatterns: {
		type: "array",
		required: false,
		description: "Regex patterns to match against squad names",
		default: [],
	},
	blockedWords: {
		type: "array",
		required: false,
		description: "Simple word list (case-insensitive)",
		default: [],
	},
	action: {
		type: "string",
		required: false,
		description: "Action to take on violation: 'warn', 'disband', or 'both'",
		default: "warn",
	},
	warnMessage: {
		type: "string",
		required: false,
		description: "Warning message to send to squad leader",
		default: "Your squad name violates server rules. Please rename it.",
	},
	checkInterval: {
		type: "number",
		required: false,
		description: "How often to check squad names (ms)",
		default: 30000,
	},
	exemptAdmins: {
		type: "boolean",
		required: false,
		description: "Exempt admin-led squads from checks",
		default: true,
	},
	maxWarnings: {
		type: "number",
		required: false,
		description: "Number of warnings before auto-disband (0 = no limit)",
		default: 3,
	},
} as const satisfies OptionsSpec;

/**
 * SquadNameEnforcer Plugin
 *
 * Monitors squad names for inappropriate content and takes action
 * against violating squads.
 */
export class SquadNameEnforcer extends BasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "SquadNameEnforcer",
		description: "Monitors squad names for inappropriate content",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Track violations per squad for repeat offender handling.
	 */
	private violations = new Map<string, TrackedViolation>();

	/**
	 * Compiled regex patterns for efficient matching.
	 */
	private compiledPatterns: RegExp[] = [];

	/**
	 * Prepare regex patterns.
	 */
	async prepareToMount(): Promise<void> {
		const patterns = (this.options.blockedPatterns ?? []) as string[];

		for (const pattern of patterns) {
			try {
				this.compiledPatterns.push(new RegExp(pattern, "i"));
			} catch (error) {
				this.log.warn(`Invalid regex pattern: ${pattern}`, {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		this.log.debug(
			`Loaded ${this.compiledPatterns.length} patterns and ${(this.options.blockedWords as string[])?.length ?? 0} blocked words`,
		);
	}

	/**
	 * Subscribe to squad events and start periodic checks.
	 */
	async mount(): Promise<void> {
		// Check new squads immediately when created
		this.on("SQUAD_CREATED", async (event) => {
			await this.checkSquadName(
				{
					squadID: event.squadID,
					teamID: event.teamID,
					name: event.squadName,
					creatorEOSID: event.player.eosID,
				} as unknown as Squad,
				event.player.eosID,
			);
		});

		// Periodic check of all squads
		const interval = this.options.checkInterval ?? 30000;
		this.setInterval(() => this.checkAllSquads(), interval, "squad-name-check");

		this.log.info("SquadNameEnforcer mounted", {
			action: this.options.action,
			checkInterval: interval,
		});
	}

	/**
	 * Check all current squads for violations.
	 */
	private async checkAllSquads(): Promise<void> {
		for (const [, squad] of this.server.squads) {
			// Get the squad leader's EOS ID
			let leader: { eosID: EOSID; name: string } | null = null;
			for (const [, player] of this.server.players) {
				if (
					player.squadID === squad.squadID &&
					player.teamID === squad.teamID &&
					player.isSquadLeader
				) {
					leader = player;
					break;
				}
			}

			if (leader) {
				await this.checkSquadName(squad, leader.eosID);
			}
		}
	}

	/**
	 * Check a single squad name for violations.
	 */
	private async checkSquadName(
		squad: Squad,
		leaderEosID: EOSID,
	): Promise<void> {
		// Note: exemptAdmins option requires admin list integration
		// which is not available in ServerStateReader
		// This would need to be implemented via a connector or extended state

		// Check for violation
		if (!this.isViolation(squad.name)) {
			return;
		}

		const squadKey = `${squad.teamID}-${squad.squadID}`;
		const violation = this.getOrCreateViolation(
			squadKey,
			squad.name,
			leaderEosID,
		);
		violation.warnCount++;
		violation.lastWarnTime = new Date();

		this.log.info(`Squad name violation detected: "${squad.name}"`, {
			teamID: squad.teamID,
			squadID: squad.squadID,
			warnCount: violation.warnCount,
		});

		const action = this.options.action as string;
		const maxWarnings = this.options.maxWarnings ?? 3;

		// Determine action based on configuration and warning count
		const shouldDisband =
			action === "disband" ||
			action === "both" ||
			(maxWarnings > 0 && violation.warnCount >= maxWarnings);

		const shouldWarn = action === "warn" || action === "both" || !shouldDisband;

		try {
			if (shouldWarn && !shouldDisband) {
				await this.rcon.warn(leaderEosID, this.options.warnMessage as string);
				this.log.debug(`Warned squad leader for: ${squad.name}`);
			}

			if (shouldDisband) {
				// Disband the squad
				await this.rcon.execute(
					`AdminDisbandSquad ${squad.teamID} ${squad.squadID}`,
				);
				this.log.info(`Disbanded squad: ${squad.name}`);

				// Clean up violation tracking
				this.violations.delete(squadKey);
			}
		} catch (error) {
			this.log.error(
				"Failed to take action on squad name violation",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Check if a squad name violates the rules.
	 */
	private isViolation(name: string): boolean {
		const lowerName = name.toLowerCase();

		// Check word list
		const blockedWords = (this.options.blockedWords ?? []) as string[];
		for (const word of blockedWords) {
			if (lowerName.includes(word.toLowerCase())) {
				return true;
			}
		}

		// Check regex patterns
		for (const pattern of this.compiledPatterns) {
			if (pattern.test(name)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Get or create a violation record.
	 */
	private getOrCreateViolation(
		squadKey: string,
		squadName: string,
		leaderEosID: EOSID,
	): TrackedViolation {
		let violation = this.violations.get(squadKey);

		if (!violation) {
			violation = {
				squadKey,
				squadName,
				leaderEosID,
				warnCount: 0,
				lastWarnTime: new Date(),
			};
			this.violations.set(squadKey, violation);
		}

		return violation;
	}
}

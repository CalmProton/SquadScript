/**
 * @squadscript/plugins
 *
 * FirstBlood Plugin
 *
 * Announces the first kill of each round with a dramatic message in all-chat.
 *
 * @example
 * ```typescript
 * server.registerPlugin(FirstBlood, {
 *   message: '🩸 FIRST BLOOD! {attacker} has drawn first blood against {victim}!',
 *   includeWeapon: true,
 *   delay: 5000,
 * });
 * ```
 *
 * @module
 */

import { BasePlugin } from "@squadscript/server";
import type { OptionsSpec, Player, PluginMeta } from "@squadscript/types";

/**
 * Options specification for FirstBlood plugin.
 */
const optionsSpec = {
	message: {
		type: "string",
		required: false,
		description: "Announcement message (without weapon)",
		default:
			"🩸 FIRST BLOOD! {attacker} has drawn first blood against {victim}!",
	},
	broadcastType: {
		type: "string",
		required: false,
		description: "How to send the message: 'broadcast' or 'warn-all'",
		default: "broadcast",
	},
	includeWeapon: {
		type: "boolean",
		required: false,
		description: "Include weapon in message",
		default: true,
	},
	messageWithWeapon: {
		type: "string",
		required: false,
		description: "Message when weapon is included",
		default:
			"🩸 FIRST BLOOD! {attacker} drew first blood against {victim} with {weapon}!",
	},
	ignoreTeamkills: {
		type: "boolean",
		required: false,
		description: "Don't announce teamkill first bloods",
		default: true,
	},
	delay: {
		type: "number",
		required: false,
		description: "Delay after round start before tracking (ms)",
		default: 5000,
	},
} as const satisfies OptionsSpec;

/**
 * FirstBlood Plugin
 *
 * Announces the first kill of each round with a dramatic message.
 */
export class FirstBlood extends BasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "FirstBlood",
		description: "Announces the first kill of each round",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Whether first blood has occurred this round.
	 */
	private firstBloodOccurred = false;

	/**
	 * When the current round started.
	 */
	private roundStartTime: Date | null = null;

	/**
	 * Subscribe to game and death events.
	 */
	async mount(): Promise<void> {
		// Reset on new game
		this.on("NEW_GAME", () => {
			this.firstBloodOccurred = false;
			this.roundStartTime = new Date();
			this.log.debug("New game started, first blood tracking reset");
		});

		// Detect first kill
		this.on("PLAYER_DIED", async (event) => {
			// Already had first blood this round
			if (this.firstBloodOccurred) {
				return;
			}

			// No attacker (suicide/environmental)
			if (!event.attacker) {
				return;
			}

			// Ignore suicides
			if (event.suicide) {
				return;
			}

			// Check if teamkill should be ignored
			if (this.options.ignoreTeamkills) {
				if (event.attacker.teamID === event.victim.teamID) {
					return;
				}
			}

			// Check delay from round start
			if (this.roundStartTime) {
				const elapsed = Date.now() - this.roundStartTime.getTime();
				const delay = this.options.delay ?? 5000;
				if (elapsed < delay) {
					this.log.debug(
						`Kill ignored - within delay period (${elapsed}ms < ${delay}ms)`,
					);
					return;
				}
			}

			// First blood!
			this.firstBloodOccurred = true;
			await this.announceFirstBlood(event.attacker, event.victim, event.weapon);
		});

		this.log.info("FirstBlood mounted", {
			delay: this.options.delay,
			ignoreTeamkills: this.options.ignoreTeamkills,
		});
	}

	/**
	 * Announce the first blood kill.
	 */
	private async announceFirstBlood(
		attacker: Player,
		victim: Player,
		weapon: string | null,
	): Promise<void> {
		// Format the message
		const includeWeapon = this.options.includeWeapon && weapon;
		const template = includeWeapon
			? (this.options.messageWithWeapon as string)
			: (this.options.message as string);

		const message = this.formatMessage(template, attacker, victim, weapon);

		this.log.info(`First blood: ${attacker.name} -> ${victim.name}`, {
			weapon,
		});

		try {
			const broadcastType = this.options.broadcastType as string;

			if (broadcastType === "broadcast") {
				await this.rcon.broadcast(message);
			} else if (broadcastType === "warn-all") {
				// Warn all players
				for (const [, player] of this.server.players) {
					await this.rcon.warn(player.eosID, message);
				}
			}
		} catch (error) {
			this.log.error(
				"Failed to announce first blood",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Format the announcement message with placeholders.
	 */
	private formatMessage(
		template: string,
		attacker: Player,
		victim: Player,
		weapon: string | null,
	): string {
		return template
			.replace(/{attacker}/g, attacker.name)
			.replace(/{victim}/g, victim.name)
			.replace(/{weapon}/g, weapon ?? "unknown");
	}
}

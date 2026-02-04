/**
 * @squadscript/plugins
 *
 * AutoTKWarn Plugin
 *
 * Automatically warn players when they teamkill.
 *
 * @example
 * ```typescript
 * server.registerPlugin(AutoTKWarn, {
 *   attackerMessage: 'Please apologise for ALL TKs in ALL chat!',
 *   victimMessage: 'You were teamkilled. The player has been warned.',
 * });
 * ```
 *
 * @module
 */

import { BasePlugin } from "@squadscript/server";
import type { OptionsSpec, PluginMeta } from "@squadscript/types";

/**
 * Options specification for AutoTKWarn plugin.
 */
const optionsSpec = {
	attackerMessage: {
		type: "string",
		required: false,
		description: "Message sent to the player who teamkilled",
		default: "Please apologise for ALL TKs in ALL chat!",
	},
	victimMessage: {
		type: "string",
		required: false,
		description: "Message sent to the victim (null or empty to disable)",
		default: null,
	},
} as const satisfies OptionsSpec;

/**
 * AutoTKWarn Plugin
 *
 * Automatically sends warning messages to players when they teamkill.
 * Can optionally notify the victim as well.
 */
export class AutoTKWarn extends BasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "AutoTKWarn",
		description: "Automatically warn players when they teamkill",
		version: "1.0.0",
		defaultEnabled: true,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Subscribe to player death events to detect teamkills.
	 */
	async mount(): Promise<void> {
		this.on("PLAYER_DIED", async (event) => {
			// Only handle teamkills (not regular deaths)
			if (!event.attacker) {
				return; // No attacker (suicide, environmental)
			}

			// Check if it's the same team - teamkill detection
			// The attacker and victim should be on the same team for it to be a TK
			if (event.attacker.teamID !== event.victim.teamID) {
				return; // Not a teamkill
			}

			// Don't warn for suicides
			if (event.suicide) {
				return;
			}

			this.log.verbose(
				`Teamkill detected: ${event.attacker.name} -> ${event.victim.name}`,
				{ weapon: event.weapon },
			);

			try {
				// Warn the attacker
				if (this.options.attackerMessage) {
					await this.rcon.warn(
						event.attacker.eosID,
						this.options.attackerMessage,
					);
					this.log.debug(`Warned attacker ${event.attacker.name}`);
				}

				// Optionally notify the victim
				if (this.options.victimMessage) {
					await this.rcon.warn(event.victim.eosID, this.options.victimMessage);
					this.log.debug(`Notified victim ${event.victim.name}`);
				}
			} catch (error) {
				this.log.error(
					"Failed to send TK warning",
					error instanceof Error ? error : new Error(String(error)),
				);
			}
		});

		this.log.info("AutoTKWarn mounted");
	}
}

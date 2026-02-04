/**
 * @squadscript/plugins
 *
 * FogOfWar Plugin
 *
 * Automatically set fog of war mode at the start of each round.
 *
 * @example
 * ```typescript
 * server.registerPlugin(FogOfWar, {
 *   mode: 1, // 0=off, 1=on, 2=advanced
 *   delay: 10000, // 10 seconds after round start
 * });
 * ```
 *
 * @module
 */

import { BasePlugin } from "@squadscript/core";
import type { OptionsSpec, PluginMeta } from "@squadscript/types";

/**
 * Options specification for FogOfWar plugin.
 */
const optionsSpec = {
	mode: {
		type: "number",
		required: false,
		description: "Fog of war mode: 0=off, 1=on, 2=advanced",
		default: 1,
	},
	delay: {
		type: "number",
		required: false,
		description: "Delay after round start before setting fog of war (ms)",
		default: 10000, // 10 seconds
	},
} as const satisfies OptionsSpec;

/**
 * FogOfWar Plugin
 *
 * Sets the fog of war mode at the start of each new game.
 * The delay helps ensure the server is ready to accept the command.
 */
export class FogOfWar extends BasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "FogOfWar",
		description: "Automatically set fog of war mode at round start",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Subscribe to new game events.
	 */
	async mount(): Promise<void> {
		this.on("NEW_GAME", (event) => {
			const delay = this.options.delay ?? 10000;

			this.log.debug(
				`New game on ${event.layerName}, setting fog of war in ${delay}ms`,
			);

			this.setTimeout(
				() => {
					this.setFogOfWar();
				},
				delay,
				"fog-of-war-delay",
			);
		});

		this.log.info("FogOfWar mounted", { mode: this.options.mode });
	}

	/**
	 * Execute the fog of war RCON command.
	 */
	private async setFogOfWar(): Promise<void> {
		const mode = this.options.mode ?? 1;

		try {
			// AdminSetFogOfWar <mode>
			// 0 = off, 1 = on, 2 = advanced
			await this.rcon.execute(`AdminSetFogOfWar ${mode}`);
			this.log.info(`Set fog of war mode to ${mode}`);
		} catch (error) {
			this.log.error(
				"Failed to set fog of war",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}
}

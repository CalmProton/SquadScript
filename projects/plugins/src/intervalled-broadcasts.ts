/**
 * @squadscript/plugins
 *
 * IntervalledBroadcasts Plugin
 *
 * Broadcast rotating messages at regular intervals.
 *
 * @example
 * ```typescript
 * server.registerPlugin(IntervalledBroadcasts, {
 *   broadcasts: [
 *     'Welcome to our server! Follow the rules.',
 *     'Join our Discord: discord.gg/example',
 *     'Report issues to admins using !admin',
 *   ],
 *   interval: 300000, // 5 minutes
 * });
 * ```
 *
 * @module
 */

import { BasePlugin } from "@squadscript/core";
import type { OptionsSpec, PluginMeta } from "@squadscript/types";

/**
 * Options specification for IntervalledBroadcasts plugin.
 */
const optionsSpec = {
	broadcasts: {
		type: "array",
		required: false,
		description: "Array of messages to broadcast in rotation",
		default: [],
	},
	interval: {
		type: "number",
		required: false,
		description: "Interval between broadcasts in milliseconds",
		default: 300000, // 5 minutes
	},
} as const satisfies OptionsSpec;

/**
 * IntervalledBroadcasts Plugin
 *
 * Broadcasts messages from a list in rotation at regular intervals.
 * Useful for server rules, announcements, and community information.
 */
export class IntervalledBroadcasts extends BasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "IntervalledBroadcasts",
		description: "Broadcast rotating messages at regular intervals",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Current index in the broadcasts array.
	 */
	private currentIndex = 0;

	/**
	 * Start the broadcast interval.
	 */
	async mount(): Promise<void> {
		const broadcasts = (this.options.broadcasts ?? []) as string[];

		if (broadcasts.length === 0) {
			this.log.warn("No broadcasts configured, plugin will be inactive");
			return;
		}

		const interval = this.options.interval ?? 300000;

		this.setInterval(
			() => this.broadcast(broadcasts),
			interval,
			"intervalled-broadcast",
		);

		this.log.info(
			`IntervalledBroadcasts mounted with ${broadcasts.length} message(s)`,
			{
				interval,
			},
		);
	}

	/**
	 * Broadcast the next message in rotation.
	 */
	private async broadcast(broadcasts: string[]): Promise<void> {
		if (broadcasts.length === 0) {
			return;
		}

		const message = broadcasts[this.currentIndex];

		if (!message) {
			this.currentIndex = 0;
			return;
		}

		try {
			await this.rcon.broadcast(message);
			this.log.debug(
				`Broadcast message ${this.currentIndex + 1}/${broadcasts.length}`,
			);

			// Move to next message, wrapping around
			this.currentIndex = (this.currentIndex + 1) % broadcasts.length;
		} catch (error) {
			this.log.error(
				"Failed to broadcast message",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}
}

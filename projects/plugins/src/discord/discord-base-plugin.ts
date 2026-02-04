/**
 * @squadscript/plugins
 *
 * DiscordBasePlugin
 *
 * Abstract base class for all Discord plugins. Provides common Discord
 * connector access and helper methods for sending messages.
 *
 * @module
 */

import { BasePlugin } from "@squadscript/server";
import type {
	DiscordConnector,
	DiscordMessageOptions,
	OptionsSpec,
} from "@squadscript/types";

/**
 * Base options for all Discord plugins.
 *
 * All Discord plugins require a connector name to access the Discord client.
 */
export const discordBaseOptions = {
	discordClient: {
		type: "string",
		required: false,
		description: "Name of the Discord connector to use",
		default: "discord",
	},
} as const satisfies OptionsSpec;

/**
 * Combined options type for Discord plugins.
 */
export type DiscordBaseOptions = typeof discordBaseOptions;

/**
 * Abstract base class for Discord plugins.
 *
 * Provides:
 * - Automatic Discord connector resolution in `prepareToMount()`
 * - Helper method `sendDiscordMessage()` for sending messages
 * - Common error handling for Discord operations
 *
 * Subclasses must call `super.prepareToMount()` if they override it.
 *
 * @example
 * ```typescript
 * const optionsSpec = {
 *   ...discordBaseOptions,
 *   channelID: { type: 'string', required: true, description: 'Discord channel ID' },
 * } as const;
 *
 * class MyDiscordPlugin extends DiscordBasePlugin<typeof optionsSpec> {
 *   async mount() {
 *     this.on('CHAT_MESSAGE', async (event) => {
 *       await this.sendDiscordMessage(this.options.channelID, {
 *         content: `${event.player.name}: ${event.message}`,
 *       });
 *     });
 *   }
 * }
 * ```
 */
export abstract class DiscordBasePlugin<
	TOptionsSpec extends OptionsSpec = DiscordBaseOptions,
> extends BasePlugin<TOptionsSpec> {
	/**
	 * The Discord connector instance.
	 * Available after `prepareToMount()` completes.
	 */
	protected discord!: DiscordConnector;

	/**
	 * Resolves the Discord connector from the connector registry.
	 *
	 * @throws Error if the Discord connector is not found or not connected
	 */
	async prepareToMount(): Promise<void> {
		await super.prepareToMount();

		// Get the connector name from options
		const connectorName = (this.options as unknown as { discordClient: string })
			.discordClient;

		const connector = this.getConnector<DiscordConnector>(connectorName);

		if (!connector) {
			throw new Error(
				`Discord connector '${connectorName}' not found. ` +
					"Make sure the Discord connector is registered before mounting Discord plugins.",
			);
		}

		if (!connector.isConnected) {
			throw new Error(
				`Discord connector '${connectorName}' is not connected. ` +
					"Make sure the Discord bot is online before mounting Discord plugins.",
			);
		}

		this.discord = connector;
		this.log.debug(`Using Discord connector '${connectorName}'`);
	}

	/**
	 * Sends a message to a Discord channel.
	 *
	 * @param channelId - The Discord channel ID to send to
	 * @param message - The message content or options
	 */
	protected async sendDiscordMessage(
		channelId: string,
		message: string | DiscordMessageOptions,
	): Promise<void> {
		try {
			await this.discord.sendMessage(channelId, message);
		} catch (error) {
			this.log.error(
				`Failed to send Discord message to channel ${channelId}`,
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Creates a standard embed with common fields.
	 *
	 * @param options - Embed options
	 * @returns DiscordMessageOptions with embed
	 */
	protected createEmbed(options: {
		title?: string;
		description?: string;
		color?: number;
		fields?: readonly { name: string; value: string; inline?: boolean }[];
		footer?: string;
		timestamp?: boolean;
	}): DiscordMessageOptions {
		return {
			embed: {
				title: options.title,
				description: options.description,
				color: options.color,
				fields: options.fields,
				footer: options.footer ? { text: options.footer } : undefined,
				timestamp: options.timestamp ? new Date().toISOString() : undefined,
			},
		};
	}

	/**
	 * Formats a player name for Discord display.
	 *
	 * Escapes markdown characters to prevent formatting issues.
	 *
	 * @param name - The player name
	 * @returns Escaped player name
	 */
	protected escapeMarkdown(name: string): string {
		return name.replace(/([*_`~|\\])/g, "\\$1");
	}

	/**
	 * Creates a Community Ban List link for a Steam ID.
	 *
	 * @param steamID - The player's Steam ID
	 * @returns CBL profile URL or null if no Steam ID
	 */
	protected getCBLLink(steamID: string | null): string | null {
		if (!steamID) return null;
		return `https://communitybanlist.com/search/${steamID}`;
	}
}

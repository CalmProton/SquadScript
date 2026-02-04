/**
 * @squadscript/plugins
 *
 * ChatCommands Plugin
 *
 * Listen for `!command` patterns in chat and respond with preset messages.
 *
 * @example
 * ```typescript
 * server.registerPlugin(ChatCommands, {
 *   commands: [
 *     { command: 'rules', type: 'warn', response: 'Please follow the rules!' },
 *     { command: 'discord', type: 'broadcast', response: 'Join our Discord: discord.gg/example' },
 *   ],
 * });
 * ```
 *
 * @module
 */

import { BasePlugin } from "@squadscript/server";
import type { ChatChannel, OptionsSpec, PluginMeta } from "@squadscript/types";

/**
 * Command definition structure.
 */
interface CommandDefinition {
	/** Command trigger (without `!` prefix). */
	command: string;
	/** Response type - warn sends to the player, broadcast sends to all. */
	type: "warn" | "broadcast";
	/** Message to send when command is triggered. */
	response: string;
	/** Chat channels to ignore (e.g., ['ChatSquad']). */
	ignoreChats?: ChatChannel[];
}

/**
 * Options specification for ChatCommands plugin.
 */
const optionsSpec = {
	commands: {
		type: "array",
		required: false,
		description: "Array of command definitions",
		default: [
			{
				command: "squadscript",
				type: "warn",
				response: "This server is powered by SquadScript.",
			},
		],
	},
} as const satisfies OptionsSpec;

/**
 * ChatCommands Plugin
 *
 * Listens for chat commands (messages starting with `!`) and responds
 * with configured messages. Commands can either warn the player directly
 * or broadcast to the entire server.
 */
export class ChatCommands extends BasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "ChatCommands",
		description:
			"Listen for !command patterns in chat and respond with preset messages",
		version: "1.0.0",
		defaultEnabled: true,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Map of command name to command definition for fast lookup.
	 */
	private commandMap = new Map<string, CommandDefinition>();

	/**
	 * Called before mount to build the command lookup map.
	 */
	async prepareToMount(): Promise<void> {
		const commands = (this.options.commands ?? []) as CommandDefinition[];

		for (const cmd of commands) {
			// Normalize command name to lowercase
			const normalizedCommand = cmd.command.toLowerCase();
			this.commandMap.set(normalizedCommand, cmd);
		}

		this.log.debug(`Loaded ${this.commandMap.size} command(s)`);
	}

	/**
	 * Subscribe to chat command events.
	 */
	async mount(): Promise<void> {
		this.on("CHAT_COMMAND", async (event) => {
			const commandDef = this.commandMap.get(event.command);

			if (!commandDef) {
				return; // Not a registered command
			}

			// Check if this chat channel should be ignored
			if (commandDef.ignoreChats?.includes(event.channel)) {
				this.log.debug(
					`Ignoring command ${event.command} from ${event.channel}`,
				);
				return;
			}

			this.log.verbose(
				`Command triggered: !${event.command} by ${event.player.name}`,
				{ channel: event.channel },
			);

			try {
				if (commandDef.type === "warn") {
					// Send warning to the player who issued the command
					await this.rcon.warn(event.player.eosID, commandDef.response);
				} else if (commandDef.type === "broadcast") {
					// Broadcast to all players
					await this.rcon.broadcast(commandDef.response);
				}
			} catch (error) {
				this.log.error(
					`Failed to respond to command !${event.command}`,
					error instanceof Error ? error : new Error(String(error)),
				);
			}
		});

		this.log.info(
			`ChatCommands mounted with ${this.commandMap.size} command(s)`,
		);
	}
}

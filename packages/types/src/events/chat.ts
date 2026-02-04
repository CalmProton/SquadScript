/**
 * @squadscript/types
 *
 * Chat event types.
 *
 * @module
 */

import type { BaseEvent } from './base.js';
import type { Player } from '../player.js';

/**
 * Chat channel types available in Squad.
 */
export type ChatChannel = 'ChatAll' | 'ChatTeam' | 'ChatSquad' | 'ChatAdmin';

/**
 * Emitted when a chat message is received.
 *
 * This includes all chat channels: all, team, squad, and admin.
 */
export interface ChatMessageEvent extends BaseEvent {
  /** The player who sent the message. */
  readonly player: Player;

  /** The chat channel the message was sent in. */
  readonly channel: ChatChannel;

  /** The message content. */
  readonly message: string;
}

/**
 * Emitted when a chat command is detected.
 *
 * Chat commands are messages that start with a configured prefix
 * (typically '!' or '/').
 */
export interface ChatCommandEvent extends BaseEvent {
  /** The player who issued the command. */
  readonly player: Player;

  /** The chat channel the command was sent in. */
  readonly channel: ChatChannel;

  /** The command name (without prefix). */
  readonly command: string;

  /** The raw arguments string after the command. */
  readonly args: string;

  /** Parsed arguments split by whitespace. */
  readonly argsList: readonly string[];

  /** The full original message. */
  readonly message: string;
}

/**
 * Parses a chat message into command components if it's a command.
 *
 * @param message - The chat message
 * @param prefixes - Command prefixes to recognize (default: ['!', '/'])
 * @returns Command components or null if not a command
 */
export function parseChatCommand(
  message: string,
  prefixes: readonly string[] = ['!', '/'],
): { command: string; args: string; argsList: string[] } | null {
  const trimmed = message.trim();

  for (const prefix of prefixes) {
    if (trimmed.startsWith(prefix)) {
      const withoutPrefix = trimmed.slice(prefix.length);
      const [command, ...rest] = withoutPrefix.split(/\s+/);

      if (command) {
        return {
          command: command.toLowerCase(),
          args: rest.join(' '),
          argsList: rest,
        };
      }
    }
  }

  return null;
}

/**
 * @squadscript/config
 *
 * Plugin configuration schemas.
 *
 * @module
 */

import { z } from 'zod';

/**
 * Base plugin options that all plugins share.
 */
export const BasePluginOptionsSchema = z.object({
  /** Whether the plugin is enabled. */
  enabled: z.boolean().default(true),
});

/**
 * Chat commands plugin options.
 */
export const ChatCommandsOptionsSchema = BasePluginOptionsSchema.extend({
  /** Command prefix(es) to recognize. */
  prefix: z.union([z.string(), z.array(z.string())]).default('!'),

  /** Whether to ignore messages from admins. */
  ignoreAdmins: z.boolean().default(false),
});

export type ChatCommandsOptions = z.infer<typeof ChatCommandsOptionsSchema>;

/**
 * Auto TK warn plugin options.
 */
export const AutoTkWarnOptionsSchema = BasePluginOptionsSchema.extend({
  /** Message to send to team killers. */
  message: z.string().default('Please be careful, you have team killed!'),

  /** Whether to track TK counts. */
  trackCounts: z.boolean().default(true),

  /** Number of TKs before escalating. */
  warnThreshold: z.number().int().positive().default(3),
});

export type AutoTkWarnOptions = z.infer<typeof AutoTkWarnOptionsSchema>;

/**
 * Seeding mode plugin options.
 */
export const SeedingModeOptionsSchema = BasePluginOptionsSchema.extend({
  /** Player count threshold to enter seeding mode. */
  seedingThreshold: z.number().int().positive().default(40),

  /** Player count threshold to exit seeding mode. */
  liveThreshold: z.number().int().positive().default(50),

  /** Broadcast message when seeding. */
  seedingMessage: z.string().default('Server is seeding - please follow seeding rules!'),

  /** Interval for seeding broadcasts (ms). */
  broadcastInterval: z.number().int().positive().default(120000),
});

export type SeedingModeOptions = z.infer<typeof SeedingModeOptionsSchema>;

/**
 * Discord chat plugin options.
 */
export const DiscordChatOptionsSchema = BasePluginOptionsSchema.extend({
  /** Discord channel ID to send chat messages to. */
  channelId: z.string().min(1, 'Channel ID is required'),

  /** Chat channels to relay. */
  channels: z.array(z.enum(['ChatAll', 'ChatTeam', 'ChatSquad', 'ChatAdmin'])).default(['ChatAll']),

  /** Whether to relay Discord messages to in-game. */
  bidirectional: z.boolean().default(false),

  /** Whether to show player Steam IDs. */
  showSteamIds: z.boolean().default(false),
});

export type DiscordChatOptions = z.infer<typeof DiscordChatOptionsSchema>;

/**
 * Intervalled broadcasts plugin options.
 */
export const IntervalledBroadcastsOptionsSchema = BasePluginOptionsSchema.extend({
  /** Broadcast messages. */
  messages: z.array(z.string()).min(1, 'At least one message is required'),

  /** Interval between broadcasts (ms). */
  interval: z.number().int().positive().default(300000),

  /** Whether to broadcast in order or randomly. */
  random: z.boolean().default(false),
});

export type IntervalledBroadcastsOptions = z.infer<typeof IntervalledBroadcastsOptionsSchema>;

/**
 * Map of plugin names to their option schemas.
 */
export const PluginOptionSchemas = {
  'chat-commands': ChatCommandsOptionsSchema,
  'auto-tk-warn': AutoTkWarnOptionsSchema,
  'seeding-mode': SeedingModeOptionsSchema,
  'discord-chat': DiscordChatOptionsSchema,
  'intervalled-broadcasts': IntervalledBroadcastsOptionsSchema,
} as const;

/**
 * Get the options schema for a plugin.
 *
 * @param pluginName - The plugin name
 * @returns The Zod schema for the plugin options, or null if unknown
 */
export function getPluginOptionsSchema(
  pluginName: string,
): z.ZodType | null {
  return (PluginOptionSchemas as Record<string, z.ZodType | undefined>)[pluginName] ?? null;
}

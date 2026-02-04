/**
 * @squadscript/plugins
 *
 * Official plugin collection for SquadScript.
 *
 * This package provides a set of ready-to-use plugins for common
 * server administration tasks, including Discord integrations.
 *
 * @example
 * ```typescript
 * import {
 *   // Core plugins
 *   ChatCommands,
 *   AutoTKWarn,
 *   SeedingMode,
 *   IntervalledBroadcasts,
 *   AutoKickUnassigned,
 *   FogOfWar,
 *   TeamRandomizer,
 *   // Discord plugins
 *   DiscordChat,
 *   DiscordTeamkill,
 *   DiscordAdminRequest,
 * } from '@squadscript/plugins';
 *
 * // Register core plugins
 * server.registerPlugin(ChatCommands, {
 *   commands: [
 *     { command: 'rules', type: 'warn', response: 'Be respectful!' },
 *   ],
 * });
 *
 * server.registerPlugin(AutoTKWarn);
 * server.registerPlugin(SeedingMode, { seedingThreshold: 50 });
 *
 * // Register Discord plugins (requires Discord connector)
 * server.registerPlugin(DiscordChat, {
 *   channelID: '123456789012345678',
 * });
 *
 * server.registerPlugin(DiscordTeamkill, {
 *   channelID: '123456789012345678',
 *   includeCBL: true,
 * });
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Server Plugins
// =============================================================================

export { AutoKickUnassigned } from "./auto-kick-unassigned.js";
export { AutoTKWarn } from "./auto-tk-warn.js";
export { ChatCommands } from "./chat-commands.js";
export { FogOfWar } from "./fog-of-war.js";
export { IntervalledBroadcasts } from "./intervalled-broadcasts.js";
export { SeedingMode } from "./seeding-mode.js";
export { TeamRandomizer } from "./team-randomizer.js";

// =============================================================================
// Discord Plugins
// =============================================================================

export {
	// Base plugin for Discord integrations
	DiscordBasePlugin,
	discordBaseOptions,
	type DiscordBaseOptions,

	// Chat and communication
	DiscordChat,
	DiscordAdminBroadcast,
	DiscordAdminRequest,

	// Moderation
	DiscordTeamkill,
	DiscordAdminCamLogs,

	// Game state
	DiscordServerStatus,
	DiscordRoundWinner,

	// Logging
	DiscordKillFeed,
	DiscordSquadCreated,
} from "./discord/index.js";

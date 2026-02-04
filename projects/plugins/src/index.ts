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
 *   // Advanced plugins
 *   CBLInfo,
 *   DBLog,
 *   SocketIOAPI,
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
 *
 * // Register CBL monitoring (requires Discord connector)
 * server.registerPlugin(CBLInfo, {
 *   channelID: '123456789012345678',
 *   threshold: 1,
 * });
 *
 * // Register database logging (requires database connector)
 * server.registerPlugin(DBLog, {
 *   database: 'mysql',
 *   serverID: 1,
 * });
 *
 * // Register real-time API
 * server.registerPlugin(SocketIOAPI, {
 *   port: 3000,
 *   authentication: 'your-secret-token',
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
// Entertainment & QoL Plugins
// =============================================================================

export { FirstBlood } from "./first-blood.js";
export { PlayerWelcome } from "./player-welcome.js";
export { RevengeTracker } from "./revenge-tracker.js";
export { RoundStatsSummary } from "./round-stats-summary.js";

// =============================================================================
// Squad Management Plugins
// =============================================================================

export { OrphanSquadLogger } from "./orphan-squad-logger.js";
export { SquadLeaderChangeAlert } from "./squad-leader-change-alert.js";
export { SquadNameEnforcer } from "./squad-name-enforcer.js";
export { VehicleClaimTracker } from "./vehicle-claim-tracker.js";

// =============================================================================
// Discord Plugins
// =============================================================================

export {
	DiscordAdminBroadcast,
	DiscordAdminCamLogs,
	DiscordAdminRequest,
	type DiscordBaseOptions,
	// Base plugin for Discord integrations
	DiscordBasePlugin,
	// Chat and communication
	DiscordChat,
	// Logging
	DiscordKillFeed,
	DiscordRoundWinner,
	// Game state
	DiscordServerStatus,
	DiscordSquadCreated,
	// Moderation
	DiscordTeamkill,
	discordBaseOptions,
} from "./discord/index.js";

// =============================================================================
// Advanced Plugins (Phase 3)
// =============================================================================

export { CBLInfo } from "./cbl-info.js";
export { DBLog } from "./db-log.js";
export { SocketIOAPI } from "./socket-io-api.js";

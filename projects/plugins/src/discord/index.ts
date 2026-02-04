/**
 * @squadscript/plugins
 *
 * Discord plugins module - exports all Discord-related plugins.
 *
 * @module
 */

export { DiscordAdminBroadcast } from "./discord-admin-broadcast.js";
export { DiscordAdminCamLogs } from "./discord-admin-cam-logs.js";
export { DiscordAdminRequest } from "./discord-admin-request.js";
// Base plugin
export {
	type DiscordBaseOptions,
	DiscordBasePlugin,
	discordBaseOptions,
} from "./discord-base-plugin.js";
// Chat and communication plugins
export { DiscordChat } from "./discord-chat.js";
// Logging plugins
export { DiscordKillFeed } from "./discord-kill-feed.js";
export { DiscordRoundWinner } from "./discord-round-winner.js";
// Game state plugins
export { DiscordServerStatus } from "./discord-server-status.js";
export { DiscordSquadCreated } from "./discord-squad-created.js";
// Moderation plugins
export { DiscordTeamkill } from "./discord-teamkill.js";

/**
 * @squadscript/plugins
 *
 * Official plugin collection for SquadScript.
 *
 * This package provides a set of ready-to-use plugins for common
 * server administration tasks.
 *
 * @example
 * ```typescript
 * import {
 *   ChatCommands,
 *   AutoTKWarn,
 *   SeedingMode,
 *   IntervalledBroadcasts,
 *   AutoKickUnassigned,
 *   FogOfWar,
 *   TeamRandomizer,
 * } from '@squadscript/plugins';
 *
 * // Register plugins with your server
 * server.registerPlugin(ChatCommands, {
 *   commands: [
 *     { command: 'rules', type: 'warn', response: 'Be respectful!' },
 *   ],
 * });
 *
 * server.registerPlugin(AutoTKWarn);
 * server.registerPlugin(SeedingMode, { seedingThreshold: 50 });
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

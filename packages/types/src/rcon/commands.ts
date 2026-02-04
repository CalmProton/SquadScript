/**
 * @squadscript/types
 *
 * RCON command types.
 *
 * @module
 */

/**
 * Typed RCON command definitions.
 *
 * Maps command names to their expected return types.
 */
export interface RconCommands {
  /** Get current map and layer. */
  ShowCurrentMap: { level: string; layer: string };

  /** Get next map and layer. */
  ShowNextMap: { level: string | null; layer: string | null };

  /** List all connected players. */
  ListPlayers: RconPlayer[];

  /** List all squads on the server. */
  ListSquads: RconSquad[];

  /** Kick a player from the server. */
  AdminKick: void;

  /** Ban a player from the server. */
  AdminBan: void;

  /** Warn a player with a message. */
  AdminWarn: void;

  /** Send a broadcast message to all players. */
  AdminBroadcast: void;

  /** Change to a specific map/layer. */
  AdminChangeMap: void;

  /** Set the next map/layer. */
  AdminSetNextMap: void;

  /** End the current match. */
  AdminEndMatch: void;

  /** Restart the current match. */
  AdminRestartMatch: void;

  /** Slomo command for time scaling. */
  AdminSlomo: void;

  /** Force team change for a player. */
  AdminForceTeamChange: void;

  /** Disband a squad. */
  AdminDisbandSquad: void;
}

/**
 * Player information as returned by ListPlayers RCON command.
 */
export interface RconPlayer {
  /** In-game player ID (0-100). */
  playerID: number;

  /** Player's Steam ID (if available). */
  steamID: string | null;

  /** Player's EOS ID. */
  eosID: string;

  /** Player's display name. */
  name: string;

  /** Team ID (1 or 2). */
  teamID: number;

  /** Squad ID (0 if not in a squad). */
  squadID: number;

  /** Whether the player is a squad leader. */
  isLeader: boolean;

  /** Player's current role/kit. */
  role: string;
}

/**
 * Squad information as returned by ListSquads RCON command.
 */
export interface RconSquad {
  /** Squad ID number. */
  squadID: number;

  /** Team ID (1 or 2). */
  teamID: number;

  /** Squad name. */
  squadName: string;

  /** Number of players in the squad. */
  size: number;

  /** Whether the squad is locked. */
  locked: boolean;

  /** Squad creator's display name. */
  creatorName: string;

  /** Squad creator's Steam ID (if available). */
  creatorSteamID: string | null;

  /** Squad creator's EOS ID. */
  creatorEOSID: string;
}

/**
 * Server info from RCON.
 */
export interface RconServerInfo {
  /** Server name. */
  serverName: string;

  /** Maximum players allowed. */
  maxPlayers: number;

  /** Currently connected players. */
  currentPlayers: number;

  /** Reserved slots. */
  reservedSlots: number;

  /** Current map/layer. */
  currentLayer: string;

  /** Next map/layer. */
  nextLayer: string | null;
}

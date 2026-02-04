/**
 * @squadscript/plugins
 *
 * DBLog Plugin
 *
 * Logs comprehensive server statistics to a database for analytics,
 * Grafana dashboards, and historical data tracking.
 *
 * This plugin tracks:
 * - Server information and match history
 * - Player connections and disconnections
 * - Combat events (wounds, deaths, revives)
 * - Tick rate monitoring
 * - Player population over time
 *
 * @example
 * ```typescript
 * server.registerPlugin(DBLog, {
 *   database: 'mysql', // Name of the database connector
 *   serverID: 1, // Unique server identifier for multi-server setups
 * });
 * ```
 *
 * @module
 */

import { BasePlugin } from "@squadscript/server";
import type {
	DatabaseConnector,
	OptionsSpec,
	PluginMeta,
} from "@squadscript/types";

/**
 * Options specification for DBLog plugin.
 */
const optionsSpec = {
	database: {
		type: "string",
		required: false,
		description: "Name of the database connector to use",
		default: "database",
	},
	serverID: {
		type: "number",
		required: false,
		description: "Unique server identifier (for multi-server setups)",
		default: 1,
	},
	logTickRate: {
		type: "boolean",
		required: false,
		description: "Log server tick rate",
		default: true,
	},
	tickRateInterval: {
		type: "number",
		required: false,
		description: "Interval for tick rate logging (ms)",
		default: 60000,
	},
	logPlayerCount: {
		type: "boolean",
		required: false,
		description: "Log player count over time",
		default: true,
	},
	playerCountInterval: {
		type: "number",
		required: false,
		description: "Interval for player count logging (ms)",
		default: 60000,
	},
	logWounds: {
		type: "boolean",
		required: false,
		description: "Log wound events",
		default: true,
	},
	logDeaths: {
		type: "boolean",
		required: false,
		description: "Log death events",
		default: true,
	},
	logRevives: {
		type: "boolean",
		required: false,
		description: "Log revive events",
		default: true,
	},
	logConnections: {
		type: "boolean",
		required: false,
		description: "Log player connections and disconnections",
		default: true,
	},
	logMatches: {
		type: "boolean",
		required: false,
		description: "Log match start and end events",
		default: true,
	},
} as const satisfies OptionsSpec;

/**
 * Represents an active match being tracked.
 */
interface ActiveMatch {
	readonly id: number;
	readonly startTime: Date;
	readonly layer: string;
}

/**
 * DBLog Plugin
 *
 * Comprehensive database logging for server analytics and statistics.
 * Requires a DatabaseConnector to be registered.
 */
export class DBLog extends BasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "DBLog",
		description: "Log server statistics to a database",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * The database connector instance.
	 */
	private db!: DatabaseConnector;

	/**
	 * Currently active match (if any).
	 */
	private currentMatch: ActiveMatch | null = null;

	/**
	 * Latest recorded tick rate.
	 */
	private lastTickRate: number | null = null;

	/**
	 * Initialize database connection and ensure tables exist.
	 */
	async prepareToMount(): Promise<void> {
		await super.prepareToMount();

		const dbName = this.options.database ?? "database";
		const connector = this.getConnector<DatabaseConnector>(dbName);

		if (!connector) {
			throw new Error(
				`Database connector '${dbName}' not found. ` +
					"Make sure the database connector is registered before mounting DBLog.",
			);
		}

		if (!connector.isConnected) {
			throw new Error(
				`Database connector '${dbName}' is not connected. ` +
					"Make sure the database is accessible before mounting DBLog.",
			);
		}

		this.db = connector;

		// Ensure server record exists
		await this.ensureServerRecord();
	}

	/**
	 * Subscribe to events and start interval logging.
	 */
	async mount(): Promise<void> {
		// Match tracking
		if (this.options.logMatches) {
			this.on("NEW_GAME", async (event) => {
				const layerName = event.layer?.name ?? event.layerName ?? "Unknown";
				await this.logMatchStart(layerName, event.time);
			});

			this.on("ROUND_ENDED", async (event) => {
				await this.logMatchEnd(event.winner, event.time);
			});
		}

		// Player connection tracking
		if (this.options.logConnections) {
			this.on("PLAYER_CONNECTED", async (event) => {
				await this.logPlayerConnect(event.player, event.ip, event.time);
			});

			this.on("PLAYER_DISCONNECTED", async (event) => {
				await this.logPlayerDisconnect(event.player, event.time);
			});
		}

		// Combat tracking
		if (this.options.logWounds) {
			this.on("PLAYER_WOUNDED", async (event) => {
				await this.logWound({
					attacker: event.attacker,
					victim: event.victim,
					weapon: event.weapon,
					damage: event.damage,
					timestamp: event.time,
				});
			});
		}

		if (this.options.logDeaths) {
			this.on("PLAYER_DIED", async (event) => {
				await this.logDeath({
					attacker: event.attacker,
					victim: event.victim,
					weapon: event.weapon ?? "Unknown",
					suicide: event.suicide,
					timestamp: event.time,
				});
			});
		}

		if (this.options.logRevives) {
			this.on("PLAYER_REVIVED", async (event) => {
				await this.logRevive({
					medic: event.reviver,
					victim: event.victim,
					timestamp: event.time,
				});
			});
		}

		// Tick rate tracking
		if (this.options.logTickRate) {
			this.on("SERVER_TICK_RATE", async (event) => {
				this.lastTickRate = event.tickRate;
			});

			this.setInterval(
				async () => this.logTickRate(),
				this.options.tickRateInterval ?? 60000,
				"tick-rate-log",
			);
		}

		// Player count tracking
		if (this.options.logPlayerCount) {
			this.setInterval(
				async () => this.logPlayerCount(),
				this.options.playerCountInterval ?? 60000,
				"player-count-log",
			);
		}

		this.log.info("Database logging enabled", {
			serverID: this.options.serverID,
		});
	}

	/**
	 * Ensure the server record exists in the database.
	 */
	private async ensureServerRecord(): Promise<void> {
		try {
			const existing = await this.db.queryOne<{ id: number }>(
				"SELECT id FROM servers WHERE id = ?",
				[this.options.serverID],
			);

			if (!existing) {
				const serverInfo = this.server.currentLayer;
				await this.db.query(
					"INSERT INTO servers (id, name, created_at) VALUES (?, ?, NOW())",
					[this.options.serverID, serverInfo?.name ?? "Unknown Server"],
				);
				this.log.info("Created server record", {
					serverID: this.options.serverID,
				});
			}
		} catch (error) {
			this.log.error(
				"Failed to ensure server record",
				error instanceof Error ? error : new Error(String(error)),
			);
			throw error;
		}
	}

	/**
	 * Log match start.
	 */
	private async logMatchStart(layer: string, timestamp: Date): Promise<void> {
		try {
			// End previous match if still active
			if (this.currentMatch) {
				await this.logMatchEnd(null, timestamp);
			}

			const result = await this.db.query<{ insertId: number }>(
				`INSERT INTO matches (server_id, layer, started_at) VALUES (?, ?, ?)`,
				[this.options.serverID, layer, timestamp],
			);

			// Try to get the insert ID from the result
			const matchId =
				(result as unknown as { insertId?: number }).insertId ?? 0;

			this.currentMatch = {
				id: matchId,
				startTime: timestamp,
				layer,
			};

			this.log.debug("Match started", { matchId, layer });
		} catch (error) {
			this.log.error(
				"Failed to log match start",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Log match end.
	 */
	private async logMatchEnd(
		winner: number | string | null,
		timestamp: Date,
	): Promise<void> {
		if (!this.currentMatch) {
			return;
		}

		try {
			await this.db.query(
				`UPDATE matches SET ended_at = ?, winner = ? WHERE id = ?`,
				[timestamp, winner, this.currentMatch.id],
			);

			this.log.debug("Match ended", {
				matchId: this.currentMatch.id,
				winner,
			});

			this.currentMatch = null;
		} catch (error) {
			this.log.error(
				"Failed to log match end",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Log player connection.
	 */
	private async logPlayerConnect(
		player: {
			eosID: string;
			steamID?: string | undefined;
			name?: string | undefined;
		},
		ip: string,
		timestamp: Date,
	): Promise<void> {
		try {
			// Upsert player record
			await this.db.query(
				`INSERT INTO players (eos_id, steam_id, name, last_seen, first_seen)
				 VALUES (?, ?, ?, ?, ?)
				 ON DUPLICATE KEY UPDATE
				   steam_id = COALESCE(VALUES(steam_id), steam_id),
				   name = COALESCE(VALUES(name), name),
				   last_seen = VALUES(last_seen)`,
				[
					player.eosID,
					player.steamID ?? null,
					player.name ?? null,
					timestamp,
					timestamp,
				],
			);

			// Log connection event
			await this.db.query(
				`INSERT INTO player_connections (server_id, match_id, eos_id, ip, connected_at)
				 VALUES (?, ?, ?, ?, ?)`,
				[
					this.options.serverID,
					this.currentMatch?.id ?? null,
					player.eosID,
					ip,
					timestamp,
				],
			);

			this.log.debug("Player connected", { name: player.name });
		} catch (error) {
			this.log.error(
				"Failed to log player connect",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Log player disconnection.
	 */
	private async logPlayerDisconnect(
		player: { eosID: string; name?: string | undefined },
		timestamp: Date,
	): Promise<void> {
		try {
			// Update the most recent connection record
			await this.db.query(
				`UPDATE player_connections
				 SET disconnected_at = ?
				 WHERE eos_id = ? AND server_id = ? AND disconnected_at IS NULL
				 ORDER BY connected_at DESC
				 LIMIT 1`,
				[timestamp, player.eosID, this.options.serverID],
			);

			this.log.debug("Player disconnected", { name: player.name });
		} catch (error) {
			this.log.error(
				"Failed to log player disconnect",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Log wound event.
	 */
	private async logWound(event: {
		attacker?: { eosID: string; name: string; teamID: number | null } | null;
		victim: { eosID: string; name: string; teamID: number | null };
		weapon: string;
		damage: number;
		timestamp: Date;
	}): Promise<void> {
		try {
			await this.db.query(
				`INSERT INTO wounds
				 (server_id, match_id, attacker_eos_id, victim_eos_id, weapon, damage, teamkill, timestamp)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					this.options.serverID,
					this.currentMatch?.id ?? null,
					event.attacker?.eosID ?? null,
					event.victim.eosID,
					event.weapon,
					event.damage,
					event.attacker && event.attacker.teamID === event.victim.teamID,
					event.timestamp,
				],
			);
		} catch (error) {
			this.log.error(
				"Failed to log wound",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Log death event.
	 */
	private async logDeath(event: {
		attacker?: { eosID: string; name: string; teamID: number | null } | null;
		victim: { eosID: string; name: string; teamID: number | null };
		weapon: string;
		suicide?: boolean;
		timestamp: Date;
	}): Promise<void> {
		try {
			const isTeamkill =
				event.attacker &&
				!event.suicide &&
				event.attacker.teamID === event.victim.teamID;

			await this.db.query(
				`INSERT INTO deaths
				 (server_id, match_id, attacker_eos_id, victim_eos_id, weapon, teamkill, suicide, timestamp)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					this.options.serverID,
					this.currentMatch?.id ?? null,
					event.attacker?.eosID ?? null,
					event.victim.eosID,
					event.weapon,
					isTeamkill,
					event.suicide ?? false,
					event.timestamp,
				],
			);
		} catch (error) {
			this.log.error(
				"Failed to log death",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Log revive event.
	 */
	private async logRevive(event: {
		medic: { eosID: string; name: string };
		victim: { eosID: string; name: string };
		timestamp: Date;
	}): Promise<void> {
		try {
			await this.db.query(
				`INSERT INTO revives
				 (server_id, match_id, medic_eos_id, victim_eos_id, timestamp)
				 VALUES (?, ?, ?, ?, ?)`,
				[
					this.options.serverID,
					this.currentMatch?.id ?? null,
					event.medic.eosID,
					event.victim.eosID,
					event.timestamp,
				],
			);
		} catch (error) {
			this.log.error(
				"Failed to log revive",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Log current tick rate.
	 */
	private async logTickRate(): Promise<void> {
		if (this.lastTickRate === null) {
			return;
		}

		try {
			await this.db.query(
				`INSERT INTO tick_rates (server_id, match_id, tick_rate, timestamp)
				 VALUES (?, ?, ?, NOW())`,
				[
					this.options.serverID,
					this.currentMatch?.id ?? null,
					this.lastTickRate,
				],
			);
		} catch (error) {
			this.log.error(
				"Failed to log tick rate",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * Log current player count.
	 */
	private async logPlayerCount(): Promise<void> {
		try {
			const playerCount = this.server.playerCount;

			await this.db.query(
				`INSERT INTO player_counts (server_id, match_id, player_count, timestamp)
				 VALUES (?, ?, ?, NOW())`,
				[this.options.serverID, this.currentMatch?.id ?? null, playerCount],
			);
		} catch (error) {
			this.log.error(
				"Failed to log player count",
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}
}

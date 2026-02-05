/**
 * @squadscript/plugins
 *
 * SocketIOAPI Plugin
 *
 * Provides a real-time API for external applications using Socket.IO.
 * Allows external tools like web dashboards, bots, and monitoring systems
 * to receive live server events and query server state.
 *
 * Uses the native Bun engine (@socket.io/bun-engine) with Elysia for
 * optimal performance in the Bun runtime.
 *
 * @example
 * ```typescript
 * server.registerPlugin(SocketIOAPI, {
 *   port: 3000,
 *   authentication: 'your-secret-token',
 * });
 *
 * ```
 *
 * @module
 */

import { BasePlugin } from "@squadscript/server";
import type {
	Layer,
	OptionsSpec,
	Player,
	PluginMeta,
} from "@squadscript/types";
import type { Server as SocketIOServer, Socket as SocketIOSocket } from "socket.io";

/**
 * Events that are forwarded to Socket.IO clients.
 */
const FORWARDED_EVENTS = [
	// Player events
	"PLAYER_CONNECTED",
	"PLAYER_DISCONNECTED",
	"PLAYER_JOIN_SUCCEEDED",

	// Combat events
	"PLAYER_WOUNDED",
	"PLAYER_DIED",
	"PLAYER_REVIVED",

	// Chat events
	"CHAT_MESSAGE",
	"CHAT_COMMAND",

	// Game events
	"NEW_GAME",
	"ROUND_ENDED",
	"ROUND_WINNER",
	"ROUND_TICKETS",
	"SERVER_TICK_RATE",

	// Admin events
	"ADMIN_BROADCAST",
	"ADMIN_CAMERA",
	"PLAYER_KICKED",
	"PLAYER_WARNED",
	"PLAYER_BANNED",
	"SQUAD_CREATED",
] as const;

/**
 * Server state exposed via the API.
 */
interface ServerState {
	readonly players: readonly PlayerInfo[];
	readonly playerCount: number;
	readonly currentLayer: LayerInfo | null;
	readonly nextLayer: LayerInfo | null;
	readonly squads: readonly SquadInfo[];
}

/**
 * Simplified player info for API exposure.
 */
interface PlayerInfo {
	readonly eosID: string;
	readonly steamID: string | null;
	readonly name: string;
	readonly teamID: number | null;
	readonly squadID: number | null;
	readonly isSquadLeader: boolean;
	readonly role: string | null;
}

/**
 * Simplified layer info for API exposure.
 */
interface LayerInfo {
	readonly name: string;
	readonly map: string;
	readonly gamemode: string;
}

/**
 * Simplified squad info for API exposure.
 */
interface SquadInfo {
	readonly id: string;
	readonly name: string;
	readonly teamID: number;
	readonly size: number;
	readonly locked: boolean;
	readonly creatorName: string | null;
}

/**
 * Options specification for SocketIOAPI plugin.
 */
const optionsSpec = {
	port: {
		type: "number",
		required: false,
		description: "Port to run the Socket.IO server on",
		default: 3000,
	},
	host: {
		type: "string",
		required: false,
		description: "Host to bind the Socket.IO server to",
		default: "0.0.0.0",
	},
	authentication: {
		type: "string",
		required: false,
		description:
			"Authentication token required for clients to connect (empty = no auth)",
		default: null,
	},
	cors: {
		type: "boolean",
		required: false,
		description: "Enable CORS for the Socket.IO server",
		default: true,
	},
	corsOrigin: {
		type: "string",
		required: false,
		description: "CORS origin (use * for all)",
		default: "*",
	},
	rateLimit: {
		type: "number",
		required: false,
		description: "Maximum commands per minute per client (0 = unlimited)",
		default: 60,
	},
	forwardEvents: {
		type: "array",
		required: false,
		description: "Events to forward to clients (empty = all supported events)",
		default: [],
	},
	enableRcon: {
		type: "boolean",
		required: false,
		description: "Allow clients to execute RCON commands",
		default: false,
	},
	pingInterval: {
		type: "number",
		required: false,
		description: "Ping interval in milliseconds for the engine",
		default: 25000,
	},
	pingTimeout: {
		type: "number",
		required: false,
		description: "Ping timeout in milliseconds for the engine",
		default: 20000,
	},
} as const satisfies OptionsSpec;

/**
 * Rate limit tracking for a client.
 */
interface RateLimitEntry {
	count: number;
	resetAt: number;
}

/**
 * SocketIOAPI Plugin
 *
 * Provides a real-time Socket.IO API for external applications.
 * Uses the native Bun engine with Elysia for optimal performance.
 */
export class SocketIOAPI extends BasePlugin<typeof optionsSpec> {
	static readonly meta: PluginMeta = {
		name: "SocketIOAPI",
		description: "Real-time Socket.IO API for external applications",
		version: "1.0.0",
		defaultEnabled: false,
	};

	static readonly optionsSpec = optionsSpec;

	/**
	 * Socket.IO server instance.
	 */
	private io: SocketIOServer | null = null;

	/**
	 * Elysia app instance.
	 * Using 'unknown' as Elysia's generic types are complex and context-dependent.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: Elysia generic types are complex
	private app: { stop: () => Promise<unknown> } | null = null;

	/**
	 * Connected clients.
	 */
	private clients = new Set<string>();

	/**
	 * Rate limit tracking per client.
	 */
	private rateLimits = new Map<string, RateLimitEntry>();

	/**
	 * Start the Socket.IO server.
	 */
	async mount(): Promise<void> {
		await this.startServer();
		this.setupEventForwarding();

		this.log.info("Socket.IO API started", {
			port: this.options.port,
			host: this.options.host,
			authEnabled: !!this.options.authentication,
		});
	}

	/**
	 * Stop the Socket.IO server.
	 */
	async unmount(): Promise<void> {
		await super.unmount();

		if (this.io) {
			await this.io.close();
			this.io = null;
		}

		if (this.app) {
			await this.app.stop();
			this.app = null;
		}

		this.clients.clear();
		this.rateLimits.clear();

		this.log.info("Socket.IO API stopped");
	}

	/**
	 * Start the Socket.IO server using Bun engine with Elysia.
	 */
	private async startServer(): Promise<void> {
		// Dynamic imports to avoid bundling issues
		const { Server: SocketIO } = await import("socket.io");
		const { Server: Engine } = await import("@socket.io/bun-engine");
		const { Elysia } = await import("elysia");

		// Create Socket.IO server
		const io = new SocketIO();

		// Build CORS origin configuration
		const corsOriginValue = this.options.corsOrigin;
		const corsOrigins: string[] = corsOriginValue && corsOriginValue !== "*"
			? [corsOriginValue]
			: [];

		// Create Bun engine with configuration
		const engine = new Engine({
			path: "/socket.io/",
			pingInterval: this.options.pingInterval,
			pingTimeout: this.options.pingTimeout,
			cors: this.options.cors
				? {
						origin: corsOrigins.length > 0 ? corsOrigins : undefined,
					}
				: undefined,
		});

		// Bind Socket.IO to the Bun engine
		io.bind(engine);

		// Handle connections
		io.on("connection", (socket: SocketIOSocket) =>
			this.handleConnection(socket),
		);

		// Get engine handler config
		const engineHandler = engine.handler();

		// Create Elysia app with routes
		const app = new Elysia()
			// Health check endpoint
			.get("/health", () => ({
				status: "ok",
				clients: this.clients.size,
			}))
			// Socket.IO endpoint - handle all methods
			.all("/socket.io/", ({ request, server }) => {
				if (!server) {
					return new Response("Server not available", { status: 500 });
				}
				return engine.handleRequest(request, server);
			})
			// Start listening with Bun engine handler
			.listen({
				port: this.options.port,
				hostname: this.options.host,
				...engineHandler,
			});

		this.io = io;
		this.app = app;
	}

	/**
	 * Handle a new client connection.
	 */
	private handleConnection(socket: SocketIOSocket): void {
		// Check authentication
		if (this.options.authentication) {
			const token = socket.handshake.auth.token;
			if (token !== this.options.authentication) {
				this.log.warn("Client rejected: invalid authentication", {
					socketId: socket.id,
				});
				socket.emit("error", { message: "Invalid authentication token" });
				socket.disconnect();
				return;
			}
		}

		this.clients.add(socket.id);
		this.log.debug("Client connected", { socketId: socket.id });

		// Setup client handlers
		this.setupClientHandlers(socket);

		// Send current server state
		socket.emit("connected", {
			serverState: this.getServerState(),
			supportedEvents: this.getForwardedEvents(),
		});
	}

	/**
	 * Setup handlers for client requests.
	 */
	private setupClientHandlers(socket: SocketIOSocket): void {
		socket.on("disconnect", () => {
			this.clients.delete(socket.id);
			this.rateLimits.delete(socket.id);
			this.log.debug("Client disconnected", { socketId: socket.id });
		});

		// Get current server state
		socket.on("getState", (callback: unknown) => {
			if (typeof callback !== "function") return;
			if (!this.checkRateLimit(socket.id)) {
				callback({ error: "Rate limit exceeded" });
				return;
			}
			callback({ state: this.getServerState() });
		});

		// Get specific player info
		socket.on("getPlayer", (eosID: unknown, callback: unknown) => {
			if (typeof callback !== "function") return;
			if (typeof eosID !== "string") {
				callback({ error: "Invalid player ID" });
				return;
			}
			if (!this.checkRateLimit(socket.id)) {
				callback({ error: "Rate limit exceeded" });
				return;
			}

			const player = this.server.getPlayerByEOSID(eosID as never);
			callback({ player: player ? this.serializePlayer(player) : null });
		});

		// Get all players
		socket.on("getPlayers", (callback: unknown) => {
			if (typeof callback !== "function") return;
			if (!this.checkRateLimit(socket.id)) {
				callback({ error: "Rate limit exceeded" });
				return;
			}

			const players = Array.from(this.server.players.values()).map((p) =>
				this.serializePlayer(p),
			);
			callback({ players });
		});

		// Execute RCON command (if enabled)
		if (this.options.enableRcon) {
			socket.on("rcon", async (command: unknown, callback: unknown) => {
				if (typeof callback !== "function") return;
				if (typeof command !== "string") {
					callback({ error: "Invalid command" });
					return;
				}
				if (!this.checkRateLimit(socket.id)) {
					callback({ error: "Rate limit exceeded" });
					return;
				}

				try {
					const result = await this.rcon.execute(command);
					callback({ result });
				} catch (error) {
					callback({
						error: error instanceof Error ? error.message : "Command failed",
					});
				}
			});
		}
	}

	/**
	 * Setup event forwarding to Socket.IO clients.
	 */
	private setupEventForwarding(): void {
		const eventsToForward = this.getForwardedEvents();

		for (const event of eventsToForward) {
			this.on(event as never, (data: unknown) => {
				if (this.io && this.clients.size > 0) {
					this.io.emit(event, this.sanitizeEventData(data));
				}
			});
		}
	}

	/**
	 * Get the list of events to forward.
	 */
	private getForwardedEvents(): readonly string[] {
		const customEvents = this.options.forwardEvents as readonly string[];
		if (customEvents.length > 0) {
			return customEvents.filter((e) =>
				(FORWARDED_EVENTS as readonly string[]).includes(e),
			);
		}
		return FORWARDED_EVENTS;
	}

	/**
	 * Check and update rate limit for a client.
	 */
	private checkRateLimit(socketId: string): boolean {
		const rateLimit = this.options.rateLimit ?? 60;
		if (rateLimit <= 0) {
			return true; // No rate limiting
		}

		const now = Date.now();
		const entry = this.rateLimits.get(socketId);

		if (!entry || now >= entry.resetAt) {
			this.rateLimits.set(socketId, {
				count: 1,
				resetAt: now + 60000, // 1 minute window
			});
			return true;
		}

		if (entry.count >= rateLimit) {
			return false;
		}

		entry.count++;
		return true;
	}

	/**
	 * Get current server state for API.
	 */
	private getServerState(): ServerState {
		const players = Array.from(this.server.players.values()).map((p) =>
			this.serializePlayer(p),
		);

		const squads = Array.from(this.server.squads.values()).map((s) => ({
			id: `${s.teamID}-${s.squadID}`,
			name: s.name,
			teamID: s.teamID,
			size: s.size,
			locked: s.locked,
			creatorName: s.creatorName,
		}));

		return {
			players,
			playerCount: this.server.playerCount,
			currentLayer: this.serializeLayer(this.server.currentLayer),
			nextLayer: this.serializeLayer(this.server.nextLayer),
			squads,
		};
	}

	/**
	 * Serialize a player for API output.
	 */
	private serializePlayer(player: Player): PlayerInfo {
		return {
			eosID: player.eosID,
			steamID: player.steamID,
			name: player.name,
			teamID: player.teamID,
			squadID: player.squadID,
			isSquadLeader: player.isSquadLeader,
			role: player.role,
		};
	}

	/**
	 * Serialize a layer for API output.
	 */
	private serializeLayer(layer: Layer | null): LayerInfo | null {
		if (!layer) return null;
		return {
			name: layer.name,
			map: layer.level,
			gamemode: layer.gameMode,
		};
	}

	/**
	 * Sanitize event data for transmission.
	 *
	 * Removes or transforms any non-serializable data and
	 * converts branded types to plain strings/numbers.
	 */
	private sanitizeEventData(data: unknown): unknown {
		if (data === null || data === undefined) {
			return data;
		}

		if (typeof data !== "object") {
			return data;
		}

		if (data instanceof Date) {
			return data.toISOString();
		}

		if (Array.isArray(data)) {
			return data.map((item) => this.sanitizeEventData(item));
		}

		// Handle objects
		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(data)) {
			// Skip functions and symbols
			if (typeof value === "function" || typeof value === "symbol") {
				continue;
			}
			result[key] = this.sanitizeEventData(value);
		}
		return result;
	}
}

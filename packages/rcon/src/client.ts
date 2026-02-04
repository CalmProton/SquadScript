/**
 * @squadscript/rcon
 *
 * Main RCON client implementation.
 *
 * This is the primary public API for interacting with Squad RCON servers.
 * It orchestrates connection management, command execution, and event handling.
 *
 * @module
 */

import { type Result, Ok, Err } from '@squadscript/types';
import type { TeamID, SquadID } from '@squadscript/types';
import { Logger, type ModuleLogger, LogLevel } from '@squadscript/logger';

import {
  ConnectionState,
  DefaultTimings,
  ProtocolLimits,
} from './constants.js';
import {
  decodePacket,
  encodeAuthPacket,
  encodeCommandPackets,
  isChatPacket,
  isAuthResponse,
  isAuthSuccess,
  isEndPacket,
  isMidPacket,
  formatPacketForLog,
  detectBrokenPacket,
  type RconPacket,
} from './protocol.js';
import type {
  RconConfig,
  ResolvedRconConfig,
  PendingCommand,
  PlayerInfo,
  SquadInfo,
  MapInfo,
  AnyPlayerID,
  AllEventMap,
} from './types.js';
import {
  RconError,
  ConnectionError,
  AuthenticationError,
  CommandError,
} from './errors.js';
import { RconConnection } from './connection.js';
import { TypedEventEmitter } from './events/emitter.js';
import { parseChatPacket } from './parsers/chat.js';
import {
  parseListPlayers,
  parseListSquads,
  parseCurrentMap,
  parseNextMap,
} from './parsers/response.js';

// =============================================================================
// Config Resolution
// =============================================================================

/**
 * Applies default values to configuration.
 */
function resolveConfig(config: RconConfig): ResolvedRconConfig {
  return {
    host: config.host,
    port: config.port,
    password: config.password,
    connectTimeout: config.connectTimeout ?? DefaultTimings.CONNECT_TIMEOUT,
    reconnect: {
      enabled: config.reconnect?.enabled ?? true,
      initialDelay:
        config.reconnect?.initialDelay ?? DefaultTimings.RECONNECT_INITIAL_DELAY,
      maxDelay: config.reconnect?.maxDelay ?? DefaultTimings.RECONNECT_MAX_DELAY,
      multiplier:
        config.reconnect?.multiplier ?? DefaultTimings.RECONNECT_MULTIPLIER,
      jitter: config.reconnect?.jitter ?? DefaultTimings.RECONNECT_JITTER,
      maxAttempts: config.reconnect?.maxAttempts ?? 0,
    },
    command: {
      timeout: config.command?.timeout ?? DefaultTimings.COMMAND_TIMEOUT,
      retries: config.command?.retries ?? 1,
    },
    heartbeat: {
      enabled: config.heartbeat?.enabled ?? true,
      interval: config.heartbeat?.interval ?? DefaultTimings.HEARTBEAT_INTERVAL,
      command: config.heartbeat?.command ?? '',
    },
  };
}

// =============================================================================
// RconClient
// =============================================================================

/**
 * RCON client for Squad game servers.
 *
 * Provides a type-safe API for executing commands and receiving events
 * from Squad game servers via RCON.
 *
 * @example
 * ```typescript
 * import { RconClient } from '@squadscript/rcon';
 *
 * const client = new RconClient({
 *   host: '127.0.0.1',
 *   port: 21114,
 *   password: 'your-password',
 * });
 *
 * // Connect to server
 * await client.connect();
 *
 * // Execute commands
 * const players = await client.getPlayers();
 * if (players.ok) {
 *   console.log(`${players.value.length} players online`);
 * }
 *
 * // Listen for events
 * client.on('CHAT_MESSAGE', (event) => {
 *   console.log(`${event.playerName}: ${event.message}`);
 * });
 *
 * // Disconnect when done
 * await client.disconnect();
 * ```
 */
export class RconClient extends TypedEventEmitter<AllEventMap> {
  /** Resolved configuration. */
  private readonly config: ResolvedRconConfig;

  /** Logger instance. */
  private readonly log: ModuleLogger;

  /** Connection manager. */
  private readonly connection: RconConnection;

  /** Pending commands awaiting response. */
  private readonly pendingCommands = new Map<number, PendingCommand>();

  /** Current sequence counter. */
  private sequence = 1;

  /** Whether currently authenticated. */
  private authenticated = false;

  /** Heartbeat timer. */
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    config: RconConfig,
    logger?: Logger,
  ) {
    super();

    this.config = resolveConfig(config);

    // Create logger
    const baseLogger = logger ?? new Logger({ defaultLevel: LogLevel.INFO });
    this.log = baseLogger.child('rcon');

    // Create connection manager
    this.connection = new RconConnection(this.config, this.log);

    // Set up connection event handlers
    this.setupConnectionHandlers();
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  /**
   * Connects to the RCON server.
   *
   * Establishes TCP connection and authenticates with the server.
   *
   * @returns Promise that resolves when connected and authenticated
   * @throws ConnectionError if connection fails
   * @throws AuthenticationError if authentication fails
   */
  async connect(): Promise<void> {
    this.log.info(`Connecting to ${this.config.host}:${this.config.port}`);

    // Connect to server
    await this.connection.connect();

    // Authenticate
    await this.authenticate();

    // Start heartbeat
    this.startHeartbeat();

    this.log.info('Connected and authenticated');
    this.emit('connected');
  }

  /**
   * Disconnects from the RCON server.
   *
   * Gracefully closes the connection and cleans up resources.
   */
  async disconnect(): Promise<void> {
    this.log.info('Disconnecting');

    this.stopHeartbeat();
    this.abortPendingCommands('Disconnecting');
    this.authenticated = false;

    await this.connection.disconnect();

    this.emit('disconnected', { reason: 'User requested disconnect' });
  }

  /**
   * Destroys the client and releases all resources.
   *
   * Use this when the client is no longer needed.
   */
  destroy(): void {
    this.log.info('Destroying client');

    this.stopHeartbeat();
    this.abortPendingCommands('Client destroyed');
    this.authenticated = false;

    this.connection.destroy();
    this.removeAllListeners();
  }

  /**
   * Gets the current connection state.
   */
  getState(): ConnectionState {
    return this.connection.getState();
  }

  /**
   * Checks if connected and authenticated.
   */
  isConnected(): boolean {
    return this.connection.isConnected() && this.authenticated;
  }

  // ===========================================================================
  // Query Commands
  // ===========================================================================

  /**
   * Gets the list of connected players.
   *
   * @returns Result containing array of player info
   */
  async getPlayers(): Promise<Result<PlayerInfo[], RconError>> {
    const result = await this.execute('ListPlayers');
    if (!result.ok) {
      return result;
    }

    return parseListPlayers(result.value);
  }

  /**
   * Gets the list of squads.
   *
   * @returns Result containing array of squad info
   */
  async getSquads(): Promise<Result<SquadInfo[], RconError>> {
    const result = await this.execute('ListSquads');
    if (!result.ok) {
      return result;
    }

    return parseListSquads(result.value);
  }

  /**
   * Gets the current map and layer.
   *
   * @returns Result containing map info
   */
  async getCurrentMap(): Promise<Result<MapInfo, RconError>> {
    const result = await this.execute('ShowCurrentMap');
    if (!result.ok) {
      return result;
    }

    return parseCurrentMap(result.value);
  }

  /**
   * Gets the next map and layer.
   *
   * @returns Result containing map info (can be null if not set)
   */
  async getNextMap(): Promise<Result<MapInfo, RconError>> {
    const result = await this.execute('ShowNextMap');
    if (!result.ok) {
      return result;
    }

    return parseNextMap(result.value);
  }

  // ===========================================================================
  // Admin Commands
  // ===========================================================================

  /**
   * Warns a player with a message.
   *
   * @param playerId - Player identifier (Steam ID, EOS ID, Player ID, or name)
   * @param message - Warning message to display
   * @returns Result indicating success or failure
   */
  async warn(
    playerId: AnyPlayerID,
    message: string,
  ): Promise<Result<void, RconError>> {
    const id = this.formatPlayerId(playerId);
    const sanitizedMessage = this.sanitizeMessage(message);

    const result = await this.execute(`AdminWarn "${id}" ${sanitizedMessage}`);
    return result.ok ? Ok(undefined) : result;
  }

  /**
   * Kicks a player from the server.
   *
   * @param playerId - Player identifier
   * @param reason - Kick reason
   * @returns Result indicating success or failure
   */
  async kick(
    playerId: AnyPlayerID,
    reason: string,
  ): Promise<Result<void, RconError>> {
    const id = this.formatPlayerId(playerId);
    const sanitizedReason = this.sanitizeMessage(reason);

    const result = await this.execute(`AdminKick "${id}" ${sanitizedReason}`);
    return result.ok ? Ok(undefined) : result;
  }

  /**
   * Bans a player from the server.
   *
   * @param playerId - Player identifier
   * @param duration - Ban duration (0 = permanent, or interval like "1h", "1d")
   * @param reason - Ban reason
   * @returns Result indicating success or failure
   */
  async ban(
    playerId: AnyPlayerID,
    duration: string | number,
    reason: string,
  ): Promise<Result<void, RconError>> {
    const id = this.formatPlayerId(playerId);
    const sanitizedReason = this.sanitizeMessage(reason);

    const result = await this.execute(
      `AdminBan "${id}" ${duration} ${sanitizedReason}`,
    );
    return result.ok ? Ok(undefined) : result;
  }

  /**
   * Broadcasts a message to all players.
   *
   * @param message - Message to broadcast
   * @returns Result indicating success or failure
   */
  async broadcast(message: string): Promise<Result<void, RconError>> {
    const sanitizedMessage = this.sanitizeMessage(message);

    const result = await this.execute(`AdminBroadcast ${sanitizedMessage}`);
    return result.ok ? Ok(undefined) : result;
  }

  /**
   * Changes the current map.
   *
   * @param layer - Layer name (e.g., "Narva_RAAS_v1")
   * @returns Result indicating success or failure
   */
  async changeMap(layer: string): Promise<Result<void, RconError>> {
    const result = await this.execute(`AdminChangeMap ${layer}`);
    return result.ok ? Ok(undefined) : result;
  }

  /**
   * Sets the next map.
   *
   * @param layer - Layer name
   * @returns Result indicating success or failure
   */
  async setNextMap(layer: string): Promise<Result<void, RconError>> {
    const result = await this.execute(`AdminSetNextMap ${layer}`);
    return result.ok ? Ok(undefined) : result;
  }

  /**
   * Forces a player to change teams.
   *
   * @param playerId - Player identifier
   * @returns Result indicating success or failure
   */
  async forceTeamChange(playerId: AnyPlayerID): Promise<Result<void, RconError>> {
    const id = this.formatPlayerId(playerId);

    const result = await this.execute(`AdminForceTeamChange "${id}"`);
    return result.ok ? Ok(undefined) : result;
  }

  /**
   * Disbands a squad.
   *
   * @param teamId - Team ID (1 or 2)
   * @param squadId - Squad ID
   * @returns Result indicating success or failure
   */
  async disbandSquad(
    teamId: TeamID | 1 | 2,
    squadId: SquadID | number,
  ): Promise<Result<void, RconError>> {
    const result = await this.execute(`AdminDisbandSquad ${teamId} ${squadId}`);
    return result.ok ? Ok(undefined) : result;
  }

  /**
   * Ends the current match.
   *
   * @returns Result indicating success or failure
   */
  async endMatch(): Promise<Result<void, RconError>> {
    const result = await this.execute('AdminEndMatch');
    return result.ok ? Ok(undefined) : result;
  }

  /**
   * Restarts the current match.
   *
   * @returns Result indicating success or failure
   */
  async restartMatch(): Promise<Result<void, RconError>> {
    const result = await this.execute('AdminRestartMatch');
    return result.ok ? Ok(undefined) : result;
  }

  // ===========================================================================
  // Raw Command Execution
  // ===========================================================================

  /**
   * Executes a raw RCON command.
   *
   * @param command - The command string to execute
   * @returns Result containing the response string or error
   */
  async execute(command: string): Promise<Result<string, RconError>> {
    if (!this.isConnected()) {
      return Err(ConnectionError.notConnected());
    }

    return this.executeWithRetry(command, this.config.command.retries);
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Sets up connection event handlers.
   */
  private setupConnectionHandlers(): void {
    // Handle incoming data
    this.connection.on('data', () => {
      this.processIncomingData();
    });

    // Handle socket close
    this.connection.on('closed', ({ hadError }) => {
      this.authenticated = false;
      this.stopHeartbeat();
      this.abortPendingCommands(hadError ? 'Connection error' : 'Connection closed');

      this.emit('disconnected', {
        reason: hadError ? 'Connection error' : 'Connection closed',
      });
    });

    // Handle reconnection events
    this.connection.on('reconnecting', ({ attempt, delay }) => {
      this.emit('reconnecting', { attempt, delay });
    });

    this.connection.on('reconnect_exhausted', ({ attempts }) => {
      this.emit('reconnect_failed', { attempts });
    });

    // Handle socket errors
    this.connection.on('error', (err) => {
      this.emit('error', err);
    });
  }

  /**
   * Authenticates with the server.
   */
  private async authenticate(): Promise<void> {
    const sequence = this.getNextSequence();
    const packet = encodeAuthPacket(this.config.password, sequence);

    this.log.debug('Sending auth packet');
    this.connection.write(packet.buffer);

    // Wait for auth response
    const timeout = this.config.command.timeout;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(AuthenticationError.timeout(timeout));
      }, timeout);

      // Store resolver for auth response
      const pendingAuth: PendingCommand = {
        sequence,
        command: 'AUTH',
        sentAt: Date.now(),
        resolve: () => {
          clearTimeout(timer);
          this.authenticated = true;
          this.connection.setAuthenticated();
          resolve();
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
        responsePackets: [],
      };

      this.pendingCommands.set(sequence, pendingAuth);
    });
  }

  /**
   * Executes a command with retries.
   */
  private async executeWithRetry(
    command: string,
    retriesLeft: number,
  ): Promise<Result<string, RconError>> {
    const result = await this.executeOnce(command);

    if (!result.ok && retriesLeft > 0 && result.error.recoverable) {
      this.log.debug(`Retrying command '${command}' (${retriesLeft} retries left)`);
      return this.executeWithRetry(command, retriesLeft - 1);
    }

    return result;
  }

  /**
   * Executes a single command attempt.
   */
  private async executeOnce(command: string): Promise<Result<string, RconError>> {
    const sequence = this.getNextSequence();
    const [cmdPacket, emptyPacket] = encodeCommandPackets(command, sequence);

    this.log.debug(`Executing: ${command} (seq=${sequence})`);

    return new Promise((resolve) => {
      const timeout = this.config.command.timeout;

      const timer = setTimeout(() => {
        this.pendingCommands.delete(sequence);
        resolve(Err(CommandError.timeout(command, timeout)));
      }, timeout);

      const pending: PendingCommand = {
        sequence,
        command,
        sentAt: Date.now(),
        resolve: (response) => {
          clearTimeout(timer);
          resolve(Ok(response));
        },
        reject: (err) => {
          clearTimeout(timer);
          resolve(Err(err instanceof RconError ? err : new CommandError('COMMAND_FAILED', err.message)));
        },
        timeoutTimer: timer,
        responsePackets: [],
      };

      this.pendingCommands.set(sequence, pending);

      // Send command packet
      this.connection.write(cmdPacket.buffer);

      // Send empty packet (end marker)
      this.connection.write(emptyPacket.buffer);
    });
  }

  /**
   * Processes incoming data from the socket.
   */
  private processIncomingData(): void {
    let buffer = this.connection.getBuffer();

    while (buffer.length >= ProtocolLimits.SIZE_FIELD_LENGTH) {
      // Check for broken packet first
      const brokenBytes = detectBrokenPacket(buffer);
      if (brokenBytes > 0) {
        this.log.trace(`Skipping broken packet (${brokenBytes} bytes)`);
        this.connection.consumeBuffer(brokenBytes);
        buffer = this.connection.getBuffer();
        continue;
      }

      // Try to decode a packet
      const result = decodePacket(buffer);

      if (!result.ok) {
        if (result.error.code === 'INCOMPLETE') {
          // Wait for more data
          break;
        }

        // Protocol error - log and skip some data
        this.log.warn(`Packet decode error: ${result.error.code}`);
        this.connection.consumeBuffer(1);
        buffer = this.connection.getBuffer();
        continue;
      }

      const { packet, bytesConsumed } = result.value;
      this.connection.consumeBuffer(bytesConsumed);
      buffer = this.connection.getBuffer();

      this.log.trace(`Received: ${formatPacketForLog(packet)}`);

      // Handle packet by type
      this.handlePacket(packet);
    }
  }

  /**
   * Handles a decoded packet.
   */
  private handlePacket(packet: RconPacket): void {
    // Handle chat packets (unsolicited)
    if (isChatPacket(packet)) {
      this.handleChatPacket(packet);
      return;
    }

    // Handle auth response
    if (isAuthResponse(packet)) {
      this.handleAuthResponse(packet);
      return;
    }

    // Handle command response
    this.handleCommandResponse(packet);
  }

  /**
   * Handles a chat/event packet.
   */
  private handleChatPacket(packet: RconPacket): void {
    const parsed = parseChatPacket(packet.body);
    if (parsed) {
      this.log.debug(`Chat event: ${parsed.type}`);
      // Type assertion needed due to union type
      this.emit(parsed.type, parsed.event as never);
    } else {
      this.log.trace(`Unrecognized chat packet: ${packet.body}`);
    }
  }

  /**
   * Handles an authentication response packet.
   */
  private handleAuthResponse(packet: RconPacket): void {
    const pending = this.pendingCommands.get(packet.count);
    if (!pending) {
      this.log.warn(`Received auth response for unknown sequence: ${packet.count}`);
      return;
    }

    this.pendingCommands.delete(packet.count);

    if (isAuthSuccess(packet)) {
      pending.resolve('');
    } else {
      pending.reject(AuthenticationError.failed());
    }
  }

  /**
   * Handles a command response packet.
   */
  private handleCommandResponse(packet: RconPacket): void {
    const pending = this.pendingCommands.get(packet.count);

    if (!pending) {
      // Could be a delayed response or protocol issue
      this.log.trace(`Response for unknown sequence: ${packet.count}`);
      return;
    }

    if (isMidPacket(packet)) {
      // Accumulate response
      pending.responsePackets.push(packet.body);
    } else if (isEndPacket(packet)) {
      // Complete response
      this.pendingCommands.delete(packet.count);
      const response = pending.responsePackets.join('');
      pending.resolve(response);
    }
  }

  /**
   * Aborts all pending commands.
   */
  private abortPendingCommands(reason: string): void {
    for (const [_sequence, pending] of this.pendingCommands) {
      if (pending.timeoutTimer) {
        clearTimeout(pending.timeoutTimer);
      }
      pending.reject(CommandError.aborted(pending.command, reason));
    }
    this.pendingCommands.clear();
  }

  /**
   * Gets the next sequence number.
   */
  private getNextSequence(): number {
    const seq = this.sequence;
    this.sequence++;

    if (this.sequence > ProtocolLimits.MAX_SEQUENCE) {
      this.sequence = 1;
    }

    return seq;
  }

  /**
   * Starts the heartbeat timer.
   */
  private startHeartbeat(): void {
    if (!this.config.heartbeat.enabled) {
      return;
    }

    this.stopHeartbeat();

    const interval = this.config.heartbeat.interval;
    const command = this.config.heartbeat.command;

    this.heartbeatTimer = setInterval(async () => {
      if (!this.isConnected()) {
        return;
      }

      this.log.trace('Sending heartbeat');

      // Execute empty or configured command
      const result = await this.execute(command);
      if (!result.ok) {
        this.log.warn(`Heartbeat failed: ${result.error.message}`);
      }
    }, interval);
  }

  /**
   * Stops the heartbeat timer.
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Formats a player ID for use in commands.
   */
  private formatPlayerId(id: AnyPlayerID): string {
    // Numbers are player IDs, convert to string
    if (typeof id === 'number') {
      return String(id);
    }
    return id;
  }

  /**
   * Sanitizes a message for safe use in RCON commands.
   */
  private sanitizeMessage(message: string): string {
    // Remove control characters and problematic quotes
    return message
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/"/g, "'");
  }
}

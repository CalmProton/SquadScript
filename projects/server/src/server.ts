/**
 * @squadscript/server
 *
 * Main SquadServer class - the core orchestrator.
 *
 * Manages all server interactions, state, and event routing.
 *
 * @module
 */

import { Logger, type ModuleLogger, LogLevel } from '@squadscript/logger';
import { RconClient } from '@squadscript/rcon';
import { LogParser, TailLogReader, FtpLogReader, SftpLogReader } from '@squadscript/log-parser';
import type {
  Result,
  Player,
  Squad,
  Layer,
  EOSID,
  SteamID,
  PlayerID,
  TeamID,
  SquadID,
} from '@squadscript/types';
import { Ok, Err, asTeamID, asSquadID } from '@squadscript/types';

import { TypedEventEmitter } from './events/emitter.js';
import { UpdateScheduler } from './scheduler/update-scheduler.js';
import { PlayerService } from './services/player.service.js';
import { SquadService } from './services/squad.service.js';
import { LayerService } from './services/layer.service.js';
import { AdminService } from './services/admin.service.js';
import {
  SquadServerError,
  ConnectionError,
  InvalidStateError,
  ErrorCode,
} from './errors.js';
import { DefaultIntervals, Timings } from './constants.js';
import type {
  ServerState,
  ServerEventMap,
  SquadServerOptions,
  UpdateIntervals,
  ResolvedAdmin,
  ServerInfo,
} from './types.js';
import { ServerState as ServerStateEnum, ServerEventType } from './types.js';

/**
 * Main SquadServer class.
 *
 * The central orchestrator that:
 * - Manages RCON client and LogParser instances
 * - Maintains server state (players, squads, teams, layers, admins)
 * - Routes and enriches events from RCON/LogParser
 * - Handles periodic data refresh
 * - Exposes a clean API for querying server state
 *
 * @example
 * ```typescript
 * const server = new SquadServer({
 *   id: 'server-1',
 *   name: 'My Squad Server',
 *   rcon: { host: '127.0.0.1', port: 21114, password: 'secret' },
 *   logReader: { mode: 'tail', logDir: '/path/to/logs' },
 * });
 *
 * // Subscribe to events
 * server.on('PLAYER_CONNECTED', (event) => {
 *   console.log(`Player connected: ${event.player.eosID}`);
 * });
 *
 * server.on('CHAT_MESSAGE', (event) => {
 *   console.log(`${event.playerName}: ${event.message}`);
 * });
 *
 * // Start the server
 * await server.start();
 *
 * // Query state
 * const players = server.players;
 * const squads = server.squads;
 *
 * // Execute commands
 * await server.broadcast('Hello world!');
 *
 * // Stop when done
 * await server.stop();
 * ```
 */
export class SquadServer extends TypedEventEmitter<ServerEventMap> {
  // ===========================================================================
  // Identity
  // ===========================================================================

  /** Unique identifier for this server instance. */
  readonly id: string;

  /** Human-readable server name. */
  readonly name: string;

  // ===========================================================================
  // Private Fields
  // ===========================================================================

  private readonly logger: Logger;
  private readonly log: ModuleLogger;
  private readonly options: SquadServerOptions;

  // Clients
  private readonly rcon: RconClient;
  private readonly logParser: LogParser;

  // Services
  private readonly playerService: PlayerService;
  private readonly squadService: SquadService;
  private readonly layerService: LayerService;
  private readonly adminService: AdminService;

  // Scheduler
  private readonly scheduler: UpdateScheduler;

  // State
  private state: ServerState = ServerStateEnum.CREATED;
  private serverInfo: ServerInfo | null = null;

  constructor(options: SquadServerOptions, logger?: Logger) {
    super();

    this.id = options.id;
    this.name = options.name ?? options.id;
    this.options = options;

    // Initialize logger
    this.logger = logger ?? new Logger({ defaultLevel: LogLevel.INFO });
    this.log = this.logger.child('server');

    // Initialize RCON client
    this.rcon = new RconClient(
      {
        host: options.rcon.host,
        port: options.rcon.port,
        password: options.rcon.password,
      },
      this.logger,
    );

    // Initialize log reader and parser
    const logReader = this.createLogReader(options);
    this.logParser = new LogParser({
      reader: logReader,
      logger: this.logger,
    });

    // Initialize services
    const playerLogger = this.logger.child('player-service');
    const squadLogger = this.logger.child('squad-service');
    const layerLogger = this.logger.child('layer-service');
    const adminLogger = this.logger.child('admin-service');

    this.playerService = new PlayerService({ logger: playerLogger });
    this.squadService = new SquadService({ logger: squadLogger });
    this.layerService = new LayerService({
      logger: layerLogger,
      ...(options.layerHistorySize !== undefined && { historySize: options.layerHistorySize }),
    });
    this.adminService = new AdminService({
      logger: adminLogger,
      ...(options.adminLists !== undefined && { sources: options.adminLists }),
    });

    // Initialize scheduler
    const schedulerLogger = this.logger.child('scheduler');
    this.scheduler = new UpdateScheduler({ logger: schedulerLogger });

    // Set up event handlers
    this.setupRconEventHandlers();
    this.setupLogParserEventHandlers();
    this.setupScheduledTasks(options.updateIntervals);

    this.log.info(`SquadServer "${this.name}" initialized`);
  }

  // ===========================================================================
  // State Accessors
  // ===========================================================================

  /**
   * Gets the current server state.
   */
  getState(): ServerState {
    return this.state;
  }

  /**
   * Checks if the server is running.
   */
  isRunning(): boolean {
    return this.state === ServerStateEnum.RUNNING;
  }

  /**
   * Gets all connected players.
   */
  get players(): readonly Player[] {
    return this.playerService.getAll();
  }

  /**
   * Gets the current player count.
   */
  get playerCount(): number {
    return this.playerService.count;
  }

  /**
   * Gets all squads.
   */
  get squads(): readonly Squad[] {
    return this.squadService.getAll();
  }

  /**
   * Gets the current layer.
   */
  get currentLayer(): Layer | null {
    return this.layerService.currentLayer;
  }

  /**
   * Gets the next layer.
   */
  get nextLayer(): Layer | null {
    return this.layerService.nextLayer;
  }

  /**
   * Gets the current server info.
   */
  getServerInfo(): ServerInfo | null {
    return this.serverInfo;
  }

  /**
   * Gets all resolved admins.
   */
  get admins(): ReadonlyMap<string, ResolvedAdmin> {
    return this.adminService.getAll();
  }

  // ===========================================================================
  // Player Lookups
  // ===========================================================================

  /**
   * Gets a player by their EOS ID.
   */
  getPlayerByEOSID(eosID: EOSID): Player | null {
    return this.playerService.getByEOSID(eosID);
  }

  /**
   * Gets a player by their Steam ID.
   */
  getPlayerBySteamID(steamID: SteamID): Player | null {
    return this.playerService.getBySteamID(steamID);
  }

  /**
   * Gets a player by their in-game player ID.
   */
  getPlayerByPlayerID(playerID: PlayerID): Player | null {
    return this.playerService.getByPlayerID(playerID);
  }

  /**
   * Gets a player by their name.
   */
  getPlayerByName(name: string): Player | null {
    return this.playerService.getByName(name);
  }

  /**
   * Gets players on a specific team.
   */
  getPlayersByTeam(teamID: TeamID): readonly Player[] {
    return this.playerService.getByTeam(teamID);
  }

  /**
   * Gets players in a specific squad.
   */
  getPlayersBySquad(teamID: TeamID, squadID: SquadID): readonly Player[] {
    return this.playerService.getBySquad(teamID, squadID);
  }

  // ===========================================================================
  // Squad Lookups
  // ===========================================================================

  /**
   * Gets a squad by team and squad ID.
   */
  getSquad(teamID: TeamID, squadID: SquadID): Squad | null {
    return this.squadService.getByID(teamID, squadID);
  }

  /**
   * Gets all squads for a team.
   */
  getSquadsByTeam(teamID: TeamID): readonly Squad[] {
    return this.squadService.getByTeam(teamID);
  }

  // ===========================================================================
  // Admin Checks
  // ===========================================================================

  /**
   * Checks if a player has a specific permission.
   */
  hasPermission(id: SteamID | EOSID, permission: string): boolean {
    return this.adminService.hasPermission(id, permission);
  }

  /**
   * Gets permissions for a player.
   */
  getPermissions(id: SteamID | EOSID): ReadonlySet<string> | null {
    return this.adminService.getPermissions(id);
  }

  // ===========================================================================
  // Lifecycle Management
  // ===========================================================================

  /**
   * Starts the server.
   *
   * Connects to RCON, starts the log parser, loads admin lists,
   * performs initial state fetch, and starts update scheduler.
   *
   * @returns Result indicating success or failure
   */
  async start(): Promise<Result<void, SquadServerError>> {
    if (this.state !== ServerStateEnum.CREATED && this.state !== ServerStateEnum.STOPPED) {
      return Err(
        new InvalidStateError(
          `Cannot start server in state: ${this.state}`,
          { currentState: this.state },
        ),
      );
    }

    this.state = ServerStateEnum.STARTING;
    this.emit(ServerEventType.SERVER_STARTING, { time: new Date() });

    this.log.info('Starting SquadServer...');

    try {
      // 1. Connect RCON
      this.log.debug('Connecting to RCON...');
      await this.rcon.connect();

      // 2. Load admin lists
      this.log.debug('Loading admin lists...');
      const adminResult = await this.adminService.refresh();
      if (!adminResult.ok) {
        this.log.warn(`Failed to load admin lists: ${adminResult.error.message}`);
        // Non-fatal, continue
      }

      // 3. Start log parser
      this.log.debug('Starting log parser...');
      const logResult = await this.logParser.watch();
      if (!logResult.ok) {
        throw new ConnectionError(
          `Failed to start log parser: ${logResult.error.message}`,
          { logDir: this.options.logReader.logDir },
          logResult.error,
        );
      }

      // 4. Initial state fetch
      this.log.debug('Fetching initial state...');
      await this.performInitialFetch();

      // 5. Start update scheduler
      this.scheduler.startAll();

      this.state = ServerStateEnum.RUNNING;

      this.emit(ServerEventType.SERVER_READY, {
        time: new Date(),
        playerCount: this.playerCount,
        currentLayer: this.currentLayer,
      });

      this.log.info('SquadServer started successfully');
      return Ok(undefined);
    } catch (error) {
      this.state = ServerStateEnum.ERROR;

      const serverError =
        error instanceof SquadServerError
          ? error
          : new ConnectionError(
              `Failed to start server: ${error instanceof Error ? error.message : String(error)}`,
              undefined,
              error instanceof Error ? error : undefined,
            );

      this.emit(ServerEventType.SERVER_ERROR, {
        time: new Date(),
        error: serverError,
        recoverable: serverError.recoverable,
      });

      this.log.error('Failed to start SquadServer', serverError);
      return Err(serverError);
    }
  }

  /**
   * Stops the server gracefully.
   *
   * Stops the scheduler, disconnects log parser and RCON,
   * and clears all state.
   *
   * @param reason - Reason for stopping
   * @returns Result indicating success or failure
   */
  async stop(reason = 'Shutdown requested'): Promise<Result<void, SquadServerError>> {
    if (this.state !== ServerStateEnum.RUNNING && this.state !== ServerStateEnum.ERROR) {
      return Err(
        new InvalidStateError(
          `Cannot stop server in state: ${this.state}`,
          { currentState: this.state },
        ),
      );
    }

    this.state = ServerStateEnum.STOPPING;
    this.emit(ServerEventType.SERVER_STOPPING, { time: new Date(), reason });

    this.log.info(`Stopping SquadServer: ${reason}`);

    try {
      // 1. Stop scheduler
      this.scheduler.stopAll();

      // 2. Stop log parser
      await this.logParser.unwatch();

      // 3. Disconnect RCON
      await this.rcon.disconnect();

      // 4. Clear state
      this.playerService.clear();
      this.squadService.clear();
      this.layerService.clear();
      this.adminService.clear();
      this.serverInfo = null;

      this.state = ServerStateEnum.STOPPED;
      this.emit(ServerEventType.SERVER_STOPPED, { time: new Date() });

      this.log.info('SquadServer stopped');
      return Ok(undefined);
    } catch (error) {
      this.state = ServerStateEnum.ERROR;

      const serverError = new SquadServerError(
        ErrorCode.UNKNOWN,
        `Error during shutdown: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        error instanceof Error ? error : undefined,
      );

      this.log.error('Error during shutdown', serverError);
      return Err(serverError);
    }
  }

  /**
   * Forces an immediate stop without waiting for graceful shutdown.
   */
  forceStop(): void {
    this.log.warn('Force stopping SquadServer');

    this.scheduler.stopAll();
    this.rcon.destroy();
    this.removeAllListeners();

    this.state = ServerStateEnum.STOPPED;
  }

  // ===========================================================================
  // RCON Commands
  // ===========================================================================

  /**
   * Broadcasts a message to all players.
   */
  async broadcast(message: string): Promise<Result<void, SquadServerError>> {
    if (!this.isRunning()) {
      return Err(new InvalidStateError('Server is not running'));
    }

    const result = await this.rcon.broadcast(message);
    if (!result.ok) {
      return Err(
        new SquadServerError(
          ErrorCode.COMMAND_FAILED,
          `Broadcast failed: ${result.error.message}`,
          { message },
          result.error,
        ),
      );
    }

    return Ok(undefined);
  }

  /**
   * Warns a player.
   */
  async warn(
    playerId: SteamID | EOSID | PlayerID | string,
    message: string,
  ): Promise<Result<void, SquadServerError>> {
    if (!this.isRunning()) {
      return Err(new InvalidStateError('Server is not running'));
    }

    const result = await this.rcon.warn(playerId, message);
    if (!result.ok) {
      return Err(
        new SquadServerError(
          ErrorCode.COMMAND_FAILED,
          `Warn failed: ${result.error.message}`,
          { playerId, message },
          result.error,
        ),
      );
    }

    return Ok(undefined);
  }

  /**
   * Kicks a player.
   */
  async kick(
    playerId: SteamID | EOSID | PlayerID | string,
    reason: string,
  ): Promise<Result<void, SquadServerError>> {
    if (!this.isRunning()) {
      return Err(new InvalidStateError('Server is not running'));
    }

    const result = await this.rcon.kick(playerId, reason);
    if (!result.ok) {
      return Err(
        new SquadServerError(
          ErrorCode.COMMAND_FAILED,
          `Kick failed: ${result.error.message}`,
          { playerId, reason },
          result.error,
        ),
      );
    }

    return Ok(undefined);
  }

  /**
   * Bans a player.
   */
  async ban(
    playerId: SteamID | EOSID | PlayerID | string,
    duration: string | number,
    reason: string,
  ): Promise<Result<void, SquadServerError>> {
    if (!this.isRunning()) {
      return Err(new InvalidStateError('Server is not running'));
    }

    const result = await this.rcon.ban(playerId, duration, reason);
    if (!result.ok) {
      return Err(
        new SquadServerError(
          ErrorCode.COMMAND_FAILED,
          `Ban failed: ${result.error.message}`,
          { playerId, duration, reason },
          result.error,
        ),
      );
    }

    return Ok(undefined);
  }

  /**
   * Executes a raw RCON command.
   */
  async execute(command: string): Promise<Result<string, SquadServerError>> {
    if (!this.isRunning()) {
      return Err(new InvalidStateError('Server is not running'));
    }

    const result = await this.rcon.execute(command);
    if (!result.ok) {
      return Err(
        new SquadServerError(
          ErrorCode.COMMAND_FAILED,
          `Command failed: ${result.error.message}`,
          { command },
          result.error,
        ),
      );
    }

    return Ok(result.value);
  }

  // ===========================================================================
  // Private: Initialization
  // ===========================================================================

  /**
   * Creates the appropriate log reader based on configuration.
   */
  private createLogReader(
    options: SquadServerOptions,
  ): TailLogReader | FtpLogReader | SftpLogReader {
    const { logReader } = options;

    switch (logReader.mode) {
      case 'tail':
        return new TailLogReader({
          logDir: logReader.logDir,
          ...(logReader.filename !== undefined && { filename: logReader.filename }),
        });

      case 'ftp':
        if (!logReader.host || !logReader.user || !logReader.password) {
          throw new Error('FTP log reader requires host, user, and password');
        }
        return new FtpLogReader({
          logDir: logReader.logDir,
          ...(logReader.filename !== undefined && { filename: logReader.filename }),
          ftp: {
            host: logReader.host,
            port: logReader.port ?? 21,
            username: logReader.user,
            password: logReader.password,
          },
        });

      case 'sftp':
        if (!logReader.host || !logReader.user || !logReader.password) {
          throw new Error('SFTP log reader requires host, user, and password');
        }
        return new SftpLogReader({
          logDir: logReader.logDir,
          ...(logReader.filename !== undefined && { filename: logReader.filename }),
          sftp: {
            host: logReader.host,
            port: logReader.port ?? 22,
            username: logReader.user,
            password: logReader.password,
          },
        });

      default:
        throw new Error(`Unknown log reader mode: ${logReader.mode}`);
    }
  }

  /**
   * Sets up scheduled update tasks.
   */
  private setupScheduledTasks(intervals?: Partial<UpdateIntervals>): void {
    const config = {
      playerList: intervals?.playerList ?? DefaultIntervals.playerList,
      squadList: intervals?.squadList ?? DefaultIntervals.squadList,
      layerInfo: intervals?.layerInfo ?? DefaultIntervals.layerInfo,
      adminList: intervals?.adminList ?? DefaultIntervals.adminList,
    };

    this.scheduler.register({
      name: 'playerList',
      interval: config.playerList,
      enabled: true,
      execute: async () => {
        await this.updatePlayerList();
      },
    });

    this.scheduler.register({
      name: 'squadList',
      interval: config.squadList,
      enabled: true,
      execute: async () => {
        await this.updateSquadList();
      },
    });

    this.scheduler.register({
      name: 'layerInfo',
      interval: config.layerInfo,
      enabled: true,
      execute: async () => {
        await this.updateLayerInfo();
      },
    });

    this.scheduler.register({
      name: 'adminList',
      interval: config.adminList,
      enabled: true,
      execute: async () => {
        await this.adminService.refresh();
      },
    });
  }

  /**
   * Performs initial state fetch after connection.
   */
  private async performInitialFetch(): Promise<void> {
    // Small delay to ensure server is ready
    await new Promise((resolve) => setTimeout(resolve, Timings.INITIAL_FETCH_DELAY));

    // Fetch all data in parallel
    await Promise.all([
      this.updatePlayerList(),
      this.updateSquadList(),
      this.updateLayerInfo(),
    ]);
  }

  // ===========================================================================
  // Private: State Updates
  // ===========================================================================

  /**
   * Updates the player list from RCON.
   */
  private async updatePlayerList(): Promise<void> {
    const result = await this.rcon.getPlayers();
    if (!result.ok) {
      this.log.warn(`Failed to update player list: ${result.error.message}`);
      return;
    }

    const changes = this.playerService.updateFromRcon(result.value);

    // Emit state change events
    for (const change of changes) {
      if (change.type === 'updated' && change.previous) {
        const player = change.player;
        const previous = change.previous;

        // Team change
        if (player.teamID !== previous.teamID) {
          this.emit(ServerEventType.PLAYER_TEAM_CHANGE, {
            player,
            oldTeamID: previous.teamID,
            newTeamID: player.teamID,
            time: new Date(),
          });
        }

        // Squad change
        if (player.squadID !== previous.squadID) {
          this.emit(ServerEventType.PLAYER_SQUAD_CHANGE, {
            player,
            oldSquadID: previous.squadID,
            newSquadID: player.squadID,
            time: new Date(),
          });
        }

        // Role change
        if (player.role !== previous.role) {
          this.emit(ServerEventType.PLAYER_ROLE_CHANGE, {
            player,
            oldRole: previous.role,
            newRole: player.role,
            time: new Date(),
          });
        }

        // Leader change
        if (player.isSquadLeader !== previous.isSquadLeader) {
          this.emit(ServerEventType.PLAYER_LEADER_CHANGE, {
            player,
            wasLeader: previous.isSquadLeader,
            isLeader: player.isSquadLeader,
            time: new Date(),
          });
        }
      }
    }
  }

  /**
   * Updates the squad list from RCON.
   */
  private async updateSquadList(): Promise<void> {
    const result = await this.rcon.getSquads();
    if (!result.ok) {
      this.log.warn(`Failed to update squad list: ${result.error.message}`);
      return;
    }

    this.squadService.updateFromRcon(result.value);
  }

  /**
   * Updates layer information from RCON.
   */
  private async updateLayerInfo(): Promise<void> {
    const [currentResult, nextResult] = await Promise.all([
      this.rcon.getCurrentMap(),
      this.rcon.getNextMap(),
    ]);

    if (currentResult.ok) {
      this.layerService.updateCurrent(currentResult.value);
    } else {
      this.log.warn(`Failed to get current layer: ${currentResult.error.message}`);
    }

    if (nextResult.ok) {
      this.layerService.updateNext(nextResult.value);
    } else {
      this.log.trace(`Failed to get next layer: ${nextResult.error.message}`);
    }
  }

  // ===========================================================================
  // Private: Event Handlers
  // ===========================================================================

  /**
   * Sets up RCON event handlers.
   * 
   * Note: Many RCON events require transformation to match SquadEventMap.
   * The RCON package emits raw events which need to be enriched with
   * player data from our services.
   */
  private setupRconEventHandlers(): void {
    // Chat messages - need to be transformed to include full Player object
    // For now, we emit the raw event but this needs proper enrichment
    // TODO: Properly transform RconChatMessageEvent -> ChatMessageEvent
    this.rcon.on('CHAT_MESSAGE', (event) => {
      // Try to enrich with player data
      const player = this.playerService.getByEOSID(event.eosID);
      if (player) {
        this.emit('CHAT_MESSAGE', {
          time: event.timestamp,
          raw: event.raw,
          player,
          channel: event.channel,
          message: event.message,
        });
      }
      // If player not found, event is dropped (player may have disconnected)
    });

    // Admin cam events - transform to AdminCameraEvent
    this.rcon.on('ADMIN_CAM_ENTERED', (event) => {
      this.adminService.setAdminCamStatus(event.eosID, true);
      
      // Try to get full player info
      const player = this.playerService.getByEOSID(event.eosID);
      if (player) {
        this.emit('ADMIN_CAMERA', {
          time: event.timestamp,
          raw: event.raw,
          player,
          entering: true,
        });
      }
    });

    this.rcon.on('ADMIN_CAM_EXITED', (event) => {
      this.adminService.setAdminCamStatus(event.eosID, false);
      
      const player = this.playerService.getByEOSID(event.eosID);
      if (player) {
        this.emit('ADMIN_CAMERA', {
          time: event.timestamp,
          raw: event.raw,
          player,
          entering: false,
        });
      }
    });

    // Player warned - need to transform to include full player
    this.rcon.on('PLAYER_WARNED', (event) => {
      // Can't emit without player info - would need to match by name
      this.log.debug(`Player warned: ${event.playerName} - ${event.reason}`);
      // TODO: Implement player lookup by name and emit PLAYER_WARNED
    });

    // Player kicked - need to transform
    this.rcon.on('PLAYER_KICKED', (event) => {
      const player = this.playerService.getByEOSID(event.eosID);
      if (player) {
        this.emit('PLAYER_KICKED', {
          time: event.timestamp,
          raw: event.raw,
          player,
          reason: '', // RCON event doesn't include reason
          admin: null,
        });
      }
    });

    // Player banned - need to transform
    this.rcon.on('PLAYER_BANNED', (event) => {
      this.emit('PLAYER_BANNED', {
        time: event.timestamp,
        raw: event.raw,
        steamID: event.steamID,
        eosID: event.eosID,
        name: event.playerName,
        reason: '', // Not provided in RCON event
        duration: 0, // Parse from interval string if needed
        admin: null,
      });
    });

    // Squad created - need to transform
    this.rcon.on('SQUAD_CREATED', (event) => {
      const squadID = asSquadID(event.squadID);
      if (!squadID) return;

      // Get player and infer team from their team assignment
      const player = this.playerService.getByEOSID(event.eosID);
      const teamID = player?.teamID ?? asTeamID(1); // Default to team 1 if unknown

      if (teamID) {
        this.squadService.addSquad({
          squadID,
          teamID,
          name: event.squadName,
          size: 1,
          locked: false,
          creatorName: event.playerName,
          creatorEOSID: event.eosID,
          creatorSteamID: event.steamID,
        });

        if (player && player.teamID !== null) {
          this.emit('SQUAD_CREATED', {
            time: event.timestamp,
            raw: event.raw,
            player,
            squadName: event.squadName,
            squadID: event.squadID,
            teamID: player.teamID,
          });
        }
      }
    });

    // Handle connection events
    this.rcon.on('connected', () => {
      this.emit('RCON_CONNECTED', {
        time: new Date(),
        raw: '',
        host: this.options.rcon.host,
        port: this.options.rcon.port,
        reconnect: false, // TODO: track reconnection state
      });
    });

    this.rcon.on('disconnected', (event) => {
      this.emit('RCON_DISCONNECTED', {
        time: new Date(),
        raw: '',
        reason: event.reason,
        willReconnect: true, // TODO: get from RCON client config
      });
    });

    this.rcon.on('error', () => {
      this.emit('RCON_ERROR', {
        time: new Date(),
        raw: '',
        error: new Error('RCON connection error'),
        command: null,
        fatal: false,
      });
    });
  }

  /**
   * Sets up log parser event handlers.
   */
  private setupLogParserEventHandlers(): void {
    // Player lifecycle events
    this.logParser.on('PLAYER_CONNECTED', (event) => {
      this.playerService.updateFromPartial(event.player);
      this.emit('PLAYER_CONNECTED', event);
    });

    this.logParser.on('PLAYER_DISCONNECTED', (event) => {
      this.emit('PLAYER_DISCONNECTED', event);
    });

    this.logParser.on('PLAYER_JOIN_SUCCEEDED', (event) => {
      this.playerService.updateFromPartial(event.player);
      this.emit('PLAYER_JOIN_SUCCEEDED', event);
    });

    this.logParser.on('PLAYER_POSSESS', (event) => {
      this.emit('PLAYER_POSSESS', event);
    });

    this.logParser.on('PLAYER_UNPOSSESS', (event) => {
      this.emit('PLAYER_UNPOSSESS', event);
    });

    // Combat events
    this.logParser.on('PLAYER_DAMAGED', (event) => {
      this.emit('PLAYER_DAMAGED', event);
    });

    this.logParser.on('PLAYER_WOUNDED', (event) => {
      this.emit('PLAYER_WOUNDED', event);
    });

    this.logParser.on('PLAYER_DIED', (event) => {
      this.emit('PLAYER_DIED', event);
    });

    this.logParser.on('PLAYER_REVIVED', (event) => {
      this.emit('PLAYER_REVIVED', event);
    });

    this.logParser.on('DEPLOYABLE_DAMAGED', (event) => {
      this.emit('DEPLOYABLE_DAMAGED', event);
    });

    // Game events
    this.logParser.on('NEW_GAME', (event) => {
      // Clear admin cam tracking on new game
      this.adminService.clearAdminCamTracking();

      // Update layer
      if (event.layer) {
        this.layerService.setCurrentLayer(event.layer);
      }

      this.emit('NEW_GAME', event);
    });

    this.logParser.on('ROUND_ENDED', (event) => {
      this.emit('ROUND_ENDED', event);
    });

    this.logParser.on('ROUND_TICKETS', (event) => {
      this.emit('ROUND_TICKETS', event);
    });

    this.logParser.on('ROUND_WINNER', (event) => {
      this.emit('ROUND_WINNER', event);
    });

    this.logParser.on('SERVER_TICK_RATE', (event) => {
      this.emit('SERVER_TICK_RATE', event);
    });

    // Admin events
    this.logParser.on('ADMIN_BROADCAST', (event) => {
      this.emit('ADMIN_BROADCAST', event);
    });
  }
}

import {
  ConfigLoader,
  type RootConfig,
  type ServerConfig,
} from '@squadscript/config';
import {
  Logger,
  LogLevel,
  parseLogLevel,
} from '@squadscript/logger';
import { Socket } from 'node:net';

import { SquadServer } from './server.js';
import type { SquadServerOptions } from './types.js';
import { createDatabase } from './db/index.js';
import { runMigrations } from './db/migrate.js';
import { createApi } from './api/index.js';
import { MetricsCollector } from './metrics/collector.js';
import { setupBroadcaster } from './api/websocket/broadcaster.js';
import { AuthService } from './api/modules/auth/service.js';

const DEFAULT_CONFIG_PATH = '/app/config.json';
const DEFAULT_RETRY_MS = 5000;
const DEFAULT_HEALTH_PORT = 3002;
const DEFAULT_API_PORT = 3001;
const MAX_HEALTH_PORT_TRIES = 10;

function isPortOpen(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket();
    let settled = false;

    const finalize = (open: boolean) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(open);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finalize(true));
    socket.once('timeout', () => finalize(false));
    socket.once('error', () => finalize(false));
    socket.once('close', () => finalize(false));

    socket.connect(port, host);
  });
}

function mapConfigToOptions(config: ServerConfig): SquadServerOptions {
  const mappedLogReader: SquadServerOptions['logReader'] =
    config.logReader.mode === 'ftp' || config.logReader.mode === 'sftp'
      ? {
          mode: config.logReader.mode,
          logDir: config.logReader.logDir,
          ...(config.logReader.filename !== undefined && {
            filename: config.logReader.filename,
          }),
          ...(config.logReader.ftp?.host !== undefined && {
            host: config.logReader.ftp.host,
          }),
          ...(config.logReader.ftp?.port !== undefined && {
            port: config.logReader.ftp.port,
          }),
          ...(config.logReader.ftp?.username !== undefined && {
            user: config.logReader.ftp.username,
          }),
          ...(config.logReader.ftp?.password !== undefined && {
            password: config.logReader.ftp.password,
          }),
        }
      : {
          mode: config.logReader.mode,
          logDir: config.logReader.logDir,
          ...(config.logReader.filename !== undefined && {
            filename: config.logReader.filename,
          }),
        };

  return {
    id: String(config.id),
    ...(config.name !== undefined && { name: config.name }),
    rcon: {
      host: config.rcon.host,
      port: config.rcon.port,
      password: config.rcon.password,
    },
    logReader: mappedLogReader,
    ...(config.adminLists !== undefined && {
      adminLists: config.adminLists.map((entry: { type: string; source: string }) => ({
        type: entry.type === 'local' ? 'local' : 'remote',
        source: entry.source,
      })),
    }),
  };
}

function resolveFirstServer(config: RootConfig | ServerConfig): ServerConfig {
  if ('servers' in config) {
    if (config.servers.length === 0) {
      throw new Error('Config must include at least one server entry');
    }
    return config.servers[0]!;
  }

  return config;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const level = parseLogLevel(process.env.LOG_LEVEL ?? 'info') ?? LogLevel.INFO;
  const logger = new Logger({ defaultLevel: level });
  const log = logger.child('runtime');

  const configPath = process.env.SQUADSCRIPT_CONFIG ?? DEFAULT_CONFIG_PATH;
  const retryMs = Number(process.env.SQUADSCRIPT_RETRY_MS ?? DEFAULT_RETRY_MS);
  const rconHostOverride = process.env.SQUADSCRIPT_RCON_HOST;
  const rconPortOverride = process.env.SQUADSCRIPT_RCON_PORT;
  const rconPasswordOverride = process.env.SQUADSCRIPT_RCON_PASSWORD;
  const logDirOverride = process.env.SQUADSCRIPT_LOG_DIR;
  const healthPort = Number(
    process.env.SQUADSCRIPT_HEALTH_PORT ?? DEFAULT_HEALTH_PORT,
  );

  let server: SquadServer | null = null;
  let configLoaded = false;
  let ready = false;

  let selectedHealthPort: number | null = null;

  for (let offset = 0; offset < MAX_HEALTH_PORT_TRIES; offset += 1) {
    const candidatePort = healthPort + offset;

    try {
      Bun.serve({
        port: candidatePort,
        hostname: '0.0.0.0',
        fetch(request) {
          const requestUrl =
            (request as { url?: string }).url ?? 'http://127.0.0.1/';
          const { pathname } = new URL(requestUrl);

          if (pathname === '/health') {
            return new Response(JSON.stringify({
              ok: true,
              configLoaded,
              ready,
              service: 'squadscript-server',
              healthPort: candidatePort,
            }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            });
          }

          return new Response('Not Found', { status: 404 });
        },
      });

      selectedHealthPort = candidatePort;
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isAddrInUse = message.includes('EADDRINUSE') || message.includes('in use');

      if (isAddrInUse) {
        continue;
      }

      throw error;
    }
  }

  if (selectedHealthPort === null) {
    throw new Error(
      `Failed to bind health endpoint: ports ${healthPort}-${healthPort + MAX_HEALTH_PORT_TRIES - 1} are unavailable`,
    );
  }

  log.info('Health endpoint ready', {
    url: `http://0.0.0.0:${selectedHealthPort}/health`,
  });

  const configLoader = new ConfigLoader({ logger });
  let serverOptions: SquadServerOptions | null = null;

  while (serverOptions === null) {
    const loadedConfig = await configLoader.loadConfig(configPath);

    if (!loadedConfig.ok) {
      log.error(
        `Failed to load configuration at ${configPath}, retrying in ${retryMs}ms: ${loadedConfig.error.formatDetails()}`,
      );
      await sleep(retryMs);
      continue;
    }

    const serverConfig = resolveFirstServer(loadedConfig.value);
    const mappedOptions = mapConfigToOptions(serverConfig);
    serverOptions = {
      ...mappedOptions,
      rcon: {
        ...mappedOptions.rcon,
        ...(rconHostOverride !== undefined && { host: rconHostOverride }),
        ...(rconPortOverride !== undefined && { port: Number(rconPortOverride) }),
        ...(rconPasswordOverride !== undefined && { password: rconPasswordOverride }),
      },
      ...(logDirOverride !== undefined && {
        logReader: {
          ...mappedOptions.logReader,
          logDir: logDirOverride,
        },
      }),
    };
    configLoaded = true;
  }

  let rconWaitCycles = 0;
  while (!(await isPortOpen(serverOptions.rcon.host, serverOptions.rcon.port))) {
    rconWaitCycles += 1;
    log.info(
      `Waiting for RCON endpoint ${serverOptions.rcon.host}:${serverOptions.rcon.port}...`,
    );

    if (rconWaitCycles % 12 === 0) {
      log.warn(
        `RCON endpoint is still unavailable. Verify SQUAD_RCONPORT and SQUAD_RCON_PASSWORD are set and match SQUADSCRIPT_RCON_PORT / SQUADSCRIPT_RCON_PASSWORD.`,
      );
    }

    await sleep(retryMs);
  }

  while (!ready) {
    const instance = new SquadServer(serverOptions, logger);
    const startResult = await instance.start();

    if (startResult.ok) {
      server = instance;
      ready = true;
      log.info('SquadScript server started successfully', {
        serverId: serverOptions.id,
        serverName: serverOptions.name ?? serverOptions.id,
      });
      break;
    }

    log.error(
      `Failed to start SquadScript server, retrying in ${retryMs}ms: ${startResult.error.message}`,
    );

    await instance.stop();

    await sleep(retryMs);
  }

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    log.info(`Received ${signal}, shutting down`);

    if (metricsCollector !== null) {
      metricsCollector.stop();
    }

    if (server !== null) {
      const stopResult = await server.stop();
      if (!stopResult.ok) {
        log.error(`Failed to stop server cleanly: ${stopResult.error.message}`);
      }
    }

    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  // =========================================================================
  // Database & API Initialization
  // =========================================================================

  const apiPort = Number(process.env.SQUADSCRIPT_API_PORT ?? DEFAULT_API_PORT);
  let metricsCollector: MetricsCollector | null = null;

  try {
    // 1. Initialize database and run migrations
    log.info('Initializing database...');
    const db = createDatabase();

    try {
      await runMigrations();
      log.info('Database migrations applied successfully');
    } catch (migrationError) {
      log.warn(`Database migrations failed (non-fatal): ${migrationError instanceof Error ? migrationError.message : String(migrationError)}`);
    }

    // 2. Ensure default admin user exists
    await AuthService.ensureDefaultAdmin(db);

    // 3. Start metrics collector
    metricsCollector = new MetricsCollector(server!, db);
    metricsCollector.start();
    log.info('Metrics collector started');

    // 4. Create and start API server
    const api = createApi(server!, db, metricsCollector);
    api.listen(apiPort);
    log.info('API server started', { port: apiPort });

    // 5. Set up WebSocket event broadcaster
    setupBroadcaster(server!, metricsCollector);
    log.info('WebSocket broadcaster initialized');
  } catch (apiError) {
    log.error(`Failed to start API server (non-fatal): ${apiError instanceof Error ? apiError.message : String(apiError)}`);
  }

  await new Promise(() => {
    // Keep process running
  });
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});

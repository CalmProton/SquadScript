import {
  ConfigLoader,
  type RootConfig,
  type ServerConfig,
} from '@squadscript/config';
import { Logger, LogLevel, parseLogLevel } from '@squadscript/logger';

import { SquadServer } from './server.js';
import type { SquadServerOptions } from './types.js';

const DEFAULT_CONFIG_PATH = '/app/config.json';
const DEFAULT_RETRY_MS = 5000;
const DEFAULT_HEALTH_PORT = 8080;

function mapConfigToOptions(config: ServerConfig): SquadServerOptions {
  const mappedLogReader: SquadServerOptions['logReader'] = {
    mode: config.logReader.mode,
    logDir: config.logReader.logDir,
    ...(config.logReader.filename !== undefined && {
      filename: config.logReader.filename,
    }),
  };

  if (config.logReader.mode === 'ftp' || config.logReader.mode === 'sftp') {
    mappedLogReader.host = config.logReader.ftp?.host;
    mappedLogReader.port = config.logReader.ftp?.port;
    mappedLogReader.user = config.logReader.ftp?.username;
    mappedLogReader.password = config.logReader.ftp?.password;
  }

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
      adminLists: config.adminLists.map((entry) => ({
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
    return config.servers[0];
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
  const healthPort = Number(
    process.env.SQUADSCRIPT_HEALTH_PORT ?? DEFAULT_HEALTH_PORT,
  );

  const configLoader = new ConfigLoader({ logger });

  const loadedConfig = await configLoader.loadConfig(configPath);
  if (!loadedConfig.ok) {
    log.error('Failed to load configuration', {
      path: configPath,
      error: loadedConfig.error.formatDetails(),
    });
    process.exit(1);
  }

  const serverConfig = resolveFirstServer(loadedConfig.value);
  const serverOptions = mapConfigToOptions(serverConfig);

  let server: SquadServer | null = null;
  let ready = false;

  Bun.serve({
    port: healthPort,
    hostname: '0.0.0.0',
    fetch(request) {
      const { pathname } = new URL(request.url);

      if (pathname === '/health') {
        return new Response(JSON.stringify({
          ok: ready,
          service: 'squadscript-server',
        }), {
          status: ready ? 200 : 503,
          headers: { 'content-type': 'application/json' },
        });
      }

      return new Response('Not Found', { status: 404 });
    },
  });

  log.info('Health endpoint ready', {
    url: `http://0.0.0.0:${healthPort}/health`,
  });

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

    log.error('Failed to start SquadScript server, retrying', {
      retryMs,
      error: startResult.error.message,
    });

    await sleep(retryMs);
  }

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    log.info(`Received ${signal}, shutting down`);

    if (server !== null) {
      const stopResult = await server.stop();
      if (!stopResult.ok) {
        log.error('Failed to stop server cleanly', {
          error: stopResult.error.message,
        });
      }
    }

    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await new Promise(() => {
    // Keep process running
  });
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});

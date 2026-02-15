declare module '@squadscript/config' {
  export interface ServerConfig {
    id: number;
    name?: string;
    rcon: {
      host: string;
      port: number;
      password: string;
    };
    logReader: {
      mode: 'tail' | 'ftp' | 'sftp';
      logDir: string;
      filename?: string;
      ftp?: {
        host: string;
        port?: number;
        username: string;
        password: string;
      };
    };
    adminLists?: Array<{
      type: 'local' | 'remote' | 'ftp';
      source: string;
    }>;
  }

  export interface RootConfig {
    servers: ServerConfig[];
  }

  export class ConfigLoader {
    constructor(options?: { logger?: unknown });
    loadConfig(
      path: string,
    ): Promise<
      | { ok: true; value: ServerConfig | RootConfig }
      | { ok: false; error: { formatDetails(): string } }
    >;
  }
}

declare module '@squadscript/logger' {
  export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    VERBOSE = 3,
    DEBUG = 4,
  }

  export function parseLogLevel(level: string): LogLevel | null;

  export class ModuleLogger {
    info(message: string, meta?: unknown): void;
    error(message: string, error?: Error): void;
    warn(message: string, meta?: unknown): void;
    debug(message: string, meta?: unknown): void;
  }

  export class Logger {
    constructor(config?: { defaultLevel?: LogLevel });
    child(module: string): ModuleLogger;
  }
}

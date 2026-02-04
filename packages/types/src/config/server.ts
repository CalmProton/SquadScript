/**
 * @squadscript/types
 *
 * Server configuration types.
 *
 * @module
 */

/**
 * Log reader mode.
 */
export type LogReaderMode = 'tail' | 'ftp' | 'sftp';

/**
 * FTP/SFTP connection configuration.
 */
export interface FtpConfig {
  /** FTP/SFTP host. */
  host: string;

  /** FTP/SFTP port (21 for FTP, 22 for SFTP). */
  port: number;

  /** Username for authentication. */
  username: string;

  /** Password for authentication. */
  password: string;

  /** Whether to use secure connection. */
  secure?: boolean;
}

/**
 * Log reader configuration.
 */
export interface LogReaderConfig {
  /** Reader mode. */
  mode: LogReaderMode;

  /** Path to log directory. */
  logDir: string;

  /** Specific log filename (optional). */
  filename?: string;

  /** FTP configuration (for ftp/sftp modes). */
  ftp?: FtpConfig;
}

/**
 * RCON connection configuration.
 */
export interface RconConfig {
  /** RCON host address. */
  host: string;

  /** RCON port. */
  port: number;

  /** RCON password. */
  password: string;

  /** Auto-reconnect on disconnect. */
  autoReconnect?: boolean;

  /** Delay between reconnection attempts (ms). */
  autoReconnectDelay?: number;

  /** Maximum reconnection attempts (0 = infinite). */
  maxReconnectAttempts?: number;

  /** Connection timeout (ms). */
  timeout?: number;
}

/**
 * Server configuration.
 */
export interface ServerConfig {
  /** Unique server ID. */
  id: number;

  /** Server display name. */
  name?: string;

  /** RCON configuration. */
  rcon: RconConfig;

  /** Log reader configuration. */
  logReader: LogReaderConfig;

  /** Admin list sources. */
  adminLists?: AdminListSource[];

  /** Connectors configuration. */
  connectors?: Record<string, ConnectorConfig>;

  /** Plugins configuration. */
  plugins?: PluginConfig[];

  /** Logging verbosity settings. */
  verbosity?: VerbosityConfig;
}

/**
 * Admin list source types.
 */
export type AdminListSourceType = 'local' | 'remote' | 'ftp';

/**
 * Admin list source configuration.
 */
export interface AdminListSource {
  /** Source type. */
  type: AdminListSourceType;

  /** Path or URL to the admin list. */
  source: string;

  /** Refresh interval in milliseconds (for remote/ftp). */
  refreshInterval?: number;
}

/**
 * Generic connector configuration.
 */
export interface ConnectorConfig {
  /** Connector type. */
  type: string;

  /** Connector-specific options. */
  [key: string]: unknown;
}

/**
 * Plugin configuration in server config.
 */
export interface PluginConfig {
  /** Plugin name/identifier. */
  plugin: string;

  /** Whether the plugin is enabled. */
  enabled: boolean;

  /** Plugin-specific options. */
  options?: Record<string, unknown>;

  /** Connectors to inject. */
  connectors?: Record<string, string>;
}

/**
 * Verbosity configuration.
 */
export interface VerbosityConfig {
  /** Default verbosity level. */
  default?: number;

  /** Module-specific verbosity levels. */
  [module: string]: number | undefined;
}

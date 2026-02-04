/**
 * @squadscript/log-parser
 *
 * FTP-based log reader for remote servers.
 *
 * Periodically fetches log file content from an FTP server and
 * delivers new lines since the last fetch.
 *
 * @module
 */

import type { Result } from '@squadscript/types';
import { Ok, Err } from '@squadscript/types';
import type { LogReader, LineCallback, LogReaderBaseOptions } from './base.js';
import { LogReaderError } from '../errors.js';

// =============================================================================
// Types
// =============================================================================

/**
 * FTP connection configuration.
 */
export interface FtpConfig {
  /** FTP server hostname. */
  readonly host: string;

  /** FTP server port. */
  readonly port: number;

  /** Username for authentication. */
  readonly username: string;

  /** Password for authentication. */
  readonly password: string;

  /** Whether to use secure (FTPS) connection. */
  readonly secure?: boolean;
}

/**
 * Options for FtpLogReader.
 */
export interface FtpLogReaderOptions extends LogReaderBaseOptions {
  /** FTP connection configuration. */
  readonly ftp: FtpConfig;

  /**
   * Interval in ms between fetches.
   * @default 5000
   */
  readonly fetchInterval?: number;

  /**
   * Maximum temp file size in bytes.
   * @default 50 * 1024 * 1024 (50MB)
   */
  readonly maxTempFileSize?: number;

  /**
   * Connection timeout in ms.
   * @default 30000
   */
  readonly timeout?: number;
}

// =============================================================================
// FtpLogReader Class
// =============================================================================

/**
 * FTP-based log reader for remote servers.
 *
 * This reader periodically connects to an FTP server, fetches new
 * content from the log file, and delivers new lines to the callback.
 *
 * Uses the basic-ftp library for FTP operations.
 *
 * @example
 * ```typescript
 * const reader = new FtpLogReader({
 *   logDir: '/logs',
 *   filename: 'SquadGame.log',
 *   ftp: {
 *     host: 'server.example.com',
 *     port: 21,
 *     username: 'user',
 *     password: 'pass',
 *   },
 *   fetchInterval: 5000,
 * });
 *
 * await reader.watch((line) => {
 *   console.log('New line:', line);
 * });
 * ```
 */
export class FtpLogReader implements LogReader {
  private readonly options: FtpLogReaderOptions;
  private readonly _filePath: string;
  private readonly fetchInterval: number;

  private callback: LineCallback | null = null;
  private fetchTimer: ReturnType<typeof setInterval> | null = null;
  private lastPosition = 0;
  private lineBuffer = '';
  private _isWatching = false;
  private isFetching = false;

  constructor(options: FtpLogReaderOptions) {
    this.options = options;
    const filename = options.filename ?? 'SquadGame.log';
    this._filePath = `${options.logDir}/${filename}`.replace(/\/+/g, '/');
    this.fetchInterval = options.fetchInterval ?? 5000;
  }

  /**
   * The full path to the log file being watched.
   */
  get filePath(): string {
    return this._filePath;
  }

  /**
   * Whether the reader is currently watching.
   */
  get isWatching(): boolean {
    return this._isWatching;
  }

  /**
   * Starts watching the log file via FTP.
   */
  async watch(callback: LineCallback): Promise<Result<void, LogReaderError>> {
    if (this._isWatching) {
      return Err(new LogReaderError(
        'ALREADY_WATCHING',
        `Already watching ${this._filePath}`,
        { filePath: this._filePath },
      ));
    }

    // Test connection
    const testResult = await this.testConnection();
    if (!testResult.ok) {
      return testResult;
    }

    this.callback = callback;
    this._isWatching = true;
    this.lastPosition = 0;
    this.lineBuffer = '';

    // Start periodic fetching
    this.fetchTimer = setInterval(() => {
      void this.fetchNewContent();
    }, this.fetchInterval);

    // Do initial fetch
    void this.fetchNewContent();

    return Ok(undefined);
  }

  /**
   * Stops watching the log file.
   */
  async unwatch(): Promise<Result<void, LogReaderError>> {
    if (!this._isWatching) {
      return Err(new LogReaderError(
        'NOT_WATCHING',
        'Not currently watching any file',
      ));
    }

    if (this.fetchTimer) {
      clearInterval(this.fetchTimer);
      this.fetchTimer = null;
    }

    this.callback = null;
    this._isWatching = false;
    this.lineBuffer = '';

    return Ok(undefined);
  }

  /**
   * Tests connection to the FTP server.
   */
  private async testConnection(): Promise<Result<void, LogReaderError>> {
    try {
      // Dynamic import to avoid loading FTP library until needed
      const { Client } = await import('basic-ftp');
      const client = new Client(this.options.timeout ?? 30000);

      try {
        await client.access({
          host: this.options.ftp.host,
          port: this.options.ftp.port,
          user: this.options.ftp.username,
          password: this.options.ftp.password,
          secure: this.options.ftp.secure ?? false,
        });

        // Check if file exists
        const list = await client.list(this.options.logDir);
        const filename = this.options.filename ?? 'SquadGame.log';
        const fileExists = list.some((item) => item.name === filename);

        if (!fileExists) {
          return Err(new LogReaderError(
            'FILE_NOT_FOUND',
            `Log file not found: ${this._filePath}`,
            { filePath: this._filePath },
          ));
        }

        return Ok(undefined);
      } finally {
        client.close();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('Login') || message.includes('auth')) {
        return Err(new LogReaderError(
          'AUTH_FAILED',
          `FTP authentication failed: ${message}`,
          { host: this.options.ftp.host },
          error instanceof Error ? error : undefined,
        ));
      }

      return Err(new LogReaderError(
        'CONNECTION_FAILED',
        `Failed to connect to FTP server: ${message}`,
        { host: this.options.ftp.host, port: this.options.ftp.port },
        error instanceof Error ? error : undefined,
      ));
    }
  }

  /**
   * Fetches new content from the FTP server.
   */
  private async fetchNewContent(): Promise<void> {
    // Prevent concurrent fetches
    if (this.isFetching || !this.callback) {
      return;
    }

    this.isFetching = true;

    try {
      const { Client } = await import('basic-ftp');
      const client = new Client(this.options.timeout ?? 30000);

      try {
        await client.access({
          host: this.options.ftp.host,
          port: this.options.ftp.port,
          user: this.options.ftp.username,
          password: this.options.ftp.password,
          secure: this.options.ftp.secure ?? false,
        });

        // Get file size
        const size = await client.size(this._filePath);

        // Detect log rotation
        if (size < this.lastPosition) {
          this.lastPosition = 0;
          this.lineBuffer = '';
        }

        // Read new content if available
        if (size > this.lastPosition) {
          // Create a writable stream to collect data
          const chunks: Buffer[] = [];
          const { Writable } = await import('node:stream');

          const writableStream = new Writable({
            write(chunk: Buffer, _encoding, callback) {
              chunks.push(chunk);
              callback();
            },
          });

          // Download from last position
          await client.downloadTo(writableStream, this._filePath, this.lastPosition);

          const content = Buffer.concat(chunks).toString('utf-8');
          this.lastPosition = size;
          this.processContent(content);
        }
      } finally {
        client.close();
      }
    } catch {
      // Ignore fetch errors, will retry on next interval
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Processes content and delivers complete lines to callback.
   */
  private processContent(content: string): void {
    if (!this.callback) return;

    // Add to line buffer
    this.lineBuffer += content;

    // Split into lines
    const lines = this.lineBuffer.split(/\r?\n/);

    // Keep the last incomplete line in the buffer
    this.lineBuffer = lines.pop() ?? '';

    // Deliver complete lines
    for (const line of lines) {
      if (line.length > 0) {
        this.callback(line);
      }
    }
  }
}

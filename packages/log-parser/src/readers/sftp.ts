/**
 * @squadscript/log-parser
 *
 * SFTP-based log reader for remote servers.
 *
 * Periodically fetches log file content from an SFTP server and
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
 * SFTP connection configuration.
 */
export interface SftpConfig {
  /** SFTP server hostname. */
  readonly host: string;

  /** SFTP server port. */
  readonly port: number;

  /** Username for authentication. */
  readonly username: string;

  /** Password for authentication. */
  readonly password: string;
}

/**
 * Options for SftpLogReader.
 */
export interface SftpLogReaderOptions extends LogReaderBaseOptions {
  /** SFTP connection configuration. */
  readonly sftp: SftpConfig;

  /**
   * Interval in ms between fetches.
   * @default 5000
   */
  readonly fetchInterval?: number;

  /**
   * Connection timeout in ms.
   * @default 30000
   */
  readonly timeout?: number;
}

// =============================================================================
// SftpLogReader Class
// =============================================================================

/**
 * SFTP-based log reader for remote servers.
 *
 * This reader periodically connects to an SFTP server, fetches new
 * content from the log file, and delivers new lines to the callback.
 *
 * Uses the ssh2-sftp-client library for SFTP operations.
 *
 * @example
 * ```typescript
 * const reader = new SftpLogReader({
 *   logDir: '/logs',
 *   filename: 'SquadGame.log',
 *   sftp: {
 *     host: 'server.example.com',
 *     port: 22,
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
export class SftpLogReader implements LogReader {
  private readonly options: SftpLogReaderOptions;
  private readonly _filePath: string;
  private readonly fetchInterval: number;

  private callback: LineCallback | null = null;
  private fetchTimer: ReturnType<typeof setInterval> | null = null;
  private lastPosition = 0;
  private lineBuffer = '';
  private _isWatching = false;
  private isFetching = false;

  constructor(options: SftpLogReaderOptions) {
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
   * Starts watching the log file via SFTP.
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
   * Tests connection to the SFTP server.
   */
  private async testConnection(): Promise<Result<void, LogReaderError>> {
    try {
      // Dynamic import to avoid loading SFTP library until needed
      const SftpClient = (await import('ssh2-sftp-client')).default;
      const client = new SftpClient();

      try {
        await client.connect({
          host: this.options.sftp.host,
          port: this.options.sftp.port,
          username: this.options.sftp.username,
          password: this.options.sftp.password,
          readyTimeout: this.options.timeout ?? 30000,
        });

        // Check if file exists
        const exists = await client.exists(this._filePath);
        if (!exists) {
          return Err(new LogReaderError(
            'FILE_NOT_FOUND',
            `Log file not found: ${this._filePath}`,
            { filePath: this._filePath },
          ));
        }

        return Ok(undefined);
      } finally {
        await client.end();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('authentication') || message.includes('password')) {
        return Err(new LogReaderError(
          'AUTH_FAILED',
          `SFTP authentication failed: ${message}`,
          { host: this.options.sftp.host },
          error instanceof Error ? error : undefined,
        ));
      }

      return Err(new LogReaderError(
        'CONNECTION_FAILED',
        `Failed to connect to SFTP server: ${message}`,
        { host: this.options.sftp.host, port: this.options.sftp.port },
        error instanceof Error ? error : undefined,
      ));
    }
  }

  /**
   * Fetches new content from the SFTP server.
   */
  private async fetchNewContent(): Promise<void> {
    // Prevent concurrent fetches
    if (this.isFetching || !this.callback) {
      return;
    }

    this.isFetching = true;

    try {
      const SftpClient = (await import('ssh2-sftp-client')).default;
      const client = new SftpClient();

      try {
        await client.connect({
          host: this.options.sftp.host,
          port: this.options.sftp.port,
          username: this.options.sftp.username,
          password: this.options.sftp.password,
          readyTimeout: this.options.timeout ?? 30000,
        });

        // Get file stats
        const stats = await client.stat(this._filePath);
        const size = stats.size;

        // Detect log rotation
        if (size < this.lastPosition) {
          this.lastPosition = 0;
          this.lineBuffer = '';
        }

        // Read new content if available
        if (size > this.lastPosition) {
          // Use createReadStream with start position for partial file read
          const bytesToRead = size - this.lastPosition;
          const chunks: Buffer[] = [];

          await new Promise<void>((resolve, reject) => {
            const stream = client.createReadStream(this._filePath, {
              start: this.lastPosition,
              end: this.lastPosition + bytesToRead - 1,
            });

            stream.on('data', (chunk: Buffer) => {
              chunks.push(chunk);
            });

            stream.on('end', () => {
              resolve();
            });

            stream.on('error', (err: Error) => {
              reject(err);
            });
          });

          const content = Buffer.concat(chunks).toString('utf-8');
          this.lastPosition = size;
          this.processContent(content);
        }
      } finally {
        await client.end();
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

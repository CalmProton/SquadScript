/**
 * @squadscript/log-parser
 *
 * Local file tail reader using native fs.watch.
 *
 * Watches a local log file and delivers new lines as they are appended.
 * Uses fs.watch for file change notifications with polling fallback.
 *
 * @module
 */

import { join } from 'node:path';
import { watch as fsWatch, type FSWatcher, existsSync } from 'node:fs';
import { open, stat, type FileHandle } from 'node:fs/promises';
import type { Result } from '@squadscript/types';
import { Ok, Err } from '@squadscript/types';
import type { LogReader, LineCallback, LogReaderBaseOptions } from './base.js';
import { LogReaderError } from '../errors.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for TailLogReader.
 */
export interface TailLogReaderOptions extends LogReaderBaseOptions {
  /**
   * Polling interval in ms for fallback mode.
   * Used when fs.watch events aren't reliable.
   * @default 1000
   */
  readonly pollInterval?: number;

  /**
   * Encoding for reading log file.
   * @default "utf-8"
   */
  readonly encoding?: BufferEncoding;

  /**
   * Whether to start reading from the end of the file.
   * If true, only new lines are delivered.
   * If false, all existing content is read first.
   * @default true
   */
  readonly startFromEnd?: boolean;
}

// =============================================================================
// TailLogReader Class
// =============================================================================

/**
 * Local file tail reader using native fs.watch with polling fallback.
 *
 * This reader watches a local log file and delivers new lines as they
 * are appended. It handles log rotation by detecting when the file
 * shrinks (which indicates rotation).
 *
 * @example
 * ```typescript
 * const reader = new TailLogReader({
 *   logDir: '/path/to/squad/logs',
 *   filename: 'SquadGame.log',
 * });
 *
 * await reader.watch((line) => {
 *   console.log('New line:', line);
 * });
 *
 * // Later...
 * await reader.unwatch();
 * ```
 */
export class TailLogReader implements LogReader {
  private readonly _filePath: string;
  private readonly pollInterval: number;
  private readonly encoding: BufferEncoding;
  private readonly startFromEnd: boolean;

  private callback: LineCallback | null = null;
  private watcher: FSWatcher | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private fileHandle: FileHandle | null = null;
  private filePosition = 0;
  private lineBuffer = '';
  private _isWatching = false;

  constructor(options: TailLogReaderOptions) {
    const filename = options.filename ?? 'SquadGame.log';
    this._filePath = join(options.logDir, filename);
    this.pollInterval = options.pollInterval ?? 1000;
    this.encoding = options.encoding ?? 'utf-8';
    this.startFromEnd = options.startFromEnd ?? true;
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
   * Starts watching the log file.
   */
  async watch(callback: LineCallback): Promise<Result<void, LogReaderError>> {
    if (this._isWatching) {
      return Err(new LogReaderError(
        'ALREADY_WATCHING',
        `Already watching ${this._filePath}`,
        { filePath: this._filePath },
      ));
    }

    // Check if file exists
    if (!existsSync(this._filePath)) {
      return Err(new LogReaderError(
        'FILE_NOT_FOUND',
        `Log file not found: ${this._filePath}`,
        { filePath: this._filePath },
      ));
    }

    try {
      // Open file for reading
      this.fileHandle = await open(this._filePath, 'r');

      // Get initial file size
      const stats = await stat(this._filePath);

      // Position at end if startFromEnd, otherwise at beginning
      this.filePosition = this.startFromEnd ? stats.size : 0;
      this.callback = callback;
      this.lineBuffer = '';

      // Start fs.watch
      this.watcher = fsWatch(this._filePath, { persistent: true }, (eventType) => {
        if (eventType === 'change') {
          void this.readNewContent();
        }
      });

      // Also use polling as a fallback (fs.watch can be unreliable)
      this.pollTimer = setInterval(() => {
        void this.readNewContent();
      }, this.pollInterval);

      this._isWatching = true;

      // If not starting from end, read existing content
      if (!this.startFromEnd) {
        await this.readNewContent();
      }

      return Ok(undefined);
    } catch (error) {
      // Cleanup on failure
      await this.cleanup();

      return Err(new LogReaderError(
        'WATCH_FAILED',
        `Failed to watch log file: ${this._filePath}`,
        { filePath: this._filePath },
        error instanceof Error ? error : undefined,
      ));
    }
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

    await this.cleanup();
    return Ok(undefined);
  }

  /**
   * Reads new content from the file and delivers lines to callback.
   */
  private async readNewContent(): Promise<void> {
    if (!this.fileHandle || !this.callback) {
      return;
    }

    try {
      // Get current file size
      const stats = await stat(this._filePath);
      const currentSize = stats.size;

      // Detect log rotation (file shrunk)
      if (currentSize < this.filePosition) {
        this.filePosition = 0;
        this.lineBuffer = '';
      }

      // Read new content
      if (currentSize > this.filePosition) {
        const bytesToRead = currentSize - this.filePosition;
        const buffer = Buffer.alloc(bytesToRead);

        const { bytesRead } = await this.fileHandle.read(
          buffer,
          0,
          bytesToRead,
          this.filePosition,
        );

        if (bytesRead > 0) {
          this.filePosition += bytesRead;
          const content = buffer.toString(this.encoding, 0, bytesRead);
          this.processContent(content);
        }
      }
    } catch {
      // File might be temporarily unavailable during rotation
      // Just skip this read cycle
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

  /**
   * Cleans up resources.
   */
  private async cleanup(): Promise<void> {
    // Stop watcher
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    // Stop polling
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    // Close file handle
    if (this.fileHandle) {
      try {
        await this.fileHandle.close();
      } catch {
        // Ignore close errors
      }
      this.fileHandle = null;
    }

    this.callback = null;
    this.lineBuffer = '';
    this._isWatching = false;
  }
}

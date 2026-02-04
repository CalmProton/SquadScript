/**
 * @squadscript/log-parser
 *
 * Abstract interface for log file readers.
 *
 * Log readers are responsible for watching log files (from various sources)
 * and delivering new lines to the parser. All readers implement this interface
 * to allow the parser to work with any source.
 *
 * @module
 */

import type { Result } from '@squadscript/types';
import type { LogReaderError } from '../errors.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Callback for receiving log lines.
 *
 * @param line - A single line from the log file (without line ending)
 */
export type LineCallback = (line: string) => void;

/**
 * Options common to all log readers.
 */
export interface LogReaderBaseOptions {
  /**
   * Directory containing log files.
   * For local readers, this is a filesystem path.
   * For remote readers, this is the remote path.
   */
  readonly logDir: string;

  /**
   * Specific log filename to watch.
   * If not specified, readers may use a default (e.g., "SquadGame.log").
   * @default "SquadGame.log"
   */
  readonly filename?: string | undefined;
}

/**
 * Abstract interface for log file readers.
 *
 * Implementations must handle:
 * - Connecting to the log source (filesystem, FTP, SFTP)
 * - Watching for new lines
 * - Delivering lines to the callback
 * - Graceful cleanup on unwatch
 *
 * @example
 * ```typescript
 * class MyReader implements LogReader {
 *   watch(callback: LineCallback): Promise<Result<void, LogReaderError>> {
 *     // Start watching and call callback for each new line
 *   }
 *
 *   unwatch(): Promise<Result<void, LogReaderError>> {
 *     // Stop watching and cleanup
 *   }
 *
 *   get isWatching(): boolean {
 *     return this._isWatching;
 *   }
 * }
 * ```
 */
export interface LogReader {
  /**
   * Starts watching the log file.
   *
   * The callback will be invoked for each new line read from the log.
   * Lines are delivered without trailing newlines.
   *
   * @param callback - Function to call for each new line
   * @returns Result indicating success or failure
   */
  watch(callback: LineCallback): Promise<Result<void, LogReaderError>>;

  /**
   * Stops watching the log file.
   *
   * Implementations should:
   * - Stop any file watchers or polling
   * - Close any connections (FTP, SFTP)
   * - Clean up resources
   *
   * @returns Result indicating success or failure
   */
  unwatch(): Promise<Result<void, LogReaderError>>;

  /**
   * Whether the reader is currently watching.
   */
  readonly isWatching: boolean;

  /**
   * The full path to the log file being watched.
   */
  readonly filePath: string;
}

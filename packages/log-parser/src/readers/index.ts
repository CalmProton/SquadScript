/**
 * @squadscript/log-parser
 *
 * Log reader exports and factory function.
 *
 * @module
 */

import type { LogReaderConfig } from '@squadscript/types';
import type { LogReader } from './base.js';
import { TailLogReader } from './tail.js';
import { FtpLogReader } from './ftp.js';
import { SftpLogReader } from './sftp.js';

// Re-export base types and implementations
export { type LogReader, type LineCallback, type LogReaderBaseOptions } from './base.js';
export { TailLogReader, type TailLogReaderOptions } from './tail.js';
export { FtpLogReader, type FtpLogReaderOptions, type FtpConfig } from './ftp.js';
export { SftpLogReader, type SftpLogReaderOptions, type SftpConfig } from './sftp.js';

/**
 * Creates a LogReader from a configuration object.
 *
 * This factory function creates the appropriate reader type based on
 * the `mode` field in the configuration.
 *
 * @param config - Log reader configuration
 * @returns Configured LogReader instance
 * @throws Error if configuration is invalid
 *
 * @example
 * ```typescript
 * const config = {
 *   mode: 'tail' as const,
 *   logDir: '/path/to/logs',
 *   filename: 'SquadGame.log',
 * };
 *
 * const reader = createLogReader(config);
 * ```
 */
export function createLogReader(config: LogReaderConfig): LogReader {
  switch (config.mode) {
    case 'tail':
      return new TailLogReader({
        logDir: config.logDir,
        filename: config.filename,
      });

    case 'ftp':
      if (!config.ftp) {
        throw new Error('FTP configuration required for FTP mode');
      }
      return new FtpLogReader({
        logDir: config.logDir,
        filename: config.filename,
        ftp: config.ftp,
      });

    case 'sftp':
      if (!config.ftp) {
        throw new Error('SFTP configuration required for SFTP mode');
      }
      return new SftpLogReader({
        logDir: config.logDir,
        filename: config.filename,
        sftp: config.ftp,
      });

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = config.mode;
      throw new Error(`Unknown log reader mode: ${_exhaustive}`);
    }
  }
}

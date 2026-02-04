/**
 * @squadscript/rcon
 *
 * Unit tests for error types.
 */

import { describe, it, expect } from 'bun:test';
import {
  RconError,
  ConnectionError,
  AuthenticationError,
  CommandError,
  ParseError,
  isRconError,
  isConnectionError,
  isAuthenticationError,
  isCommandError,
  isParseError,
  isRecoverableError,
} from '../src/errors.js';

describe('Errors', () => {
  describe('ConnectionError', () => {
    it('should create a connection refused error', () => {
      const err = ConnectionError.refused('127.0.0.1', 21114);

      expect(err).toBeInstanceOf(ConnectionError);
      expect(err).toBeInstanceOf(RconError);
      expect(err).toBeInstanceOf(Error);
      expect(err.code).toBe('CONNECTION_REFUSED');
      expect(err.host).toBe('127.0.0.1');
      expect(err.port).toBe(21114);
      expect(err.recoverable).toBe(true);
      expect(err.message).toContain('127.0.0.1:21114');
    });

    it('should create a timeout error', () => {
      const err = ConnectionError.timeout('example.com', 21114, 5000);

      expect(err.code).toBe('CONNECTION_TIMEOUT');
      expect(err.message).toContain('5000ms');
      expect(err.recoverable).toBe(true);
    });

    it('should create a not connected error', () => {
      const err = ConnectionError.notConnected();

      expect(err.code).toBe('NOT_CONNECTED');
      expect(err.recoverable).toBe(false);
    });

    it('should serialize to JSON', () => {
      const cause = new Error('Socket error');
      const err = ConnectionError.refused('127.0.0.1', 21114, cause);

      const json = err.toJSON();

      expect(json.code).toBe('CONNECTION_REFUSED');
      expect(json.host).toBe('127.0.0.1');
      expect(json.port).toBe(21114);
      expect(json.cause).toBe('Socket error');
      expect(json.recoverable).toBe(true);
    });
  });

  describe('AuthenticationError', () => {
    it('should create auth failed error', () => {
      const err = AuthenticationError.failed();

      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err.code).toBe('AUTH_FAILED');
      expect(err.recoverable).toBe(false);
    });

    it('should create auth timeout error', () => {
      const err = AuthenticationError.timeout(10000);

      expect(err.code).toBe('AUTH_TIMEOUT');
      expect(err.message).toContain('10000ms');
    });
  });

  describe('CommandError', () => {
    it('should create command timeout error', () => {
      const err = CommandError.timeout('ListPlayers', 5000);

      expect(err).toBeInstanceOf(CommandError);
      expect(err.code).toBe('COMMAND_TIMEOUT');
      expect(err.command).toBe('ListPlayers');
      expect(err.recoverable).toBe(true);
    });

    it('should create command aborted error', () => {
      const err = CommandError.aborted('ListSquads', 'Disconnected');

      expect(err.code).toBe('COMMAND_ABORTED');
      expect(err.command).toBe('ListSquads');
      expect(err.recoverable).toBe(false);
    });

    it('should create invalid command error', () => {
      const err = CommandError.invalid('BadCommand', 'Unknown command');

      expect(err.code).toBe('INVALID_COMMAND');
      expect(err.command).toBe('BadCommand');
    });

    it('should serialize to JSON with command info', () => {
      const err = CommandError.timeout('ListPlayers', 5000);

      const json = err.toJSON();

      expect(json.command).toBe('ListPlayers');
    });
  });

  describe('ParseError', () => {
    it('should create unexpected format error', () => {
      const err = ParseError.unexpectedFormat(
        'ShowCurrentMap',
        'map info',
        'Invalid response',
      );

      expect(err).toBeInstanceOf(ParseError);
      expect(err.code).toBe('UNEXPECTED_FORMAT');
      expect(err.command).toBe('ShowCurrentMap');
      expect(err.rawResponse).toBe('Invalid response');
      expect(err.recoverable).toBe(false);
    });

    it('should create missing field error', () => {
      const err = ParseError.missingField('ListPlayers', 'steamID', 'raw');

      expect(err.code).toBe('MISSING_FIELD');
      expect(err.message).toContain('steamID');
    });

    it('should create invalid ID error', () => {
      const err = ParseError.invalidId('SteamID', 'invalid');

      expect(err.code).toBe('INVALID_ID');
      expect(err.message).toContain('SteamID');
    });

    it('should truncate long responses', () => {
      const longResponse = 'x'.repeat(2000);
      const err = ParseError.unexpectedFormat('Cmd', 'expected', longResponse);

      expect(err.rawResponse?.length).toBeLessThan(1100);
      expect(err.rawResponse).toContain('...');
    });
  });

  describe('Type Guards', () => {
    it('isRconError should identify RCON errors', () => {
      expect(isRconError(ConnectionError.notConnected())).toBe(true);
      expect(isRconError(AuthenticationError.failed())).toBe(true);
      expect(isRconError(CommandError.timeout('cmd', 1000))).toBe(true);
      expect(isRconError(new Error('regular error'))).toBe(false);
      expect(isRconError(null)).toBe(false);
      expect(isRconError('string')).toBe(false);
    });

    it('isConnectionError should identify connection errors', () => {
      expect(isConnectionError(ConnectionError.notConnected())).toBe(true);
      expect(isConnectionError(AuthenticationError.failed())).toBe(false);
    });

    it('isAuthenticationError should identify auth errors', () => {
      expect(isAuthenticationError(AuthenticationError.failed())).toBe(true);
      expect(isAuthenticationError(ConnectionError.notConnected())).toBe(false);
    });

    it('isCommandError should identify command errors', () => {
      expect(isCommandError(CommandError.timeout('cmd', 1000))).toBe(true);
      expect(isCommandError(ConnectionError.notConnected())).toBe(false);
    });

    it('isParseError should identify parse errors', () => {
      expect(isParseError(ParseError.invalidId('SteamID', 'x'))).toBe(true);
      expect(isParseError(CommandError.timeout('cmd', 1000))).toBe(false);
    });

    it('isRecoverableError should check recoverability', () => {
      expect(isRecoverableError(ConnectionError.timeout('h', 1, 1))).toBe(true);
      expect(isRecoverableError(ConnectionError.notConnected())).toBe(false);
      expect(isRecoverableError(AuthenticationError.failed())).toBe(false);
      expect(isRecoverableError(CommandError.timeout('cmd', 1000))).toBe(true);
      expect(isRecoverableError(new Error('not rcon'))).toBe(false);
    });
  });
});

/**
 * @squadscript/rcon
 *
 * Modern, type-safe RCON client for Squad game servers.
 *
 * This package provides a robust RCON client with:
 * - Full TypeScript support with typed commands and events
 * - Automatic reconnection with exponential backoff
 * - Result-based error handling
 * - Event-driven architecture for chat and admin events
 *
 * @example
 * ```typescript
 * import { RconClient } from '@squadscript/rcon';
 *
 * const client = new RconClient({
 *   host: '127.0.0.1',
 *   port: 21114,
 *   password: 'your-password',
 * });
 *
 * await client.connect();
 *
 * // Query commands
 * const players = await client.getPlayers();
 * if (players.ok) {
 *   console.log(`${players.value.length} players online`);
 * }
 *
 * // Admin commands
 * await client.broadcast('Server message');
 * await client.warn('76561198012345678', 'Warning message');
 *
 * // Event handling
 * client.on('CHAT_MESSAGE', (event) => {
 *   console.log(`${event.playerName}: ${event.message}`);
 * });
 *
 * await client.disconnect();
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Main Client
// =============================================================================

export { RconClient } from './client.js';

// =============================================================================
// Constants
// =============================================================================

export {
  PacketType,
  PacketId,
  ProtocolLimits,
  DefaultTimings,
  ChatChannel,
  ConnectionState,
} from './constants.js';

// =============================================================================
// Protocol
// =============================================================================

export {
  encodePacket,
  encodeAuthPacket,
  encodeCommandPackets,
  decodePacket,
  detectBrokenPacket,
  isChatPacket,
  isAuthResponse,
  isAuthSuccess,
  isEndPacket,
  isMidPacket,
  bufferToHexString,
  formatPacketForLog,
  type RconPacket,
  type EncodedPacket,
  type DecodeError,
  type DecodeSuccess,
} from './protocol.js';

// =============================================================================
// Types
// =============================================================================

export type {
  RconConfig,
  ReconnectConfig,
  CommandConfig,
  HeartbeatConfig,
  ResolvedRconConfig,
  AnyPlayerID,
  PlayerInfo,
  SquadInfo,
  MapInfo,
  RconChatMessageEvent,
  RconAdminCamPossessedEvent,
  RconAdminCamUnpossessedEvent,
  RconPlayerWarnedEvent,
  RconPlayerKickedEvent,
  RconPlayerBannedEvent,
  RconSquadCreatedEvent,
  RconEvent,
  RconEventMap,
  RconEventType,
  ConnectionEventMap,
  AllEventMap,
  PendingCommand,
} from './types.js';

// =============================================================================
// Errors
// =============================================================================

export {
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
  type ConnectionErrorCode,
  type AuthErrorCode,
  type CommandErrorCode,
  type ParseErrorCode,
} from './errors.js';

// =============================================================================
// Parsers
// =============================================================================

export {
  parseChatPacket,
  mightBeChatPacket,
  parseListPlayers,
  parseListSquads,
  parseCurrentMap,
  parseNextMap,
  type ParsedChatEvent,
} from './parsers/index.js';

// =============================================================================
// Events
// =============================================================================

export { TypedEventEmitter } from './events/index.js';

// =============================================================================
// Connection (for advanced use)
// =============================================================================

export { RconConnection } from './connection.js';

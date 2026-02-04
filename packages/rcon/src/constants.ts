/**
 * @squadscript/rcon
 *
 * Protocol constants for Squad RCON.
 *
 * Squad uses a modified Source RCON protocol with custom packet handling
 * for multi-packet responses and chat messages.
 *
 * @module
 */

// =============================================================================
// Packet Types
// =============================================================================

/**
 * RCON packet types as defined by the Source RCON protocol.
 *
 * Squad uses standard Source RCON types with an additional
 * SERVERDATA_CHAT_VALUE type for chat/admin messages.
 */
export const PacketType = {
  /** Command execution request. */
  SERVERDATA_EXECCOMMAND: 0x02,

  /** Authentication request. */
  SERVERDATA_AUTH: 0x03,

  /** Server response to a command. */
  SERVERDATA_RESPONSE_VALUE: 0x00,

  /** Server response to an auth request. */
  SERVERDATA_AUTH_RESPONSE: 0x02,

  /** Chat/server message (Squad-specific). */
  SERVERDATA_CHAT_VALUE: 0x01,
} as const;

export type PacketType = (typeof PacketType)[keyof typeof PacketType];

// =============================================================================
// Packet IDs
// =============================================================================

/**
 * Special packet IDs for multi-packet response handling.
 *
 * Squad uses a two-packet approach for command responses:
 * 1. Command packets are sent with MID_PACKET_ID
 * 2. An empty packet is sent with END_PACKET_ID
 * 3. The server echoes the END_PACKET_ID to signal response completion
 */
export const PacketId = {
  /** Indicates a mid-stream packet (more data coming). */
  MID_PACKET: 0x01,

  /** Indicates the final packet in a response. */
  END_PACKET: 0x02,

  /** Authentication failure indicator. */
  AUTH_FAILED: -1,
} as const;

export type PacketId = (typeof PacketId)[keyof typeof PacketId];

// =============================================================================
// Protocol Limits
// =============================================================================

/**
 * Protocol size constraints.
 */
export const ProtocolLimits = {
  /** Maximum size of a single RCON packet body in bytes. */
  MAXIMUM_PACKET_SIZE: 4096,

  /**
   * Minimum packet size (empty body).
   * Size field (4) + ID (2) + Count (2) + Type (4) + Terminator (2) = 14
   */
  MINIMUM_PACKET_SIZE: 14,

  /**
   * Packet header size.
   * Size (4) + ID low (1) + ID high (1) + Count (2) + Type (4) = 12
   */
  HEADER_SIZE: 12,

  /** Two null bytes at the end of every packet. */
  TERMINATOR_SIZE: 2,

  /** Size field is 4 bytes. */
  SIZE_FIELD_LENGTH: 4,

  /**
   * Size of the "broken" probe packet.
   * Some Squad server responses have a malformed empty packet that needs special handling.
   */
  BROKEN_PACKET_PROBE_SIZE: 21,

  /** Maximum sequence counter before wrap-around. */
  MAX_SEQUENCE: 65535,
} as const;

// =============================================================================
// Timing Defaults
// =============================================================================

/**
 * Default timing configuration values.
 *
 * These can be overridden in RconConfig.
 */
export const DefaultTimings = {
  /** Time to wait for command response (ms). */
  COMMAND_TIMEOUT: 10_000,

  /** Time between keepalive/heartbeat packets (ms). */
  HEARTBEAT_INTERVAL: 30_000,

  /** Initial reconnection delay (ms). */
  RECONNECT_INITIAL_DELAY: 1_000,

  /** Maximum reconnection delay (ms). */
  RECONNECT_MAX_DELAY: 30_000,

  /** Reconnection backoff multiplier. */
  RECONNECT_MULTIPLIER: 2,

  /** Random jitter factor for reconnection (0-1). */
  RECONNECT_JITTER: 0.1,

  /** Connection timeout (ms). */
  CONNECT_TIMEOUT: 10_000,

  /**
   * Delay between sending command and empty packet.
   * Helps prevent packet coalescence issues.
   */
  PACKET_SEND_DELAY: 0,
} as const;

// =============================================================================
// Chat Channels
// =============================================================================

/**
 * Chat channel types used in chat messages.
 */
export const ChatChannel = {
  ALL: 'ChatAll',
  TEAM: 'ChatTeam',
  SQUAD: 'ChatSquad',
  ADMIN: 'ChatAdmin',
} as const;

export type ChatChannel = (typeof ChatChannel)[keyof typeof ChatChannel];

// =============================================================================
// Connection States
// =============================================================================

/**
 * Connection state machine states.
 */
export const ConnectionState = {
  /** Not connected to any server. */
  DISCONNECTED: 'disconnected',

  /** TCP connection in progress. */
  CONNECTING: 'connecting',

  /** TCP connected, authentication in progress. */
  AUTHENTICATING: 'authenticating',

  /** Fully connected and authenticated. */
  CONNECTED: 'connected',

  /** Attempting to reconnect after disconnect. */
  RECONNECTING: 'reconnecting',

  /** Client is being destroyed/cleaned up. */
  DESTROYING: 'destroying',
} as const;

export type ConnectionState =
  (typeof ConnectionState)[keyof typeof ConnectionState];

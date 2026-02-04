/**
 * @squadscript/types
 *
 * Low-level RCON packet types.
 *
 * @module
 */

/**
 * RCON packet type constants.
 *
 * These match the Source RCON protocol packet types.
 */
export const PacketType = {
  /** Execute a command on the server. */
  SERVERDATA_EXECCOMMAND: 0x02,

  /** Authentication request. */
  SERVERDATA_AUTH: 0x03,

  /** Server response to a command. */
  SERVERDATA_RESPONSE_VALUE: 0x00,

  /** Server response to an auth request. */
  SERVERDATA_AUTH_RESPONSE: 0x02,

  /** Chat/server message value (Squad-specific). */
  SERVERDATA_CHAT_VALUE: 0x01,
} as const;

export type PacketType = (typeof PacketType)[keyof typeof PacketType];

/**
 * Packet ID constants.
 */
export const PacketID = {
  /** Indicates this is a mid-stream packet (more to come). */
  MID_PACKET: 0x01,

  /** Indicates this is the final packet in a response. */
  END_PACKET: 0x02,
} as const;

export type PacketID = (typeof PacketID)[keyof typeof PacketID];

/**
 * Maximum packet size in bytes.
 */
export const MAXIMUM_PACKET_SIZE = 4096;

/**
 * Minimum packet size (empty body).
 */
export const MINIMUM_PACKET_SIZE = 10;

/**
 * Packet header size (size + id + type).
 */
export const HEADER_SIZE = 12;

/**
 * Decoded RCON packet.
 */
export interface RconPacket {
  /** Total size of the packet (excluding size field itself). */
  readonly size: number;

  /** Packet ID for request/response matching. */
  readonly id: number;

  /** Packet type. */
  readonly type: PacketType;

  /** Packet body content. */
  readonly body: string;

  /** Packet count (for multi-packet responses). */
  readonly count: number;
}

/**
 * Encoded packet buffer.
 */
export interface EncodedPacket {
  /** The raw buffer. */
  readonly buffer: Buffer;

  /** The packet ID used. */
  readonly id: number;
}

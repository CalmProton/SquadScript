/**
 * @squadscript/rcon
 *
 * RCON packet encoding and decoding.
 *
 * This module handles the low-level binary packet format used by
 * Squad's RCON protocol.
 *
 * @module
 */

import { type Result, Ok, Err } from '@squadscript/types';
import { PacketType, PacketId, ProtocolLimits } from './constants.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Decoded RCON packet structure.
 */
export interface RconPacket {
  /** Total packet size (excluding size field itself). */
  readonly size: number;

  /** Packet ID (low byte only, 0-255). */
  readonly id: number;

  /** Request sequence number for matching responses. */
  readonly count: number;

  /** Packet type (command, auth, response, or chat). */
  readonly type: PacketType;

  /** UTF-8 encoded packet body. */
  readonly body: string;
}

/**
 * Encoded packet ready for transmission.
 */
export interface EncodedPacket {
  /** The raw binary buffer. */
  readonly buffer: Buffer;

  /** The sequence count used for this packet. */
  readonly count: number;
}

/**
 * Packet decoding error types.
 */
export type DecodeError =
  | { readonly code: 'INCOMPLETE'; readonly required: number; readonly available: number }
  | { readonly code: 'INVALID_SIZE'; readonly size: number }
  | { readonly code: 'MALFORMED'; readonly message: string };

/**
 * Result of successful packet decode.
 */
export interface DecodeSuccess {
  readonly packet: RconPacket;
  readonly bytesConsumed: number;
}

// =============================================================================
// Encoding
// =============================================================================

/**
 * Encodes an RCON packet for transmission.
 *
 * Packet structure:
 * ```
 * Offset | Size | Field      | Description
 * -------|------|------------|---------------------------
 * 0      | 4    | Size       | Packet size (excluding this field)
 * 4      | 1    | ID Low     | Packet ID (low byte)
 * 5      | 1    | ID High    | Packet ID (high byte), always 0
 * 6      | 2    | Count      | Request sequence number
 * 8      | 4    | Type       | Packet type
 * 12     | n    | Body       | UTF-8 encoded string
 * 12+n   | 2    | Terminator | Two null bytes
 * ```
 *
 * @param type - The packet type to send
 * @param id - The packet ID (MID_PACKET or END_PACKET)
 * @param count - The sequence number for this request
 * @param body - The command or message body
 * @returns Encoded packet ready for transmission
 *
 * @example
 * ```typescript
 * const packet = encodePacket(
 *   PacketType.SERVERDATA_EXECCOMMAND,
 *   PacketId.MID_PACKET,
 *   1,
 *   'ListPlayers'
 * );
 * socket.write(packet.buffer);
 * ```
 */
export function encodePacket(
  type: PacketType,
  id: number,
  count: number,
  body: string,
): EncodedPacket {
  const bodyBuffer = Buffer.from(body, 'utf8');

  // Total size = ID (2) + Count (2) + Type (4) + Body (n) + Terminator (2)
  const size = 2 + 2 + 4 + bodyBuffer.length + ProtocolLimits.TERMINATOR_SIZE;

  // Full buffer = Size field (4) + rest
  const buffer = Buffer.alloc(ProtocolLimits.SIZE_FIELD_LENGTH + size);

  let offset = 0;

  // Size (4 bytes, little-endian)
  buffer.writeUInt32LE(size, offset);
  offset += 4;

  // ID low byte
  buffer.writeUInt8(id & 0xff, offset);
  offset += 1;

  // ID high byte (always 0)
  buffer.writeUInt8(0, offset);
  offset += 1;

  // Count (2 bytes, little-endian)
  buffer.writeUInt16LE(count & 0xffff, offset);
  offset += 2;

  // Type (4 bytes, little-endian)
  buffer.writeUInt32LE(type, offset);
  offset += 4;

  // Body
  bodyBuffer.copy(buffer, offset);
  offset += bodyBuffer.length;

  // Terminator (2 null bytes)
  buffer.writeUInt16LE(0, offset);

  return { buffer, count };
}

/**
 * Creates an authentication packet.
 *
 * @param password - The RCON password
 * @param count - The sequence number
 * @returns Encoded auth packet
 */
export function encodeAuthPacket(
  password: string,
  count: number,
): EncodedPacket {
  return encodePacket(
    PacketType.SERVERDATA_AUTH,
    PacketId.END_PACKET,
    count,
    password,
  );
}

/**
 * Creates a command packet pair (command + empty packet).
 *
 * Squad's RCON requires sending a command packet followed by an empty
 * packet. The server echoes the empty packet ID to signal the end of
 * the response.
 *
 * @param command - The command to execute
 * @param count - The sequence number
 * @returns Tuple of [command packet, empty packet]
 */
export function encodeCommandPackets(
  command: string,
  count: number,
): [EncodedPacket, EncodedPacket] {
  const commandPacket = encodePacket(
    PacketType.SERVERDATA_EXECCOMMAND,
    PacketId.MID_PACKET,
    count,
    command,
  );

  const emptyPacket = encodePacket(
    PacketType.SERVERDATA_EXECCOMMAND,
    PacketId.END_PACKET,
    count,
    '',
  );

  return [commandPacket, emptyPacket];
}

// =============================================================================
// Decoding
// =============================================================================

/**
 * Attempts to decode an RCON packet from a buffer.
 *
 * This function handles partial packets gracefully - if the buffer
 * doesn't contain a complete packet, it returns an INCOMPLETE error
 * with the required size.
 *
 * @param buffer - Buffer containing packet data
 * @returns Result containing decoded packet or error
 *
 * @example
 * ```typescript
 * const result = decodePacket(buffer);
 * if (result.ok) {
 *   console.log(`Received: ${result.value.packet.body}`);
 *   // Remove consumed bytes from buffer
 *   buffer = buffer.slice(result.value.bytesConsumed);
 * } else if (result.error.code === 'INCOMPLETE') {
 *   // Wait for more data
 * }
 * ```
 */
export function decodePacket(
  buffer: Buffer,
): Result<DecodeSuccess, DecodeError> {
  // Need at least 4 bytes to read the size field
  if (buffer.length < ProtocolLimits.SIZE_FIELD_LENGTH) {
    return Err({
      code: 'INCOMPLETE',
      required: ProtocolLimits.SIZE_FIELD_LENGTH,
      available: buffer.length,
    });
  }

  // Read the size field
  const size = buffer.readUInt32LE(0);
  const totalSize = size + ProtocolLimits.SIZE_FIELD_LENGTH;

  // Validate size is reasonable
  if (size < ProtocolLimits.MINIMUM_PACKET_SIZE - ProtocolLimits.SIZE_FIELD_LENGTH) {
    return Err({
      code: 'INVALID_SIZE',
      size,
    });
  }

  // Check if we have the complete packet
  if (buffer.length < totalSize) {
    return Err({
      code: 'INCOMPLETE',
      required: totalSize,
      available: buffer.length,
    });
  }

  // Validate we have enough for the header + terminator
  if (totalSize < ProtocolLimits.HEADER_SIZE + ProtocolLimits.TERMINATOR_SIZE) {
    return Err({
      code: 'MALFORMED',
      message: `Packet too small: ${totalSize} bytes`,
    });
  }

  // Decode the packet
  const id = buffer.readUInt8(4);
  // Skip high byte at offset 5 (always 0)
  const count = buffer.readUInt16LE(6);
  const type = buffer.readUInt32LE(8) as PacketType;

  // Body is everything between header and terminator
  const bodyStart = ProtocolLimits.HEADER_SIZE;
  const bodyEnd = totalSize - ProtocolLimits.TERMINATOR_SIZE;
  const body = buffer.toString('utf8', bodyStart, bodyEnd);

  const packet: RconPacket = {
    size,
    id,
    count,
    type,
    body,
  };

  return Ok({
    packet,
    bytesConsumed: totalSize,
  });
}

/**
 * Detects and handles the Squad "broken packet" edge case.
 *
 * Some Squad server responses include a malformed empty packet that
 * reports size 10 but is actually 21 bytes. This function probes
 * for this specific pattern.
 *
 * The broken packet has the pattern:
 * - Reported size: 10 (actual: 17 + 4 = 21)
 * - Body: "\x00\x00\x00\x01\x00\x00\x00"
 *
 * @param buffer - Buffer to check for broken packet
 * @returns Number of bytes to skip, or 0 if not a broken packet
 *
 * @example
 * ```typescript
 * const skipBytes = detectBrokenPacket(buffer);
 * if (skipBytes > 0) {
 *   // Skip the malformed packet
 *   buffer = buffer.slice(skipBytes);
 * }
 * ```
 */
export function detectBrokenPacket(buffer: Buffer): number {
  // Need at least 21 bytes to check for broken packet
  if (buffer.length < ProtocolLimits.BROKEN_PACKET_PROBE_SIZE) {
    return 0;
  }

  // Check if size field claims 10 bytes (but packet is actually larger)
  const reportedSize = buffer.readUInt32LE(0);
  if (reportedSize !== 10) {
    return 0;
  }

  // Decode what would be the body of a 21-byte packet
  // Body starts at offset 12, ends at 21 - 2 = 19
  const probeBody = buffer.toString('utf8', 12, 19);

  // Check for the specific broken packet signature
  const BROKEN_SIGNATURE = '\x00\x00\x00\x01\x00\x00\x00';
  if (probeBody === BROKEN_SIGNATURE) {
    return ProtocolLimits.BROKEN_PACKET_PROBE_SIZE;
  }

  return 0;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Checks if a packet is a chat/server message packet.
 *
 * @param packet - The decoded packet to check
 * @returns True if this is a chat packet
 */
export function isChatPacket(packet: RconPacket): boolean {
  return packet.type === PacketType.SERVERDATA_CHAT_VALUE;
}

/**
 * Checks if a packet is an authentication response.
 *
 * @param packet - The decoded packet to check
 * @returns True if this is an auth response
 */
export function isAuthResponse(packet: RconPacket): boolean {
  return packet.type === PacketType.SERVERDATA_AUTH_RESPONSE;
}

/**
 * Checks if authentication was successful.
 *
 * @param packet - The auth response packet
 * @returns True if authentication succeeded
 */
export function isAuthSuccess(packet: RconPacket): boolean {
  return isAuthResponse(packet) && packet.id !== PacketId.AUTH_FAILED;
}

/**
 * Checks if this is the final packet in a multi-packet response.
 *
 * @param packet - The decoded packet to check
 * @returns True if this signals end of response
 */
export function isEndPacket(packet: RconPacket): boolean {
  return packet.id === PacketId.END_PACKET;
}

/**
 * Checks if this is a mid-stream packet (more data coming).
 *
 * @param packet - The decoded packet to check
 * @returns True if more packets are expected
 */
export function isMidPacket(packet: RconPacket): boolean {
  return packet.id === PacketId.MID_PACKET;
}

/**
 * Converts a buffer to a hex string for debugging.
 *
 * @param buffer - Buffer to convert
 * @returns Space-separated hex string
 *
 * @example
 * ```typescript
 * bufferToHexString(Buffer.from([0x0a, 0x00, 0x00, 0x00]))
 * // Returns: "0a 00 00 00"
 * ```
 */
export function bufferToHexString(buffer: Buffer): string {
  return buffer.toString('hex').match(/../g)?.join(' ') ?? '';
}

/**
 * Formats a decoded packet for debug logging.
 *
 * @param packet - The packet to format
 * @returns Human-readable packet description
 */
export function formatPacketForLog(packet: RconPacket): string {
  // Note: SERVERDATA_AUTH and SERVERDATA_AUTH_RESPONSE have same value (0x02)
  // so we check type and context
  const typeNames = new Map<number, string>([
    [PacketType.SERVERDATA_EXECCOMMAND, 'EXECCOMMAND'],
    [PacketType.SERVERDATA_RESPONSE_VALUE, 'RESPONSE'],
    [PacketType.SERVERDATA_AUTH_RESPONSE, 'AUTH/AUTH_RESPONSE'],
    [PacketType.SERVERDATA_CHAT_VALUE, 'CHAT'],
  ]);

  const typeName = typeNames.get(packet.type) ?? `UNKNOWN(${packet.type})`;
  const bodyPreview =
    packet.body.length > 100
      ? `${packet.body.slice(0, 100)}...`
      : packet.body;

  return `[${typeName}] id=${packet.id} count=${packet.count} size=${packet.size} body="${bodyPreview.replace(/\n/g, '\\n')}"`;
}

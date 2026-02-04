/**
 * @squadscript/rcon
 *
 * Unit tests for protocol encoding and decoding.
 */

import { describe, it, expect } from 'bun:test';
import {
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
} from '../src/protocol.js';
import { PacketType, PacketId, ProtocolLimits } from '../src/constants.js';

describe('Protocol', () => {
  describe('encodePacket', () => {
    it('should encode a simple command packet', () => {
      const result = encodePacket(
        PacketType.SERVERDATA_EXECCOMMAND,
        PacketId.MID_PACKET,
        1,
        'ListPlayers',
      );

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.count).toBe(1);

      // Verify size field
      const size = result.buffer.readUInt32LE(0);
      expect(size).toBe(result.buffer.length - 4);
    });

    it('should encode an empty body packet', () => {
      const result = encodePacket(
        PacketType.SERVERDATA_EXECCOMMAND,
        PacketId.END_PACKET,
        5,
        '',
      );

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.count).toBe(5);

      // Empty body should have minimum size
      // Size = ID(2) + Count(2) + Type(4) + Body(0) + Terminator(2) = 10
      const size = result.buffer.readUInt32LE(0);
      expect(size).toBe(10);
    });

    it('should set packet ID correctly', () => {
      const result = encodePacket(
        PacketType.SERVERDATA_EXECCOMMAND,
        PacketId.MID_PACKET,
        1,
        'Test',
      );

      const id = result.buffer.readUInt8(4);
      expect(id).toBe(PacketId.MID_PACKET);
    });

    it('should set packet type correctly', () => {
      const result = encodePacket(
        PacketType.SERVERDATA_EXECCOMMAND,
        PacketId.MID_PACKET,
        1,
        'Test',
      );

      const type = result.buffer.readUInt32LE(8);
      expect(type).toBe(PacketType.SERVERDATA_EXECCOMMAND);
    });

    it('should encode UTF-8 body correctly', () => {
      const body = 'Test Message';
      const result = encodePacket(
        PacketType.SERVERDATA_EXECCOMMAND,
        PacketId.MID_PACKET,
        1,
        body,
      );

      // Read body from buffer (offset 12, before terminator)
      const bodyBuffer = result.buffer.subarray(12, result.buffer.length - 2);
      expect(bodyBuffer.toString('utf8')).toBe(body);
    });

    it('should include null terminator', () => {
      const result = encodePacket(
        PacketType.SERVERDATA_EXECCOMMAND,
        PacketId.MID_PACKET,
        1,
        'Test',
      );

      const terminator = result.buffer.readUInt16LE(result.buffer.length - 2);
      expect(terminator).toBe(0);
    });

    it('should handle unicode characters', () => {
      const body = 'Test ÄÖÜ 日本語';
      const result = encodePacket(
        PacketType.SERVERDATA_EXECCOMMAND,
        PacketId.MID_PACKET,
        1,
        body,
      );

      const bodyBuffer = result.buffer.subarray(12, result.buffer.length - 2);
      expect(bodyBuffer.toString('utf8')).toBe(body);
    });
  });

  describe('encodeAuthPacket', () => {
    it('should create auth packet with END_PACKET id', () => {
      const result = encodeAuthPacket('password123', 1);

      expect(result.buffer).toBeInstanceOf(Buffer);

      const id = result.buffer.readUInt8(4);
      expect(id).toBe(PacketId.END_PACKET);

      const type = result.buffer.readUInt32LE(8);
      expect(type).toBe(PacketType.SERVERDATA_AUTH);
    });
  });

  describe('encodeCommandPackets', () => {
    it('should return command and empty packet pair', () => {
      const [cmdPacket, emptyPacket] = encodeCommandPackets('ListPlayers', 1);

      expect(cmdPacket.buffer).toBeInstanceOf(Buffer);
      expect(emptyPacket.buffer).toBeInstanceOf(Buffer);

      // Command packet should have MID_PACKET id
      expect(cmdPacket.buffer.readUInt8(4)).toBe(PacketId.MID_PACKET);

      // Empty packet should have END_PACKET id
      expect(emptyPacket.buffer.readUInt8(4)).toBe(PacketId.END_PACKET);

      // Both should have same count
      expect(cmdPacket.count).toBe(emptyPacket.count);
    });
  });

  describe('decodePacket', () => {
    it('should decode a valid packet', () => {
      // First encode a packet
      const encoded = encodePacket(
        PacketType.SERVERDATA_RESPONSE_VALUE,
        PacketId.END_PACKET,
        42,
        'Response body',
      );

      // Then decode it
      const result = decodePacket(encoded.buffer);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.packet.body).toBe('Response body');
        expect(result.value.packet.id).toBe(PacketId.END_PACKET);
        expect(result.value.packet.count).toBe(42);
        expect(result.value.packet.type).toBe(PacketType.SERVERDATA_RESPONSE_VALUE);
        expect(result.value.bytesConsumed).toBe(encoded.buffer.length);
      }
    });

    it('should return INCOMPLETE for partial size field', () => {
      const buffer = Buffer.alloc(3); // Less than 4 bytes

      const result = decodePacket(buffer);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INCOMPLETE');
        if (result.error.code === 'INCOMPLETE') {
          expect(result.error.available).toBe(3);
          expect(result.error.required).toBe(4);
        }
      }
    });

    it('should return INCOMPLETE for partial packet', () => {
      // Create a buffer that claims to be 100 bytes but only has 20
      const buffer = Buffer.alloc(20);
      buffer.writeUInt32LE(100, 0); // Size field claims 100 bytes

      const result = decodePacket(buffer);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INCOMPLETE');
        if (result.error.code === 'INCOMPLETE') {
          expect(result.error.available).toBe(20);
          expect(result.error.required).toBe(104); // 100 + 4 size field
        }
      }
    });

    it('should decode multiple packets from buffer', () => {
      // Encode two packets
      const encoded1 = encodePacket(
        PacketType.SERVERDATA_RESPONSE_VALUE,
        PacketId.MID_PACKET,
        1,
        'First',
      );
      const encoded2 = encodePacket(
        PacketType.SERVERDATA_RESPONSE_VALUE,
        PacketId.END_PACKET,
        1,
        'Second',
      );

      // Concatenate them
      const buffer = Buffer.concat([encoded1.buffer, encoded2.buffer]);

      // Decode first packet
      const result1 = decodePacket(buffer);
      expect(result1.ok).toBe(true);
      if (result1.ok) {
        expect(result1.value.packet.body).toBe('First');

        // Decode second packet from remaining buffer
        const remaining = buffer.subarray(result1.value.bytesConsumed);
        const result2 = decodePacket(remaining);
        expect(result2.ok).toBe(true);
        if (result2.ok) {
          expect(result2.value.packet.body).toBe('Second');
        }
      }
    });
  });

  describe('detectBrokenPacket', () => {
    it('should return 0 for normal packet', () => {
      const encoded = encodePacket(
        PacketType.SERVERDATA_RESPONSE_VALUE,
        PacketId.END_PACKET,
        1,
        'Normal packet',
      );

      const result = detectBrokenPacket(encoded.buffer);
      expect(result).toBe(0);
    });

    it('should return 0 for insufficient data', () => {
      const buffer = Buffer.alloc(10);

      const result = detectBrokenPacket(buffer);
      expect(result).toBe(0);
    });

    it('should detect broken packet signature', () => {
      // Create a buffer that matches the broken packet pattern
      const buffer = Buffer.alloc(21);
      buffer.writeUInt32LE(10, 0); // Size claims 10
      // Write broken signature at body position
      buffer.write('\x00\x00\x00\x01\x00\x00\x00', 12, 'utf8');

      const result = detectBrokenPacket(buffer);
      expect(result).toBe(21);
    });
  });

  describe('packet type checks', () => {
    it('isChatPacket should identify chat packets', () => {
      const chatPacket = {
        size: 10,
        id: 0,
        count: 0,
        type: PacketType.SERVERDATA_CHAT_VALUE,
        body: '',
      };

      expect(isChatPacket(chatPacket)).toBe(true);

      const responsePacket = {
        ...chatPacket,
        type: PacketType.SERVERDATA_RESPONSE_VALUE,
      };

      expect(isChatPacket(responsePacket)).toBe(false);
    });

    it('isAuthResponse should identify auth responses', () => {
      const authPacket = {
        size: 10,
        id: 0,
        count: 0,
        type: PacketType.SERVERDATA_AUTH_RESPONSE,
        body: '',
      };

      expect(isAuthResponse(authPacket)).toBe(true);
    });

    it('isAuthSuccess should check auth result', () => {
      const successPacket = {
        size: 10,
        id: PacketId.END_PACKET,
        count: 0,
        type: PacketType.SERVERDATA_AUTH_RESPONSE,
        body: '',
      };

      expect(isAuthSuccess(successPacket)).toBe(true);

      const failPacket = {
        ...successPacket,
        id: PacketId.AUTH_FAILED,
      };

      expect(isAuthSuccess(failPacket)).toBe(false);
    });

    it('isEndPacket and isMidPacket should identify packet IDs', () => {
      const endPacket = {
        size: 10,
        id: PacketId.END_PACKET,
        count: 0,
        type: PacketType.SERVERDATA_RESPONSE_VALUE,
        body: '',
      };

      const midPacket = {
        ...endPacket,
        id: PacketId.MID_PACKET,
      };

      expect(isEndPacket(endPacket)).toBe(true);
      expect(isEndPacket(midPacket)).toBe(false);

      expect(isMidPacket(midPacket)).toBe(true);
      expect(isMidPacket(endPacket)).toBe(false);
    });
  });

  describe('bufferToHexString', () => {
    it('should convert buffer to spaced hex string', () => {
      const buffer = Buffer.from([0x0a, 0x00, 0x00, 0x00, 0xff]);

      const result = bufferToHexString(buffer);

      expect(result).toBe('0a 00 00 00 ff');
    });

    it('should handle empty buffer', () => {
      const buffer = Buffer.alloc(0);

      const result = bufferToHexString(buffer);

      expect(result).toBe('');
    });
  });
});

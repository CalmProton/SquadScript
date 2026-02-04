/**
 * @squadscript/rcon
 *
 * Unit tests for chat packet parsers.
 */

import { describe, it, expect } from 'bun:test';
import { parseChatPacket, mightBeChatPacket } from '../src/parsers/chat.js';
import { ChatChannel } from '../src/constants.js';

describe('Chat Packet Parser', () => {
  describe('parseChatPacket', () => {
    describe('CHAT_MESSAGE', () => {
      it('should parse ChatAll message with Steam ID', () => {
        const body =
          '[ChatAll] [Online IDs:EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198012345678] TestPlayer : Hello world';

        const result = parseChatPacket(body);

        expect(result).not.toBeNull();
        expect(result?.type).toBe('CHAT_MESSAGE');
        if (result?.type === 'CHAT_MESSAGE') {
          expect(result.event.channel).toBe(ChatChannel.ALL);
          expect(result.event.playerName).toBe('TestPlayer');
          expect(result.event.message).toBe('Hello world');
          expect(result.event.steamID).toBe('76561198012345678');
          expect(result.event.eosID).toBe('0002a10186d9414496bf20d22d3860ba');
          expect(result.event.raw).toBe(body);
          expect(result.event.timestamp).toBeInstanceOf(Date);
        }
      });

      it('should parse ChatTeam message', () => {
        const body =
          '[ChatTeam] [Online IDs:EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198012345678] Player : Team message';

        const result = parseChatPacket(body);

        expect(result).not.toBeNull();
        if (result?.type === 'CHAT_MESSAGE') {
          expect(result.event.channel).toBe(ChatChannel.TEAM);
          expect(result.event.message).toBe('Team message');
        }
      });

      it('should parse ChatSquad message', () => {
        const body =
          '[ChatSquad] [Online IDs:EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198012345678] Player : Squad message';

        const result = parseChatPacket(body);

        expect(result).not.toBeNull();
        if (result?.type === 'CHAT_MESSAGE') {
          expect(result.event.channel).toBe(ChatChannel.SQUAD);
        }
      });

      it('should parse ChatAdmin message', () => {
        const body =
          '[ChatAdmin] [Online IDs:EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198012345678] Admin : Admin message';

        const result = parseChatPacket(body);

        expect(result).not.toBeNull();
        if (result?.type === 'CHAT_MESSAGE') {
          expect(result.event.channel).toBe(ChatChannel.ADMIN);
        }
      });

      it('should handle message without Steam ID', () => {
        const body =
          '[ChatAll] [Online IDs:EOS: 0002a10186d9414496bf20d22d3860ba] Player : Message';

        const result = parseChatPacket(body);

        expect(result).not.toBeNull();
        if (result?.type === 'CHAT_MESSAGE') {
          expect(result.event.steamID).toBeNull();
          expect(result.event.eosID).toBe('0002a10186d9414496bf20d22d3860ba');
        }
      });

      it('should handle empty message', () => {
        const body =
          '[ChatAll] [Online IDs:EOS: 0002a10186d9414496bf20d22d3860ba] Player : ';

        const result = parseChatPacket(body);

        expect(result).not.toBeNull();
        if (result?.type === 'CHAT_MESSAGE') {
          expect(result.event.message).toBe('');
        }
      });

      it('should handle message with colons', () => {
        const body =
          '[ChatAll] [Online IDs:EOS: 0002a10186d9414496bf20d22d3860ba] Player : Hello: how are you: fine';

        const result = parseChatPacket(body);

        expect(result).not.toBeNull();
        if (result?.type === 'CHAT_MESSAGE') {
          expect(result.event.message).toBe('Hello: how are you: fine');
        }
      });
    });

    describe('ADMIN_CAM_POSSESSED', () => {
      it('should parse admin camera possessed event', () => {
        const body =
          '[Online Ids:EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198012345678] AdminPlayer has possessed admin camera.';

        const result = parseChatPacket(body);

        expect(result).not.toBeNull();
        expect(result?.type).toBe('ADMIN_CAM_ENTERED');
        if (result?.type === 'ADMIN_CAM_ENTERED') {
          expect(result.event.playerName).toBe('AdminPlayer');
          expect(result.event.steamID).toBe('76561198012345678');
          expect(result.event.eosID).toBe('0002a10186d9414496bf20d22d3860ba');
        }
      });
    });

    describe('ADMIN_CAM_UNPOSSESSED', () => {
      it('should parse admin camera unpossessed event', () => {
        const body =
          '[Online IDs:EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198012345678] AdminPlayer has unpossessed admin camera.';

        const result = parseChatPacket(body);

        expect(result).not.toBeNull();
        expect(result?.type).toBe('ADMIN_CAM_EXITED');
        if (result?.type === 'ADMIN_CAM_EXITED') {
          expect(result.event.playerName).toBe('AdminPlayer');
        }
      });
    });

    describe('PLAYER_WARNED', () => {
      it('should parse player warned event', () => {
        const body =
          'Remote admin has warned player TestPlayer. Message was "Stop teamkilling"';

        const result = parseChatPacket(body);

        expect(result).not.toBeNull();
        expect(result?.type).toBe('PLAYER_WARNED');
        if (result?.type === 'PLAYER_WARNED') {
          expect(result.event.playerName).toBe('TestPlayer');
          expect(result.event.reason).toBe('Stop teamkilling');
        }
      });
    });

    describe('PLAYER_KICKED', () => {
      it('should parse player kicked event', () => {
        const body =
          'Kicked player 5. [Online IDs=EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198012345678] KickedPlayer';

        const result = parseChatPacket(body);

        expect(result).not.toBeNull();
        expect(result?.type).toBe('PLAYER_KICKED');
        if (result?.type === 'PLAYER_KICKED') {
          expect(result.event.playerID).toBe(5);
          expect(result.event.playerName).toBe('KickedPlayer');
          expect(result.event.steamID).toBe('76561198012345678');
        }
      });
    });

    describe('PLAYER_BANNED', () => {
      it('should parse player banned event', () => {
        const body =
          'Banned player 10. [Online IDs=EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198012345678] BannedPlayer for interval 1d';

        const result = parseChatPacket(body);

        expect(result).not.toBeNull();
        expect(result?.type).toBe('PLAYER_BANNED');
        if (result?.type === 'PLAYER_BANNED') {
          expect(result.event.playerID).toBe(10);
          expect(result.event.playerName).toBe('BannedPlayer');
          expect(result.event.interval).toBe('1d');
        }
      });

      it('should parse permanent ban', () => {
        const body =
          'Banned player 10. [Online IDs=EOS: 0002a10186d9414496bf20d22d3860ba] Player for interval 0';

        const result = parseChatPacket(body);

        expect(result).not.toBeNull();
        if (result?.type === 'PLAYER_BANNED') {
          expect(result.event.interval).toBe('0');
        }
      });
    });

    describe('SQUAD_CREATED', () => {
      it('should parse squad created event', () => {
        const body =
          'PlayerName (Online IDs:EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198012345678) has created Squad 3 (Squad Name: Infantry) on US Army';

        const result = parseChatPacket(body);

        expect(result).not.toBeNull();
        expect(result?.type).toBe('SQUAD_CREATED');
        if (result?.type === 'SQUAD_CREATED') {
          expect(result.event.playerName).toBe('PlayerName');
          expect(result.event.squadID).toBe(3);
          expect(result.event.squadName).toBe('Infantry');
          expect(result.event.teamName).toBe('US Army');
          expect(result.event.steamID).toBe('76561198012345678');
        }
      });
    });

    describe('unrecognized packets', () => {
      it('should return null for unrecognized format', () => {
        const body = 'Some random server message';

        const result = parseChatPacket(body);

        expect(result).toBeNull();
      });

      it('should return null for empty body', () => {
        const result = parseChatPacket('');

        expect(result).toBeNull();
      });
    });
  });

  describe('mightBeChatPacket', () => {
    it('should return true for chat messages', () => {
      expect(mightBeChatPacket('[ChatAll] Test')).toBe(true);
      expect(mightBeChatPacket('[ChatTeam] Test')).toBe(true);
    });

    it('should return true for online IDs prefix', () => {
      expect(mightBeChatPacket('[Online IDs:...')).toBe(true);
    });

    it('should return true for admin messages', () => {
      expect(mightBeChatPacket('Remote admin has warned')).toBe(true);
      expect(mightBeChatPacket('Kicked player 5')).toBe(true);
      expect(mightBeChatPacket('Banned player 5')).toBe(true);
    });

    it('should return true for squad created', () => {
      expect(mightBeChatPacket('Player has created Squad 1')).toBe(true);
    });

    it('should return false for other messages', () => {
      expect(mightBeChatPacket('Server starting...')).toBe(false);
      expect(mightBeChatPacket('Map changed')).toBe(false);
    });
  });
});

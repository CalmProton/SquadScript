/**
 * @squadscript/rcon
 *
 * Unit tests for response parsers.
 */

import { describe, it, expect } from 'bun:test';
import {
  parseListPlayers,
  parseListSquads,
  parseCurrentMap,
  parseNextMap,
} from '../src/parsers/response.js';

describe('Response Parsers', () => {
  describe('parseListPlayers', () => {
    it('should parse single player', () => {
      const response = `ID: 1 | Online IDs:EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198012345678 | Name: TestPlayer | Team ID: 1 | Squad ID: 2 | Is Leader: True | Role: Infantry`;

      const result = parseListPlayers(response);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(1);
        const player = result.value[0]!;
        expect(player.playerID).toBe(1);
        expect(player.name).toBe('TestPlayer');
        expect(player.teamID).toBe(1);
        expect(player.squadID).toBe(2);
        expect(player.isLeader).toBe(true);
        expect(player.role).toBe('Infantry');
        expect(player.steamID).toBe('76561198012345678');
        expect(player.eosID).toBe('0002a10186d9414496bf20d22d3860ba');
      }
    });

    it('should parse multiple players', () => {
      const response = `ID: 1 | Online IDs:EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198012345678 | Name: Player1 | Team ID: 1 | Squad ID: 1 | Is Leader: True | Role: Infantry
ID: 2 | Online IDs:EOS: 0002a10186d9414496bf20d22d3860bb steam: 76561198012345679 | Name: Player2 | Team ID: 2 | Squad ID: 3 | Is Leader: False | Role: Medic`;

      const result = parseListPlayers(response);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(2);
        expect(result.value[0]?.name).toBe('Player1');
        expect(result.value[1]?.name).toBe('Player2');
      }
    });

    it('should handle N/A team and squad IDs', () => {
      const response = `ID: 1 | Online IDs:EOS: 0002a10186d9414496bf20d22d3860ba | Name: Connecting | Team ID: N/A | Squad ID: N/A | Is Leader: False | Role: USA_Recruit`;

      const result = parseListPlayers(response);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(1);
        const player = result.value[0]!;
        expect(player.teamID).toBeNull();
        expect(player.squadID).toBeNull();
        expect(player.steamID).toBeNull();
      }
    });

    it('should handle empty response', () => {
      const result = parseListPlayers('');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(0);
      }
    });

    it('should skip invalid lines', () => {
      const response = `Some header text
ID: 1 | Online IDs:EOS: 0002a10186d9414496bf20d22d3860ba | Name: Player | Team ID: 1 | Squad ID: 1 | Is Leader: True | Role: Infantry
Invalid line
----- Player end -----`;

      const result = parseListPlayers(response);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(1);
      }
    });

    it('should handle player names with special characters', () => {
      const response = `ID: 1 | Online IDs:EOS: 0002a10186d9414496bf20d22d3860ba | Name: [TAG] Player | Team ID: 1 | Squad ID: 1 | Is Leader: True | Role: Infantry`;

      const result = parseListPlayers(response);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value[0]?.name).toBe('[TAG] Player');
      }
    });
  });

  describe('parseListSquads', () => {
    it('should parse squads with team headers', () => {
      const response = `Team ID: 1 (US Army)
ID: 1 | Name: Infantry | Size: 9 | Locked: False | Creator Name: SquadLeader | Creator Online IDs:EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198012345678
ID: 2 | Name: Armor | Size: 4 | Locked: True | Creator Name: TankCommander | Creator Online IDs:EOS: 0002a10186d9414496bf20d22d3860bb
Team ID: 2 (Russian Ground Forces)
ID: 1 | Name: Assault | Size: 6 | Locked: False | Creator Name: RusLeader | Creator Online IDs:EOS: 0002a10186d9414496bf20d22d3860bc steam: 76561198012345680`;

      const result = parseListSquads(response);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(3);

        const squad1 = result.value[0]!;
        expect(squad1.squadID).toBe(1);
        expect(squad1.teamID).toBe(1);
        expect(squad1.name).toBe('Infantry');
        expect(squad1.size).toBe(9);
        expect(squad1.locked).toBe(false);
        expect(squad1.creatorName).toBe('SquadLeader');
        expect(squad1.teamName).toBe('US Army');
        expect(squad1.creatorSteamID).toBe('76561198012345678');

        const squad2 = result.value[1]!;
        expect(squad2.locked).toBe(true);
        expect(squad2.creatorSteamID).toBeNull();

        const squad3 = result.value[2]!;
        expect(squad3.teamID).toBe(2);
        expect(squad3.teamName).toBe('Russian Ground Forces');
      }
    });

    it('should handle empty response', () => {
      const result = parseListSquads('');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(0);
      }
    });

    it('should handle response with only team headers', () => {
      const response = `Team ID: 1 (US Army)
Team ID: 2 (Russian Ground Forces)`;

      const result = parseListSquads(response);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(0);
      }
    });
  });

  describe('parseCurrentMap', () => {
    it('should parse current map and layer', () => {
      const response = 'Current level is Narva, layer is Narva_RAAS_v1';

      const result = parseCurrentMap(response);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.level).toBe('Narva');
        expect(result.value.layer).toBe('Narva_RAAS_v1');
      }
    });

    it('should handle level with spaces', () => {
      const response =
        'Current level is Al Basrah, layer is Al_Basrah_Invasion_v2';

      const result = parseCurrentMap(response);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.level).toBe('Al Basrah');
        expect(result.value.layer).toBe('Al_Basrah_Invasion_v2');
      }
    });

    it('should return error for invalid format', () => {
      const response = 'Invalid response format';

      const result = parseCurrentMap(response);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNEXPECTED_FORMAT');
      }
    });
  });

  describe('parseNextMap', () => {
    it('should parse next map and layer', () => {
      const response = 'Next level is Gorodok, layer is Gorodok_AAS_v2';

      const result = parseNextMap(response);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.level).toBe('Gorodok');
        expect(result.value.layer).toBe('Gorodok_AAS_v2');
      }
    });

    it('should handle "To be voted" layer', () => {
      const response = 'Next level is Gorodok, layer is To be voted';

      const result = parseNextMap(response);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.level).toBe('Gorodok');
        expect(result.value.layer).toBeNull();
      }
    });

    it('should handle empty next map', () => {
      const response = 'Next level is , layer is ';

      const result = parseNextMap(response);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.level).toBeNull();
        expect(result.value.layer).toBeNull();
      }
    });
  });
});

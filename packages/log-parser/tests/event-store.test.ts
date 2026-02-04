/**
 * @squadscript/log-parser
 *
 * Unit tests for event store.
 */

import { describe, expect, it, beforeEach } from "bun:test";
import type { EOSID, SteamID, ChainID, TeamID, SquadID, PlayerController } from "@squadscript/types";
import { EventStore } from "../src/store/event-store";

describe("EventStore", () => {
	let store: EventStore;

	beforeEach(() => {
		store = new EventStore();
	});

	describe("player management", () => {
		const mockEosID = "0002a10186d9414496bf20d22d3860ba" as EOSID;
		const mockSteamID = "76561198012345678" as SteamID;
		const mockController = "BP_PlayerController_C_123" as PlayerController;

		it("should store and retrieve player", () => {
			store.setPlayer(mockEosID, {
				eosID: mockEosID,
				steamID: mockSteamID,
				controller: mockController,
				name: "TestPlayer",
			});

			const player = store.getPlayer(mockEosID);

			expect(player).not.toBeUndefined();
			expect(player?.name).toBe("TestPlayer");
		});

		it("should update existing player", () => {
			store.setPlayer(mockEosID, {
				eosID: mockEosID,
				steamID: mockSteamID,
				controller: mockController,
				name: "OldName",
			});

			store.setPlayer(mockEosID, {
				eosID: mockEosID,
				steamID: mockSteamID,
				controller: mockController,
				name: "NewName",
			});

			const player = store.getPlayer(mockEosID);

			expect(player?.name).toBe("NewName");
		});

		it("should delete player", () => {
			store.setPlayer(mockEosID, {
				eosID: mockEosID,
				steamID: mockSteamID,
				controller: mockController,
				name: "TestPlayer",
			});

			store.deletePlayer(mockEosID);

			expect(store.getPlayer(mockEosID)).toBeUndefined();
		});

		it("should find player by controller", () => {
			store.setPlayer(mockEosID, {
				eosID: mockEosID,
				steamID: mockSteamID,
				controller: mockController,
				name: "TestPlayer",
			});

			const player = store.getPlayerByController(mockController);

			expect(player?.eosID).toBe(mockEosID);
		});

		it("should get all players", () => {
			const eosID2 = "0002a10186d9414496bf20d22d3860bb" as EOSID;

			store.setPlayer(mockEosID, {
				eosID: mockEosID,
				steamID: mockSteamID,
				controller: mockController,
				name: "Player1",
			});

			store.setPlayer(eosID2, {
				eosID: eosID2,
				steamID: "76561198012345679" as SteamID,
				controller: "BP_PlayerController_C_124" as PlayerController,
				name: "Player2",
			});

			const players = store.getAllPlayers();

			expect(players.size).toBe(2);
		});
	});

	describe("join request management", () => {
		it("should store and retrieve join request", () => {
			store.setJoinRequest(1, {
				chainID: "2024.06.15-14.30.45:123" as ChainID,
				steamID: "76561198012345678" as SteamID,
				ip: "127.0.0.1",
				timestamp: new Date(),
			});

			const request = store.getJoinRequest(1);

			expect(request).not.toBeUndefined();
			expect(request?.ip).toBe("127.0.0.1");
		});

		it("should delete join request", () => {
			store.setJoinRequest(1, {
				chainID: "2024.06.15-14.30.45:123" as ChainID,
				steamID: "76561198012345678" as SteamID,
				ip: "127.0.0.1",
				timestamp: new Date(),
			});

			store.deleteJoinRequest(1);

			expect(store.getJoinRequest(1)).toBeUndefined();
		});
	});

	describe("disconnected players", () => {
		const mockEosID = "0002a10186d9414496bf20d22d3860ba" as EOSID;

		it("should mark player as disconnected", () => {
			store.markDisconnected(mockEosID);

			expect(store.isDisconnected(mockEosID)).toBe(true);
		});

		it("should clear disconnected player", () => {
			store.markDisconnected(mockEosID);
			store.clearDisconnected(mockEosID);

			expect(store.isDisconnected(mockEosID)).toBe(false);
		});
	});

	describe("combat sessions", () => {
		const victimName = "VictimPlayer";

		it("should store and retrieve combat session", () => {
			const now = new Date();

			store.setSession(victimName, {
				attackerEosID: "0002a10186d9414496bf20d22d3860ba" as EOSID,
				victimEosID: "0002a10186d9414496bf20d22d3860bb" as EOSID,
				weapon: "AK74",
				damage: 50,
				timestamp: now,
			});

			const session = store.getSession(victimName);

			expect(session).not.toBeUndefined();
			expect(session?.damage).toBe(50);
		});

		it("should delete combat session", () => {
			store.setSession(victimName, {
				attackerEosID: "0002a10186d9414496bf20d22d3860ba" as EOSID,
				victimEosID: "0002a10186d9414496bf20d22d3860bb" as EOSID,
				weapon: "AK74",
				damage: 50,
				timestamp: new Date(),
			});

			store.deleteSession(victimName);

			expect(store.getSession(victimName)).toBeUndefined();
		});
	});

	describe("round result", () => {
		it("should store and retrieve round result", () => {
			store.setRoundResult({
				winningTeamID: 1 as TeamID,
				winningFaction: "USA",
				losingTeamID: 2 as TeamID,
				losingFaction: "RU",
				team1Tickets: 50,
				team2Tickets: 0,
			});

			const result = store.getRoundResult();

			expect(result).not.toBeNull();
			expect(result?.winningTeamID).toBe(1);
		});

		it("should clear round result", () => {
			store.setRoundResult({
				winningTeamID: 1 as TeamID,
				winningFaction: "USA",
				losingTeamID: 2 as TeamID,
				losingFaction: "RU",
				team1Tickets: 50,
				team2Tickets: 0,
			});

			store.clearRoundResult();

			expect(store.getRoundResult()).toBeNull();
		});
	});

	describe("clearAll", () => {
		it("should clear all data", () => {
			const mockEosID = "0002a10186d9414496bf20d22d3860ba" as EOSID;

			store.setPlayer(mockEosID, {
				eosID: mockEosID,
				steamID: "76561198012345678" as SteamID,
				controller: "BP_PlayerController_C_123" as PlayerController,
				name: "Player",
			});

			store.setJoinRequest(1, {
				chainID: "2024.06.15-14.30.45:123" as ChainID,
				steamID: "76561198012345678" as SteamID,
				ip: "127.0.0.1",
				timestamp: new Date(),
			});

			store.clearAll();

			expect(store.getAllPlayers().size).toBe(0);
			expect(store.getJoinRequest(1)).toBeUndefined();
		});
	});
});

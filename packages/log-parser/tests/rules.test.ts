/**
 * @squadscript/log-parser
 *
 * Unit tests for parsing rules.
 *
 * These tests verify the rule definitions are valid.
 * Full regex matching tests require actual Squad log files.
 */

import { describe, expect, it } from "bun:test";
import {
	playerConnectedRule,
	playerDisconnectedRule,
	playerJoinSucceededRule,
	playerDamagedRule,
	playerDiedRule,
	playerWoundedRule,
	playerRevivedRule,
	playerPossessRule,
	playerUnpossessRule,
	newGameRule,
	roundWinnerRule,
	roundEndedRule,
	roundTicketsRule,
	adminBroadcastRule,
	serverTickRateRule,
	deployableDamagedRule,
	defaultRules,
	extendRules,
	filterRules,
	excludeRules,
} from "../src/rules";

describe("Parsing Rules", () => {
	describe("rule definitions", () => {
		const allRules = [
			playerConnectedRule,
			playerDisconnectedRule,
			playerJoinSucceededRule,
			playerDamagedRule,
			playerDiedRule,
			playerWoundedRule,
			playerRevivedRule,
			playerPossessRule,
			playerUnpossessRule,
			newGameRule,
			roundWinnerRule,
			roundEndedRule,
			roundTicketsRule,
			adminBroadcastRule,
			serverTickRateRule,
			deployableDamagedRule,
		];

		it("should have valid rule structure", () => {
			for (const rule of allRules) {
				expect(rule.name).toBeDefined();
				expect(typeof rule.name).toBe("string");
				expect(rule.eventName).toBeDefined();
				expect(typeof rule.eventName).toBe("string");
				expect(rule.regex).toBeInstanceOf(RegExp);
				expect(typeof rule.parse).toBe("function");
			}
		});

		it("should have unique rule names", () => {
			const names = allRules.map((r) => r.name);
			const uniqueNames = new Set(names);
			expect(uniqueNames.size).toBe(names.length);
		});

		it("should have unique event names", () => {
			const eventNames = allRules.map((r) => r.eventName);
			const uniqueEvents = new Set(eventNames);
			expect(uniqueEvents.size).toBe(eventNames.length);
		});

		it("should not have global flag on regex", () => {
			for (const rule of allRules) {
				expect(rule.regex.global).toBe(false);
			}
		});
	});

	describe("defaultRules", () => {
		it("should contain all expected rules", () => {
			expect(defaultRules.length).toBeGreaterThan(10);
		});

		it("should include player connected rule", () => {
			const found = defaultRules.some((r) => r.name === "player-connected");
			expect(found).toBe(true);
		});
	});

	describe("extendRules", () => {
		it("should prepend additional rules to defaults", () => {
			const customRule = {
				name: "custom-rule",
				eventName: "CUSTOM_EVENT",
				regex: /test/,
				parse: () => null,
			};

			const extended = extendRules([customRule]);

			// First rule should be the custom one
			expect(extended[0]).toBe(customRule);
			// Should include all default rules plus custom
			expect(extended.length).toBe(defaultRules.length + 1);
		});
	});

	describe("filterRules", () => {
		it("should filter rules by predicate", () => {
			const filtered = filterRules((rule) =>
				rule.name === "player-connected" || rule.name === "player-disconnected"
			);

			expect(filtered.length).toBe(2);
			expect(filtered.some((r) => r.name === "player-connected")).toBe(true);
			expect(filtered.some((r) => r.name === "player-disconnected")).toBe(true);
		});
	});

	describe("excludeRules", () => {
		it("should exclude rules by name", () => {
			const excluded = excludeRules(["player-connected"]);

			expect(excluded.length).toBe(defaultRules.length - 1);
			expect(excluded.some((r) => r.name === "player-connected")).toBe(false);
		});
	});
});

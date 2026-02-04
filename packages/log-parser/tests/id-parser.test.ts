/**
 * @squadscript/log-parser
 *
 * Unit tests for ID parser utilities.
 */

import { describe, expect, it } from "bun:test";
import {
	capitalizeID,
	hasInvalidIDs,
	iterateIDs,
	parseOnlineIDs,
} from "../src/utils/id-parser";

describe("ID Parser", () => {
	describe("parseOnlineIDs", () => {
		it("should parse both EOS and Steam IDs", () => {
			// The format uses spaces, not brackets around the whole thing
			const text = "EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198012345678";

			const result = parseOnlineIDs(text);

			expect(result.eosID).toBe("0002a10186d9414496bf20d22d3860ba");
			expect(result.steamID).toBe("76561198012345678");
		});

		it("should parse EOS ID only", () => {
			const text = "EOS: 0002a10186d9414496bf20d22d3860ba";

			const result = parseOnlineIDs(text);

			expect(result.eosID).toBe("0002a10186d9414496bf20d22d3860ba");
			expect(result.steamID).toBeNull();
		});

		it("should parse capitalized format (EOS:)", () => {
			const text =
				"EOS: 0002A10186D9414496BF20D22D3860BA Steam: 76561198012345678";

			const result = parseOnlineIDs(text);

			// EOS IDs are normalized to lowercase
			expect(result.eosID).toBe("0002a10186d9414496bf20d22d3860ba");
			expect(result.steamID).toBe("76561198012345678");
		});

		it("should handle missing IDs", () => {
			const text = "Some text without IDs";

			const result = parseOnlineIDs(text);

			expect(result.eosID).toBeNull();
			expect(result.steamID).toBeNull();
		});

		it("should handle INVALID EOS ID", () => {
			const text = "EOS: INVALID steam: 76561198012345678";

			const result = parseOnlineIDs(text);

			// INVALID is not a valid EOS ID pattern
			expect(result.eosID).toBeNull();
			expect(result.steamID).toBe("76561198012345678");
		});

		it("should handle INVALID Steam ID", () => {
			const text = "EOS: 0002a10186d9414496bf20d22d3860ba steam: INVALID";

			const result = parseOnlineIDs(text);

			expect(result.eosID).toBe("0002a10186d9414496bf20d22d3860ba");
			// INVALID is not a valid Steam ID pattern
			expect(result.steamID).toBeNull();
		});
	});

	describe("iterateIDs", () => {
		it("should iterate over multiple ID pairs", () => {
			const text = "EOS: abc123 steam: 76561198012345678";

			const results = [...iterateIDs(text)];

			expect(results.length).toBe(2);
			expect(results[0]?.platform).toBe("EOS");
			expect(results[0]?.id).toBe("abc123");
			expect(results[1]?.platform).toBe("steam");
		});

		it("should return empty for no matches", () => {
			const text = "No IDs here";

			const results = [...iterateIDs(text)];

			expect(results.length).toBe(0);
		});
	});

	describe("hasInvalidIDs", () => {
		it("should detect INVALID in string", () => {
			const result = hasInvalidIDs("EOS: INVALID steam: 76561198012345678");

			expect(result).toBe(true);
		});

		it("should detect INVALID in lowercase", () => {
			const result = hasInvalidIDs("EOS: invalid steam: 76561198012345678");

			expect(result).toBe(true);
		});

		it("should return false for valid IDs", () => {
			const result = hasInvalidIDs(
				"EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198012345678",
			);

			expect(result).toBe(false);
		});

		it("should return false for empty string", () => {
			const result = hasInvalidIDs("");

			expect(result).toBe(false);
		});
	});

	describe("capitalizeID", () => {
		it("should capitalize platform names to ID format", () => {
			expect(capitalizeID("steam")).toBe("SteamID");
			expect(capitalizeID("eos")).toBe("EOSID");
		});

		it("should handle already capitalized", () => {
			expect(capitalizeID("Steam")).toBe("SteamID");
			expect(capitalizeID("EOS")).toBe("EOSID");
		});
	});
});

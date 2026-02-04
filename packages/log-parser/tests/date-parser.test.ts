/**
 * @squadscript/log-parser
 *
 * Unit tests for date parser utilities.
 */

import { describe, expect, it } from "bun:test";
import type { ChainID } from "@squadscript/types";
import {
	formatLogTimestamp,
	parseChainID,
	parseLogTimestamp,
} from "../src/utils/date-parser";

describe("Date Parser", () => {
	describe("parseLogTimestamp", () => {
		it("should parse valid Squad log timestamp", () => {
			const timestamp = "2024.06.15-14.30.45:123";

			const result = parseLogTimestamp(timestamp);

			expect(result).not.toBeNull();
			if (result) {
				expect(result.getUTCFullYear()).toBe(2024);
				expect(result.getUTCMonth()).toBe(5); // June is 0-indexed
				expect(result.getUTCDate()).toBe(15);
				expect(result.getUTCHours()).toBe(14);
				expect(result.getUTCMinutes()).toBe(30);
				expect(result.getUTCSeconds()).toBe(45);
				expect(result.getUTCMilliseconds()).toBe(123);
			}
		});

		it("should parse timestamp at year boundary", () => {
			const timestamp = "2025.01.01-00.00.00:000";

			const result = parseLogTimestamp(timestamp);

			expect(result).not.toBeNull();
			if (result) {
				expect(result.getUTCFullYear()).toBe(2025);
				expect(result.getUTCMonth()).toBe(0);
				expect(result.getUTCDate()).toBe(1);
			}
		});

		it("should return null for invalid format", () => {
			const timestamp = "invalid-timestamp";

			const result = parseLogTimestamp(timestamp);

			expect(result).toBeNull();
		});

		it("should return null for empty string", () => {
			const result = parseLogTimestamp("");

			expect(result).toBeNull();
		});

		it("should handle edge case timestamps", () => {
			const timestamp = "2024.12.31-23.59.59:999";

			const result = parseLogTimestamp(timestamp);

			expect(result).not.toBeNull();
			if (result) {
				expect(result.getUTCMonth()).toBe(11); // December
				expect(result.getUTCHours()).toBe(23);
				expect(result.getUTCMilliseconds()).toBe(999);
			}
		});
	});

	describe("parseChainID", () => {
		it("should parse ChainID from number string", () => {
			const result = parseChainID("42");

			expect(result).toBe(42 as unknown as ChainID);
		});

		it("should parse ChainID with leading spaces", () => {
			const result = parseChainID("  1");

			expect(result).toBe(1 as unknown as ChainID);
		});

		it("should return null for non-numeric string", () => {
			const result = parseChainID("abc");

			expect(result).toBeNull();
		});

		it("should handle larger numbers", () => {
			const result = parseChainID("999");

			expect(result).toBe(999 as unknown as ChainID);
		});
	});

	describe("formatLogTimestamp", () => {
		it("should format Date to Squad log timestamp format", () => {
			const date = new Date(Date.UTC(2024, 5, 15, 14, 30, 45, 123)); // June 15, 2024 UTC

			const result = formatLogTimestamp(date);

			expect(result).toBe("2024.06.15-14.30.45:123");
		});

		it("should pad single-digit values", () => {
			const date = new Date(Date.UTC(2024, 0, 5, 9, 5, 3, 7)); // Jan 5, 2024 UTC

			const result = formatLogTimestamp(date);

			expect(result).toBe("2024.01.05-09.05.03:007");
		});

		it("should handle year boundary", () => {
			const date = new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0));

			const result = formatLogTimestamp(date);

			expect(result).toBe("2025.01.01-00.00.00:000");
		});
	});
});

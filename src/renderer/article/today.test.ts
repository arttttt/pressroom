import { describe, expect, it } from "vitest";
import { localDate } from "./today.js";

describe("localDate", () => {
	it("gives the day where the person is, not in UTC", () => {
		// Just past midnight in Moscow is still the previous day in UTC, and
		// `toISOString().slice(0, 10)` would record the article as published
		// the day before it was.
		const justAfterMidnight = new Date(2026, 6, 27, 0, 30);
		expect(localDate(justAfterMidnight)).toBe("2026-07-27");
	});

	it("pads a single-digit month and day, so the dates sort", () => {
		expect(localDate(new Date(2026, 0, 5, 12, 0))).toBe("2026-01-05");
	});

	it("gives the last day of a year as that year's", () => {
		expect(localDate(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
	});
});

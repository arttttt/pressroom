import { describe, expect, it } from "vitest";
import { localDate, recordable } from "./recording.js";

const TODAY = "2026-07-27";
const ADDRESS = "https://habr.com/ru/articles/123456/";

function publication(url: string, publishedAt: string) {
	return { url, publishedAt };
}

describe("localDate", () => {
	it("gives the day where the person is, not the day in UTC", () => {
		// The suite runs with `TZ` pinned east of UTC (see package.json), and
		// that pin is what gives this test its teeth: where the two coincide it
		// passes for `toISOString().slice(0, 10)` too — the very implementation
		// it exists to forbid — and so protects nothing.
		expect(new Date().getTimezoneOffset()).toBeLessThan(0);

		const justAfterMidnight = new Date(2026, 6, 27, 0, 30);
		expect(localDate(justAfterMidnight)).toBe("2026-07-27");
		// The same instant, in UTC, is still the day before.
		expect(justAfterMidnight.toISOString().slice(0, 10)).toBe("2026-07-26");
	});

	it("pads a single-digit month and day, so the dates sort", () => {
		expect(localDate(new Date(2026, 0, 5, 12, 0))).toBe("2026-01-05");
	});

	it("gives the last day of a year as that year's", () => {
		expect(localDate(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
	});
});

describe("recordable", () => {
	it("takes an address and the day it went out", () => {
		expect(recordable(publication(ADDRESS, TODAY), TODAY)).toBe(true);
	});

	it("takes a publication recorded long after it happened", () => {
		// HackerNoon reviews before it publishes, so a story goes out days later
		// and is recorded later still.
		expect(recordable(publication(ADDRESS, "2026-06-01"), TODAY)).toBe(true);
	});

	it("refuses a day that has not come", () => {
		// The field's `max` only governs the calendar; a year typed into it
		// arrives here regardless.
		expect(recordable(publication(ADDRESS, "2062-07-27"), TODAY)).toBe(false);
		expect(recordable(publication(ADDRESS, "2026-07-28"), TODAY)).toBe(false);
	});

	it("refuses no day at all, because the field can be cleared", () => {
		expect(recordable(publication(ADDRESS, ""), TODAY)).toBe(false);
	});

	it("refuses text that merely begins with the word", () => {
		expect(recordable(publication("httpfoo", TODAY), TODAY)).toBe(false);
		expect(recordable(publication("https://", TODAY), TODAY)).toBe(false);
	});

	it("ignores whitespace around a pasted address", () => {
		expect(recordable(publication(`  ${ADDRESS}\n`, TODAY), TODAY)).toBe(true);
	});
});

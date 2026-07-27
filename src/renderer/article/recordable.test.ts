import { describe, expect, it } from "vitest";
import { recordable } from "./recordable.js";

const TODAY = "2026-07-27";
const ADDRESS = "https://habr.com/ru/articles/123456/";

describe("recordable", () => {
	it("takes an address and the day it went out", () => {
		expect(recordable(ADDRESS, TODAY, TODAY)).toBe(true);
	});

	it("takes a publication recorded long after it happened", () => {
		// HackerNoon reviews before it publishes, so a story goes out days later
		// and is recorded later still.
		expect(recordable(ADDRESS, "2026-06-01", TODAY)).toBe(true);
	});

	it("refuses a day that has not come", () => {
		// The field's `max` only governs the calendar; a year typed into it
		// arrives here regardless.
		expect(recordable(ADDRESS, "2062-07-27", TODAY)).toBe(false);
		expect(recordable(ADDRESS, "2026-07-28", TODAY)).toBe(false);
	});

	it("refuses no day at all, because the field can be cleared", () => {
		expect(recordable(ADDRESS, "", TODAY)).toBe(false);
	});

	it("refuses text that merely begins with the word", () => {
		expect(recordable("httpfoo", TODAY, TODAY)).toBe(false);
		expect(recordable("https://", TODAY, TODAY)).toBe(false);
	});

	it("ignores whitespace around a pasted address", () => {
		expect(recordable(`  ${ADDRESS}\n`, TODAY, TODAY)).toBe(true);
	});
});

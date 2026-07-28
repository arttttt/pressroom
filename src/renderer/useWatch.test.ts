import { describe, expect, it } from "vitest";
import { unchanged } from "./useWatch.js";

describe("unchanged", () => {
	it("keeps what is already there when the answer says the same thing", () => {
		// Identity is the point: React compares state by reference, and giving
		// it the old object back is how a poll every ten seconds declines to
		// rebuild the article somebody is reading.
		const was = { slug: "OnePlus 3T", ready: ["en", "ru"] };
		expect(unchanged(was, { slug: "OnePlus 3T", ready: ["en", "ru"] })).toBe(was);
	});

	it("hands over the new one when something has changed", () => {
		const was = { slug: "OnePlus 3T", ready: ["en"] };
		const fresh = { slug: "OnePlus 3T", ready: ["en", "ru"] };
		expect(unchanged(was, fresh)).toBe(fresh);
	});

	it("notices a change buried deep, since that is where translations appear", () => {
		// A section gained inside one language, everything else untouched.
		const was = { documents: [{ language: "ru", outline: [{ heading: "Зачем" }] }] };
		const fresh = { documents: [{ language: "ru", outline: [{ heading: "Зачем" }, { heading: "Сеть" }] }] };
		expect(unchanged(was, fresh)).toBe(fresh);
	});

	it("treats order as a change, because the index defines reading order", () => {
		const was = { outline: ["one", "two"] };
		expect(unchanged(was, { outline: ["two", "one"] })).not.toBe(was);
	});
});

import { describe, expect, it } from "vitest";
import { editorUrlFor, PLATFORMS } from "./registry.js";

/**
 * The table is written by hand and read by everything else, so what is worth
 * checking is that it stays coherent — not that it still says what it says.
 */
describe("PLATFORMS", () => {
	it("lists each platform exactly once", () => {
		const ids = PLATFORMS.map((platform) => platform.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("gives every browser platform an address to open", () => {
		for (const platform of PLATFORMS) {
			if (platform.delivery.kind !== "browser") continue;
			expect(platform.delivery.editorUrl, platform.id).toMatch(/^https:\/\//);
		}
	});

	it("gives the email platform somewhere to send to", () => {
		for (const platform of PLATFORMS) {
			if (platform.delivery.kind !== "email") continue;
			expect(platform.delivery.to, platform.id).toMatch(/^[^@\s]+@[^@\s]+$/);
		}
	});

	it("names at least one language per platform, or nothing can be sent there", () => {
		for (const platform of PLATFORMS) {
			expect(platform.languages.length, platform.id).toBeGreaterThan(0);
		}
	});
});

describe("editorUrlFor", () => {
	it("answers for every platform that has a page to open", () => {
		for (const platform of PLATFORMS) {
			if (platform.delivery.kind !== "browser") continue;
			expect(editorUrlFor(platform.id), platform.id).toBe(platform.delivery.editorUrl);
		}
	});

	it("refuses a platform that has no page, rather than opening a blank one", () => {
		// Hackaday is a tip line, not a place to publish: it takes an email and
		// has no editor. Asking it for one is a wiring mistake, and a browser
		// opening on nothing would hide it.
		expect(() => editorUrlFor("hackaday")).toThrow(/not opened in a browser/);
	});
});

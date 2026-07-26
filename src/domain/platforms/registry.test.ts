import { describe, expect, it } from "vitest";
import { PLATFORMS } from "./registry.js";

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

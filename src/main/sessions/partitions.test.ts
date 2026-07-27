import { describe, expect, it } from "vitest";
import { PLATFORMS } from "../../domain/platforms/registry.js";
import { browserUserAgent, partitionFor } from "./partitions.js";

describe("partitionFor", () => {
	it("asks for a persistent store, which is what survives a restart", () => {
		// Without the prefix Chromium keeps the session in memory and the login
		// dies with the window — the one thing these partitions exist to prevent.
		expect(partitionFor("habr")).toMatch(/^persist:/);
	});

	it("keeps platforms apart, so one login can be dropped without the others", () => {
		const partitions = PLATFORMS.map((platform) => partitionFor(platform.id));
		expect(new Set(partitions).size).toBe(PLATFORMS.length);
	});
});

describe("browserUserAgent", () => {
	it("does not announce Electron, which some login flows treat differently", () => {
		expect(browserUserAgent("131.0.6778.86")).not.toMatch(/electron/i);
	});

	it("reports the Chrome version it was given", () => {
		expect(browserUserAgent("131.0.6778.86")).toContain("Chrome/131.0.6778.86");
	});
});

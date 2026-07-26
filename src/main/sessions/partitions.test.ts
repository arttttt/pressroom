import { describe, expect, it } from "vitest";
import { PLATFORMS } from "../../domain/platforms/registry.js";
import { ALL_PARTITIONS, browserUserAgent, partitionFor } from "./partitions.js";

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

describe("ALL_PARTITIONS", () => {
	it("covers exactly the platforms that are opened in a browser", () => {
		// Reddit goes over its API and Hackaday over email; neither has a page to
		// stay logged in to. If this fails, the two lists have drifted apart and
		// a platform either lost its session or gained one it cannot use.
		const needSessions = PLATFORMS.filter((platform) => platform.delivery.kind === "browser").map(
			(platform) => platform.id,
		);
		expect([...ALL_PARTITIONS].sort()).toEqual([...needSessions].sort());
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

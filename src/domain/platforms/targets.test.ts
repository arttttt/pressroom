import { describe, expect, it } from "vitest";
import type { Publication } from "../../shared/publication.js";
import { PLATFORMS } from "./registry.js";
import { targetsFor } from "./targets.js";

const ON_HABR: Publication = {
	platform: "habr",
	language: "ru",
	url: "https://habr.com/ru/articles/123456/",
	publishedAt: "2026-07-27",
	canonical: true,
};

describe("targetsFor", () => {
	it("offers every platform, whether or not the text exists", () => {
		const platforms = new Set(targetsFor([]).map((target) => target.platform));
		expect(platforms).toEqual(new Set(PLATFORMS.map((platform) => platform.id)));
	});

	it("marks a target ready when the article has that language", () => {
		const habr = targetsFor(["ru"]).find((target) => target.platform === "habr");
		expect(habr?.language).toBe("ru");
		expect(habr?.state).toBe("ready");
	});

	it("marks a target missing when the article has not been written in its language", () => {
		// An English-only article has nothing for Habr, and that gap is the point.
		const habr = targetsFor(["en"]).find((target) => target.platform === "habr");
		expect(habr?.state).toBe("missing");
	});

	it("leaves an article with no text at all with nothing ready", () => {
		expect(targetsFor([]).every((target) => target.state === "missing")).toBe(true);
	});

	it("counts an English article's targets as every English platform", () => {
		const english = PLATFORMS.filter((platform) => platform.languages.includes("en")).length;
		expect(targetsFor(["en"]).filter((target) => target.state === "ready")).toHaveLength(english);
	});

	it("carries the delivery kind, so the interface can say how each one is reached", () => {
		const reddit = targetsFor(["en"]).find((target) => target.platform === "reddit");
		const hackaday = targetsFor(["en"]).find((target) => target.platform === "hackaday");
		expect(reddit?.delivery).toBe("browser");
		expect(hackaday?.delivery).toBe("email");
	});

	it("reports where the article has already gone, with its address", () => {
		const habr = targetsFor(["ru"], [ON_HABR]).find((target) => target.platform === "habr");
		expect(habr?.state).toBe("published");
		expect(habr?.url).toBe(ON_HABR.url);
	});

	it("counts having gone out as the fact, whatever the text now says", () => {
		// An article can be edited after publication; that does not unpublish it.
		const habr = targetsFor([], [ON_HABR]).find((target) => target.platform === "habr");
		expect(habr?.state).toBe("published");
	});

	it("leaves the other destinations as they were", () => {
		const targets = targetsFor(["en", "ru"], [ON_HABR]);
		expect(targets.filter((target) => target.state === "published")).toHaveLength(1);
		expect(targets.filter((target) => target.state === "ready")).toHaveLength(targets.length - 1);
	});

	it("carries no address for a destination it has not gone to", () => {
		expect(targetsFor(["en"]).every((target) => target.url === null)).toBe(true);
	});

	it("keeps the table's order, so the columns do not move between articles", () => {
		const first = targetsFor(["en", "ru"]).map((target) => `${target.platform}:${target.language}`);
		const second = targetsFor([]).map((target) => `${target.platform}:${target.language}`);
		expect(first).toEqual(second);
	});
});

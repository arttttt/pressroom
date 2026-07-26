import { describe, expect, it } from "vitest";
import type { Publication } from "../../shared/publication.js";
import {
	canonicalUrl,
	formatPublications,
	parsePublications,
	withPublication,
} from "./publications-note.js";

const HABR: Publication = {
	platform: "habr",
	language: "ru",
	url: "https://habr.com/ru/articles/123456/",
	publishedAt: "2026-07-27",
	canonical: true,
};

const REDDIT: Publication = {
	platform: "reddit",
	language: "en",
	url: "https://reddit.com/r/selfhosted/comments/abc/",
	publishedAt: "2026-07-28",
	canonical: false,
};

describe("parsePublications", () => {
	it("reads back what it wrote", () => {
		// The file is the record; a round trip that loses anything loses it for good.
		expect(parsePublications(formatPublications("An Article", [HABR, REDDIT]))).toEqual([HABR, REDDIT]);
	});

	it("finds nothing in a note that has no table yet", () => {
		expect(parsePublications("---\ntype: publications\n---\n\nNothing yet.\n")).toEqual([]);
	});

	it("skips a row someone mangled by hand instead of losing the rest", () => {
		const note = formatPublications("An Article", [HABR, REDDIT]).replace(
			"| reddit | en |",
			"| reddit | |",
		);
		expect(parsePublications(note).map((publication) => publication.platform)).toEqual(["habr"]);
	});

	it("ignores a row naming a platform Pressroom does not know", () => {
		const note = formatPublications("An Article", [HABR]).replace("| habr |", "| livejournal |");
		expect(parsePublications(note)).toEqual([]);
	});

	it("ignores a row with no address, which records nothing", () => {
		const note = formatPublications("An Article", [HABR]).replace(HABR.url, "");
		expect(parsePublications(note)).toEqual([]);
	});
});

describe("withPublication", () => {
	it("makes the first place an article goes out the canonical one", () => {
		const added = withPublication([], { ...HABR, canonical: false });
		expect(added[0]?.canonical).toBe(true);
	});

	it("leaves the canonical one alone when another place is added", () => {
		const list = withPublication([HABR], REDDIT);
		expect(list.find((publication) => publication.platform === "habr")?.canonical).toBe(true);
		expect(list.find((publication) => publication.platform === "reddit")?.canonical).toBe(false);
	});

	it("moves canonical rather than having two, when one is asked for", () => {
		// Exactly one address is the address; the announcements point at it.
		const list = withPublication([HABR], { ...REDDIT, canonical: true });
		expect(list.filter((publication) => publication.canonical)).toHaveLength(1);
		expect(list.find((publication) => publication.canonical)?.platform).toBe("reddit");
	});

	it("corrects an address rather than recording the same place twice", () => {
		const corrected = { ...HABR, url: "https://habr.com/ru/articles/999999/" };
		const list = withPublication([HABR], corrected);
		expect(list).toHaveLength(1);
		expect(list[0]?.url).toBe(corrected.url);
	});

	it("keeps one place per language, since a translation is its own publication", () => {
		const english = { ...HABR, language: "en" as const, url: "https://habr.com/en/articles/1/" };
		expect(withPublication([HABR], english)).toHaveLength(2);
	});
});

describe("canonicalUrl", () => {
	it("gives the address the announcements will point at", () => {
		expect(canonicalUrl([HABR, REDDIT])).toBe(HABR.url);
	});

	it("gives nothing while the article is still unpublished", () => {
		// Which is why Reddit, Hacker News and Hackaday cannot be prepared yet.
		expect(canonicalUrl([])).toBeNull();
	});
});

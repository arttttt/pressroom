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

	it("leaves a language's canonical alone when a second place takes that language", () => {
		const second = { ...REDDIT, platform: "hackernoon" as const, url: "https://hackernoon.com/x" };
		const list = withPublication([{ ...REDDIT, canonical: true }], second);
		expect(list.find((publication) => publication.platform === "reddit")?.canonical).toBe(true);
		expect(list.find((publication) => publication.platform === "hackernoon")?.canonical).toBe(false);
	});

	it("moves canonical rather than having two in one language, when one is asked for", () => {
		// Exactly one address per language is the address its announcements use.
		const english = { ...REDDIT, canonical: true };
		const list = withPublication([english], {
			platform: "hackernoon",
			language: "en",
			url: "https://hackernoon.com/x",
			publishedAt: "2026-07-29",
			canonical: true,
		});
		expect(list.filter((publication) => publication.canonical)).toHaveLength(1);
		expect(list.find((publication) => publication.canonical)?.platform).toBe("hackernoon");
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

	it("gives each language its own canonical, not one for the article", () => {
		// Pointing an English story at a Russian one as canonical tells a search
		// engine they are the same page. They are not.
		const english = { ...REDDIT, canonical: false };
		const both = withPublication([HABR], english);
		expect(both.filter((publication) => publication.canonical)).toHaveLength(2);
		expect(both.find((publication) => publication.language === "ru")?.canonical).toBe(true);
		expect(both.find((publication) => publication.language === "en")?.canonical).toBe(true);
	});

	it("moves canonical only within the language it was asked for", () => {
		const secondEnglish = {
			platform: "hackernoon" as const,
			language: "en" as const,
			url: "https://hackernoon.com/x",
			publishedAt: "2026-07-29",
			canonical: true,
		};
		const all = withPublication(withPublication([HABR], { ...REDDIT, canonical: true }), secondEnglish);
		expect(all.find((publication) => publication.platform === "habr")?.canonical).toBe(true);
		expect(all.find((publication) => publication.platform === "reddit")?.canonical).toBe(false);
		expect(all.find((publication) => publication.platform === "hackernoon")?.canonical).toBe(true);
	});
});

describe("canonicalUrl", () => {
	it("gives the address a language's announcements will point at", () => {
		expect(canonicalUrl([HABR, REDDIT], "ru")).toBe(HABR.url);
	});

	it("does not offer another language's address", () => {
		// A Russian article on Habr is not the original of an English one.
		expect(canonicalUrl([HABR], "en")).toBeNull();
	});

	it("leaves out a platform that is about to receive the article", () => {
		// A story does not declare itself a copy of itself.
		const english = { ...REDDIT, canonical: true };
		expect(canonicalUrl([english], "en", "reddit")).toBeNull();
		expect(canonicalUrl([english], "en")).toBe(english.url);
	});

	it("gives nothing while the language is still unpublished", () => {
		expect(canonicalUrl([], "en")).toBeNull();
	});
});

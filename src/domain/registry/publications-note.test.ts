import { describe, expect, it } from "vitest";
import type { Publication } from "../../shared/publication.js";
import {
	canonicalUrl,
	formatPublications,
	parsePublications,
	type PublicationRecord,
	withoutPublication,
	withPublication,
} from "./publications-note.js";

const HABR: Publication = {
	platform: "habr",
	language: "ru",
	url: "https://habr.com/ru/articles/123456/",
	publishedAt: "2026-07-27",
	canonical: true,
};

const HACKERNOON: Publication = {
	platform: "hackernoon",
	language: "en",
	url: "https://hackernoon.com/how-i-turned-a-oneplus-3t",
	publishedAt: "2026-07-20",
	canonical: true,
};

const REDDIT: Publication = {
	platform: "reddit",
	language: "en",
	url: "https://reddit.com/r/selfhosted/comments/abc/",
	publishedAt: "2026-07-28",
	canonical: false,
};

/** A record of nothing, which is what an unpublished article has. */
const NOTHING: PublicationRecord = { publications: [], unreadable: [] };

function recordOf(...publications: readonly Publication[]): PublicationRecord {
	return { publications, unreadable: [] };
}

describe("parsePublications", () => {
	it("reads back what it wrote", () => {
		// The file is the record; a round trip that loses anything loses it for good.
		const note = formatPublications("An Article", recordOf(HABR, REDDIT));
		expect(parsePublications(note)).toEqual(recordOf(HABR, REDDIT));
	});

	it("finds nothing in a note that has no table yet", () => {
		expect(parsePublications("---\ntype: publications\n---\n\nNothing yet.\n")).toEqual(NOTHING);
	});

	it("keeps a row it cannot read instead of quietly dropping it", () => {
		// Writing is a whole-file rewrite. A row skipped on the way in is a row
		// deleted from the vault on the way out — so it is carried through.
		const note = formatPublications("An Article", recordOf(HABR, REDDIT)).replace(
			"| reddit | en |",
			"| reddit | |",
		);
		const read = parsePublications(note);
		expect(read.publications.map((publication) => publication.platform)).toEqual(["habr"]);
		expect(read.unreadable).toEqual(["| reddit | | 2026-07-28 |  | https://reddit.com/r/selfhosted/comments/abc/ |"]);
	});

	it("keeps a row naming a platform it does not know, which someone meant", () => {
		const note = formatPublications("An Article", recordOf(HABR)).replace("| habr |", "| livejournal |");
		const read = parsePublications(note);
		expect(read.publications).toEqual([]);
		expect(read.unreadable).toHaveLength(1);
	});

	it("writes an unreadable row back out, so recording never costs it", () => {
		const note = formatPublications("An Article", recordOf(HABR)).replace("| habr |", "| livejournal |");
		const kept = withPublication(parsePublications(note), REDDIT);
		expect(formatPublications("An Article", kept)).toContain("| livejournal |");
	});

	it("ignores the table's own header and rule, which are not rows", () => {
		expect(parsePublications(formatPublications("An Article", NOTHING)).unreadable).toEqual([]);
	});
});

describe("withPublication", () => {
	it("makes the first place an article goes out the canonical one", () => {
		const added = withPublication(NOTHING, { ...HABR, canonical: false });
		expect(added.publications[0]?.canonical).toBe(true);
	});

	it("never lets a platform that only announces the article hold canonical", () => {
		// A Reddit thread is a message about the article, not the article. It
		// held canonical simply by being recorded first — and an announcement
		// usually is, because HackerNoon publishes days after it is submitted.
		const afterReddit = withPublication(NOTHING, REDDIT);
		expect(afterReddit.publications[0]?.canonical).toBe(false);
		expect(canonicalUrl(afterReddit.publications, "en")).toBeNull();
	});

	it("hands canonical to the article itself when it arrives later", () => {
		const both = withPublication(withPublication(NOTHING, REDDIT), { ...HACKERNOON, canonical: false });
		expect(canonicalUrl(both.publications, "en")).toBe(HACKERNOON.url);
	});

	it("strips canonical from an announcement row someone marked by hand", () => {
		const meddled = recordOf({ ...REDDIT, canonical: true });
		const settled = withPublication(meddled, HACKERNOON);
		const reddit = settled.publications.find((entry) => entry.platform === "reddit");
		expect(reddit?.canonical).toBe(false);
	});

	it("keeps one canonical per language, not one per article", () => {
		// A Russian article is not the original of an English one.
		const both = withPublication(withPublication(NOTHING, HABR), HACKERNOON);
		expect(both.publications.filter((entry) => entry.canonical)).toHaveLength(2);
		expect(canonicalUrl(both.publications, "ru")).toBe(HABR.url);
		expect(canonicalUrl(both.publications, "en")).toBe(HACKERNOON.url);
	});

	it("replaces a row for the same platform and language rather than adding one", () => {
		const corrected = { ...HABR, url: "https://habr.com/ru/articles/999999/" };
		const after = withPublication(recordOf(HABR), corrected);
		expect(after.publications).toHaveLength(1);
		expect(after.publications[0]?.url).toBe(corrected.url);
	});
});

describe("withoutPublication", () => {
	it("takes the row away", () => {
		const after = withoutPublication(recordOf(HABR, REDDIT), "reddit", "en");
		expect(after.publications.map((entry) => entry.platform)).toEqual(["habr"]);
	});

	it("hands canonical to what is left rather than leaving a language without one", () => {
		// Taking down the story that held canonical must not silently leave the
		// language published with nowhere for its announcements to point.
		const both = withPublication(withPublication(NOTHING, HACKERNOON), {
			...HABR,
			language: "en",
			platform: "habr",
			url: "https://habr.com/en/articles/1/",
		});
		const after = withoutPublication(both, "hackernoon", "en");
		expect(canonicalUrl(after.publications, "en")).toBe("https://habr.com/en/articles/1/");
	});

	it("leaves the rows it does not understand alone", () => {
		const record: PublicationRecord = { publications: [HABR], unreadable: ["| livejournal | ru |"] };
		expect(withoutPublication(record, "habr", "ru").unreadable).toEqual(["| livejournal | ru |"]);
	});
});

describe("canonicalUrl", () => {
	it("answers with nothing until the article is out somewhere", () => {
		expect(canonicalUrl([], "en")).toBeNull();
	});

	it("does not point a platform at itself", () => {
		expect(canonicalUrl([HACKERNOON], "en", "hackernoon")).toBeNull();
	});

	it("falls through to another place the article is, rather than answering nothing", () => {
		// An article on both Habr and HackerNoon in one language has somewhere
		// to point from either of them.
		const alsoHabr: Publication = { ...HABR, language: "en", url: "https://habr.com/en/articles/1/" };
		const record = withPublication(withPublication(NOTHING, HACKERNOON), alsoHabr).publications;
		expect(canonicalUrl(record, "en", "hackernoon")).toBe(alsoHabr.url);
	});

	it("never points an announcement at another announcement", () => {
		// Reddit's post must point at the article, not at a Hacker News thread.
		const hn: Publication = { ...REDDIT, platform: "hackernews", url: "https://news.ycombinator.com/item?id=1" };
		expect(canonicalUrl([REDDIT, hn], "en", "reddit")).toBeNull();
	});

	it("keeps to the language asked for", () => {
		expect(canonicalUrl([HABR, HACKERNOON], "ru")).toBe(HABR.url);
	});
});

describe("a value carrying the character the table is built from", () => {
	it("survives the round trip", () => {
		// An address with a bar in its query came back cut at the bar, and the
		// announcement then pointed at a broken page.
		const awkward: Publication = { ...HABR, url: "https://habr.com/a?q=a|b" };
		const note = formatPublications("An Article", recordOf(awkward));
		expect(parsePublications(note).publications[0]?.url).toBe(awkward.url);
	});

	it("does not let one turn a row into more fields than it has", () => {
		const awkward: Publication = { ...HABR, publishedAt: "2026|07|27" };
		const note = formatPublications("An Article", recordOf(awkward));
		const read = parsePublications(note).publications[0];
		expect(read?.publishedAt).toBe("2026|07|27");
		expect(read?.url).toBe(HABR.url);
	});
});

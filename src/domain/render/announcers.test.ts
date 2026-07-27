import { describe, expect, it } from "vitest";
import type { Article, ArticleDocument } from "../../shared/article.js";
import type { Publication } from "../../shared/publication.js";
import type { Rendered } from "../../shared/rendered.js";
import { renderFor } from "./renderers.js";

const ENGLISH: ArticleDocument = {
	language: "en",
	title: "How I Turned a OnePlus 3T into a postmarketOS Home Server",
	sections: [{ id: "s0", heading: "Why an old phone", body: "I'd wanted to self-host." }],
};

const ARTICLE: Article = { slug: "OnePlus 3T", title: ENGLISH.title, documents: [ENGLISH] };

const OUT: Publication = {
	platform: "hackernoon",
	language: "en",
	url: "https://hackernoon.com/how-i-turned-a-oneplus-3t",
	publishedAt: "2026-07-27",
	canonical: true,
};

const WORDS = {
	title: "I put postmarketOS on a 2016 phone and ran a bot on it for a year",
	body: "Bootloader, kernel, containers, and the parts that fought back.",
};

function prepared(platform: "reddit" | "hackernews" | "hackaday", announcement = WORDS): Rendered {
	const result = renderFor(ARTICLE, platform, [OUT], announcement);
	if (result.kind !== "rendered") throw new Error(`expected a rendered announcement: ${result.kind}`);
	return result.rendered;
}

describe("an announcement before the article is out", () => {
	it("cannot be prepared, and says why rather than failing", () => {
		for (const platform of ["reddit", "hackernews", "hackaday"] as const) {
			const result = renderFor(ARTICLE, platform, [], WORDS);
			expect(result.kind, platform).toBe("unsupported");
			if (result.kind !== "unsupported") continue;
			expect(result.reason).toContain("nowhere to point");
		}
	});

	it("does not count the platform's own publication as somewhere to point", () => {
		// A Reddit post announcing a Reddit post announces nothing.
		const onReddit: Publication = { ...OUT, platform: "reddit", url: "https://reddit.com/r/x/1" };
		expect(renderFor(ARTICLE, "reddit", [onReddit], WORDS).kind).toBe("unsupported");
	});
});

describe("Reddit", () => {
	it("posts a link to where the article actually is", () => {
		const rendered = prepared("reddit");
		if (rendered.platform !== "reddit") throw new Error("expected Reddit");
		expect(rendered.url).toBe(OUT.url);
	});

	it("uses the words written for it as the comment", () => {
		const rendered = prepared("reddit");
		if (rendered.platform !== "reddit") throw new Error("expected Reddit");
		expect(rendered.comment).toBe(WORDS.body);
	});

	it("prefers the title written for it over the article's own", () => {
		// The same piece is worth introducing differently to a link aggregator.
		const rendered = prepared("reddit");
		expect(rendered.platform === "reddit" && rendered.title).toBe(WORDS.title);
	});

	it("falls back to the article's title, and reports no comment as none", () => {
		const rendered = renderFor(ARTICLE, "reddit", [OUT], null);
		if (rendered.kind !== "rendered" || rendered.rendered.platform !== "reddit") {
			throw new Error("expected Reddit");
		}
		expect(rendered.rendered.title).toBe(ENGLISH.title);
		expect(rendered.rendered.comment).toBeNull();
	});
});

describe("Hacker News", () => {
	it("carries a title and an address and nothing else", () => {
		const rendered = prepared("hackernews");
		if (rendered.platform !== "hackernews") throw new Error("expected Hacker News");
		expect(Object.keys(rendered).sort()).toEqual(["platform", "title", "url"]);
		expect(rendered.url).toBe(OUT.url);
	});

	it("does not shorten a long title", () => {
		// Hacker News caps title length and the cap has moved over the years.
		// Cutting an author's title to fit a number Pressroom is unsure of would
		// be worse than showing it and letting them shorten it.
		const long = "x".repeat(140);
		const rendered = renderFor(ARTICLE, "hackernews", [OUT], { title: long, body: "" });
		if (rendered.kind !== "rendered" || rendered.rendered.platform !== "hackernews") {
			throw new Error("expected Hacker News");
		}
		expect(rendered.rendered.title).toBe(long);
	});
});

describe("Hackaday", () => {
	it("is addressed to the tip line", () => {
		const rendered = prepared("hackaday");
		if (rendered.platform !== "hackaday") throw new Error("expected Hackaday");
		expect(rendered.to).toBe("tips@hackaday.com");
		expect(rendered.subject).toBe(WORDS.title);
	});

	it("puts the address under the words, so the tip has something to follow", () => {
		const rendered = prepared("hackaday");
		if (rendered.platform !== "hackaday") throw new Error("expected Hackaday");
		expect(rendered.body).toBe(`${WORDS.body}\n\n${OUT.url}`);
	});

	it("is a link a mail client can open, with the message escaped into it", () => {
		const rendered = prepared("hackaday");
		if (rendered.platform !== "hackaday") throw new Error("expected Hackaday");
		expect(rendered.mailto.startsWith("mailto:tips@hackaday.com?")).toBe(true);
		// A raw newline or ampersand in the query would truncate the message.
		expect(rendered.mailto).not.toContain("\n");
		expect(rendered.mailto).toContain(encodeURIComponent(OUT.url));
	});

	it("sends the address alone when nothing has been written", () => {
		const rendered = renderFor(ARTICLE, "hackaday", [OUT], null);
		if (rendered.kind !== "rendered" || rendered.rendered.platform !== "hackaday") {
			throw new Error("expected Hackaday");
		}
		expect(rendered.rendered.body).toBe(OUT.url);
	});
});

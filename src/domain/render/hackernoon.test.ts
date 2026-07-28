import { describe, expect, it } from "vitest";
import type { Article, ArticleDocument } from "../../shared/article.js";
import type { Publication } from "../../shared/publication.js";
import { hackerNoonRenderer } from "./hackernoon.js";
import type { RenderContext } from "./renderer.js";
import { renderFor } from "./renderers.js";

const ENGLISH: ArticleDocument = {
	language: "en",
	title: "How I Turned a OnePlus 3T into a Home Server",
	sections: [
		{ id: "s0", heading: "Why an old phone", body: "I'd wanted to self-host." },
		{ id: "s1", heading: "Network access", body: "## Tailscale\n\n```sh\n# not a heading\ntailscale up\n```" },
	],
};

const RUSSIAN: ArticleDocument = {
	language: "ru",
	title: "Как я превратил старый OnePlus 3T в домашний сервер",
	sections: [{ id: "s0", heading: "Зачем старый телефон", body: "Текст." }],
};

const ARTICLE: Article = { slug: "OnePlus 3T", title: ENGLISH.title, documents: [ENGLISH, RUSSIAN] };

const ON_HABR: Publication = {
	platform: "habr",
	language: "ru",
	url: "https://habr.com/ru/articles/123456/",
	publishedAt: "2026-07-27",
	canonical: true,
};

const ON_A_BLOG: Publication = {
	platform: "hackernoon",
	language: "en",
	url: "https://hackernoon.com/how-i-turned-a-oneplus-3t",
	publishedAt: "2026-07-20",
	canonical: true,
};

describe("hackerNoonRenderer", () => {
	const nothing: RenderContext = { canonicalUrl: null, hubs: [], tags: [], announcement: null };

	/** HackerNoon always renders a HackerNoon story; narrowing says so. */
	function hackerNoon(context: RenderContext = nothing) {
		const rendered = hackerNoonRenderer.render(ENGLISH, context);
		if (rendered.platform !== "hackernoon") throw new Error("expected a HackerNoon story");
		return rendered;
	}

	it("puts the title in its own field and keeps it out of the body", () => {
		const rendered = hackerNoon();
		expect(rendered.title).toBe(ENGLISH.title);
		expect(rendered.body).not.toContain(ENGLISH.title);
	});

	it("sends the Markdown as assembled, which Editor 3.0 takes", () => {
		const rendered = hackerNoon();
		expect(rendered.body).toContain("## Why an old phone");
		expect(rendered.body).toContain("### Tailscale");
		expect(rendered.body).toContain("```sh\n# not a heading");
	});

	it("leaves First Seen At blank for a story published here first", () => {
		const rendered = hackerNoon();
		expect(rendered.firstSeenAt).toBeNull();
	});

	it("carries the address the text was first published at", () => {
		const rendered = hackerNoon({ ...nothing, canonicalUrl: "https://example.com/original" });
		expect(rendered.firstSeenAt).toBe("https://example.com/original");
	});
});

describe("renderFor, on the canonical address", () => {
	it("does not point an English story at a Russian one", () => {
		// They are different texts. Canonical says "this is the same page";
		// what relates translations is hreflang.
		const result = renderFor(ARTICLE, "hackernoon", [ON_HABR]);
		if (result.kind !== "rendered" || result.rendered.platform !== "hackernoon") {
			throw new Error("expected a rendered HackerNoon article");
		}
		expect(result.rendered.firstSeenAt).toBeNull();
	});

	it("does not point a story at itself", () => {
		// HackerNoon is where it already is; its own field stays blank.
		const result = renderFor(ARTICLE, "hackernoon", [ON_A_BLOG]);
		if (result.kind !== "rendered" || result.rendered.platform !== "hackernoon") {
			throw new Error("expected a rendered HackerNoon article");
		}
		expect(result.rendered.firstSeenAt).toBeNull();
	});

	it("points at the English original when there is one elsewhere", () => {
		const elsewhere: Publication = {
			...ON_A_BLOG,
			platform: "habr",
			url: "https://habr.com/en/articles/1/",
		};
		const result = renderFor(ARTICLE, "hackernoon", [elsewhere, ON_HABR]);
		if (result.kind !== "rendered" || result.rendered.platform !== "hackernoon") {
			throw new Error("expected a rendered HackerNoon article");
		}
		expect(result.rendered.firstSeenAt).toBe(elsewhere.url);
	});

	it("never points First Seen At at a place that only announced the article", () => {
		// A Reddit thread is a message about the story, not the story. This
		// field cannot be corrected once HackerNoon publishes.
		const announced: Publication = { ...ON_A_BLOG, platform: "reddit", canonical: true };
		const result = renderFor(ARTICLE, "hackernoon", [announced]);
		if (result.kind !== "rendered" || result.rendered.platform !== "hackernoon") {
			throw new Error("expected a rendered HackerNoon article");
		}
		expect(result.rendered.firstSeenAt).toBeNull();
	});

	it("still gives Habr the Russian document", () => {
		const result = renderFor(ARTICLE, "habr", [ON_HABR]);
		if (result.kind !== "rendered" || result.rendered.platform !== "habr") {
			throw new Error("expected a rendered Habr article");
		}
		expect(result.rendered.title).toBe(RUSSIAN.title);
	});
});

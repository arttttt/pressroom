import { describe, expect, it } from "vitest";
import type { Article, ArticleDocument } from "../../shared/article.js";
import { PLATFORMS } from "../platforms/registry.js";
import { habrRenderer } from "./habr.js";
import { renderFor, rendererFor } from "./renderers.js";

const RUSSIAN: ArticleDocument = {
	language: "ru",
	title: "Как я превратил старый OnePlus 3T в домашний сервер",
	sections: [{ id: "s0", heading: "Зачем старый телефон", body: "Текст." }],
};

const ENGLISH: ArticleDocument = {
	language: "en",
	title: "How I Turned a OnePlus 3T into a Home Server",
	sections: [{ id: "s0", heading: "Why an old phone", body: "Prose." }],
};

const BOTH: Article = { slug: "OnePlus 3T", title: ENGLISH.title, documents: [ENGLISH, RUSSIAN] };
const ENGLISH_ONLY: Article = { slug: "OnePlus 3T", title: ENGLISH.title, documents: [ENGLISH] };

describe("rendererFor", () => {
	it("finds the renderer a platform has", () => {
		expect(rendererFor("habr")).toBe(habrRenderer);
	});

	it("has one for every platform in the table", () => {
		// The lookup still answers with nothing, and `renderFor` still says so
		// plainly — that is for the platform added to the table before anyone
		// works out what its editor takes.
		for (const platform of PLATFORMS) {
			expect(rendererFor(platform.id), platform.displayName).not.toBeNull();
		}
	});
});

describe("renderFor", () => {
	it("takes the language the platform publishes, not the article's own", () => {
		// The article's title is English; Habr gets the Russian document.
		const result = renderFor(BOTH, "habr");
		expect(result.kind).toBe("rendered");
		if (result.kind !== "rendered" || result.rendered.platform !== "habr") return;
		expect(result.rendered.title).toBe(RUSSIAN.title);
	});

	it("says the article is not written in that language rather than sending the wrong one", () => {
		const result = renderFor(ENGLISH_ONLY, "habr");
		expect(result.kind).toBe("unsupported");
		if (result.kind !== "unsupported") return;
		expect(result.reason).toContain("ru");
		expect(result.reason).toContain("OnePlus 3T");
	});

	it("says an announcement has nowhere to point until the article is out", () => {
		// Reddit, Hacker News and Hackaday receive a message about the article,
		// and a message about an article is nothing without an address.
		const result = renderFor(BOTH, "hackernews");
		expect(result.kind).toBe("unsupported");
		if (result.kind !== "unsupported") return;
		expect(result.reason).toContain("Hacker News");
		expect(result.reason).toContain("record where it went");
	});

	it("tells the two apart, so the interface does not blame the wrong thing", () => {
		// One is an editor nobody has read; the other is an article not written
		// in that language. Both come back as `unsupported`, with the platform
		// named, and their reasons do not read alike.
		const noEditor = renderFor(BOTH, "reddit");
		const noText = renderFor(ENGLISH_ONLY, "habr");
		expect(noEditor.kind).toBe("unsupported");
		expect(noText.kind).toBe("unsupported");
		if (noEditor.kind !== "unsupported" || noText.kind !== "unsupported") return;
		expect(noEditor.reason).not.toBe(noText.reason);
	});

	it("leaves hubs and tags empty rather than inventing them", () => {
		const result = renderFor(BOTH, "habr");
		if (result.kind !== "rendered" || result.rendered.platform !== "habr") {
			throw new Error("expected a rendered Habr article");
		}
		expect(result.rendered.hubs).toEqual([]);
		expect(result.rendered.tags).toEqual([]);
	});
});

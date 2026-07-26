import { describe, expect, it } from "vitest";
import type { ArticleDocument } from "../../shared/article.js";
import { habrRenderer } from "./habr.js";
import type { RenderContext } from "./renderer.js";
import { rendererFor } from "./renderers.js";

const NOTHING: RenderContext = { canonicalUrl: null, hubs: [], tags: [] };

/** The shape the vault's articles actually have: sections with sub-headings. */
const ARTICLE: ArticleDocument = {
	language: "ru",
	title: "Как я превратил старый OnePlus 3T в домашний сервер",
	sections: [
		{ id: "s0", heading: "Зачем старый телефон", body: "Я давно хотел захостить свой проект." },
		{
			id: "s1",
			heading: "Сеть в контейнерах",
			// A sub-heading, and a snippet whose comment must survive untouched.
			body: "## containerd не стартует\n\n```sh\n# правим ExecStart\nsystemctl status containerd\n```",
		},
	],
};

describe("habrRenderer", () => {
	it("puts the title in its own field and keeps it out of the body", () => {
		const rendered = habrRenderer.render(ARTICLE, NOTHING);
		expect(rendered.title).toBe(ARTICLE.title);
		expect(rendered.body).not.toContain(ARTICLE.title);
	});

	it("sets section headings at the second level and their parts at the third", () => {
		const body = habrRenderer.render(ARTICLE, NOTHING).body;
		expect(body).toContain("## Зачем старый телефон");
		expect(body).toContain("### containerd не стартует");
	});

	it("leaves a shell comment in a snippet as a comment", () => {
		// Habr takes fenced blocks with a language, so the snippet goes as it is.
		const body = habrRenderer.render(ARTICLE, NOTHING).body;
		expect(body).toContain("```sh\n# правим ExecStart");
	});

	it("lifts a heading Habr would not render at all", () => {
		// Habr Flavored Markdown stops at the third level. A section carrying a
		// third-level heading would reach the fourth once assembled.
		const deep: ArticleDocument = {
			language: "ru",
			title: "Заголовки",
			sections: [{ id: "s0", heading: "Раздел", body: "### Слишком глубоко\n\nТекст." }],
		};
		const body = habrRenderer.render(deep, NOTHING).body;
		expect(body).toContain("### Слишком глубоко");
		expect(body).not.toContain("#### ");
	});

	it("carries the hubs and tags it was given", () => {
		const rendered = habrRenderer.render(ARTICLE, {
			canonicalUrl: null,
			hubs: ["linux", "diy"],
			tags: ["postmarketOS", "OnePlus 3T"],
		});
		expect(rendered.hubs).toEqual(["linux", "diy"]);
		expect(rendered.tags).toEqual(["postmarketOS", "OnePlus 3T"]);
	});

	it("reports no hubs as none rather than as an empty string", () => {
		expect(habrRenderer.render(ARTICLE, NOTHING).hubs).toEqual([]);
	});
});

describe("rendererFor", () => {
	it("finds the renderer a platform has", () => {
		expect(rendererFor("habr")).toBe(habrRenderer);
	});

	it("answers with nothing for a platform whose editor has not been looked at", () => {
		// Better than a renderer that emits plain Markdown and hopes.
		expect(rendererFor("hackernoon")).toBeNull();
		expect(rendererFor("reddit")).toBeNull();
	});
});

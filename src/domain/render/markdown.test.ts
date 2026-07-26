import { describe, expect, it } from "vitest";
import type { ArticleDocument } from "../../shared/article.js";
import { assembleMarkdown, demoteHeadings } from "./markdown.js";

describe("demoteHeadings", () => {
	it("moves every heading one level down", () => {
		expect(demoteHeadings("# One\n\n## Two\n\n##### Five")).toBe("## One\n\n### Two\n\n###### Five");
	});

	it("leaves the deepest level alone rather than producing seven hashes", () => {
		expect(demoteHeadings("###### Six")).toBe("###### Six");
	});

	it("leaves a shell comment inside a fence alone", () => {
		// The whole reason this tracks fences: `# ` opens a comment in every
		// shell snippet these articles are full of.
		const text = "# Reproducing it\n\n```sh\n# flash the image\n./install.sh\n```\n\n## After";
		expect(demoteHeadings(text)).toBe(
			"## Reproducing it\n\n```sh\n# flash the image\n./install.sh\n```\n\n### After",
		);
	});

	it("handles tilde fences and longer fences the same way", () => {
		const text = "~~~\n# not a heading\n~~~\n\n````\n# nor this\n````\n\n# heading";
		expect(demoteHeadings(text)).toBe(
			"~~~\n# not a heading\n~~~\n\n````\n# nor this\n````\n\n## heading",
		);
	});

	it("does not let a shorter fence close a longer one", () => {
		// ``` inside a ```` block is content, so the block is still open.
		const text = "````\n```\n# still inside\n````\n\n# heading";
		expect(demoteHeadings(text)).toBe("````\n```\n# still inside\n````\n\n## heading");
	});

	it("does not treat a hashtag as a heading", () => {
		expect(demoteHeadings("#draft and #another")).toBe("#draft and #another");
	});

	it("keeps a fence that never closes from swallowing what follows silently", () => {
		// Everything after an unclosed fence is code as far as Markdown is
		// concerned, and this must agree with that rather than guess.
		expect(demoteHeadings("```\n# inside\n\n# also inside")).toBe("```\n# inside\n\n# also inside");
	});
});

const DOCUMENT: ArticleDocument = {
	language: "en",
	title: "How I Turned a OnePlus 3T into a postmarketOS Home Server",
	sections: [
		{ id: "s0-introduction", heading: "Why an old phone", body: "I'd wanted to self-host." },
		{ id: "s1-network", heading: "Network access", body: "## Tailscale\n\nIt just works." },
	],
};

describe("assembleMarkdown", () => {
	it("joins the sections under their own headings", () => {
		expect(assembleMarkdown(DOCUMENT).body).toBe(
			"## Why an old phone\n\nI'd wanted to self-host.\n\n## Network access\n\n### Tailscale\n\nIt just works.",
		);
	});

	it("keeps the title out of the body, because every target has a title field", () => {
		const rendered = assembleMarkdown(DOCUMENT);
		expect(rendered.title).toBe(DOCUMENT.title);
		expect(rendered.body).not.toContain(DOCUMENT.title);
	});

	it("carries no platform extras, having no platform", () => {
		expect(assembleMarkdown(DOCUMENT).fields).toEqual({});
	});

	it("still emits the heading of a section that has nothing under it yet", () => {
		const draft: ArticleDocument = {
			language: "en",
			title: "Draft",
			sections: [{ id: "s0", heading: "Planned", body: "" }],
		};
		expect(assembleMarkdown(draft).body).toBe("## Planned");
	});

	it("produces nothing for a document with no sections", () => {
		expect(assembleMarkdown({ language: "en", title: "Empty", sections: [] }).body).toBe("");
	});
});

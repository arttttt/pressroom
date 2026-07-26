import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown.js";
import { splitSource } from "./source.js";

const SOURCE = [
	"## Why an old phone",
	"",
	"Prose.",
	"",
	"## Reproducing it",
	"",
	"```sh",
	"## not a heading, a comment",
	"./install.sh",
	"```",
].join("\n");

const HEADINGS = ["Why an old phone", "Reproducing it"];

describe("splitSource", () => {
	it("gives back the source exactly when the parts are joined", () => {
		// What is shown has to stay the text that gets copied.
		expect(
			splitSource(SOURCE, HEADINGS)
				.map((part) => part.text)
				.join(""),
		).toBe(SOURCE);
	});

	it("anchors each part to the section the preview gives it", () => {
		expect(splitSource(SOURCE, HEADINGS).map((part) => part.id)).toEqual(["section-0", "section-1"]);
	});

	it("does not open a section on a comment that looks like a heading", () => {
		// `## ` starts a comment in half the shell snippets these articles carry.
		expect(splitSource(SOURCE, HEADINGS)).toHaveLength(2);
	});

	it("keeps anything before the first heading, unanchored", () => {
		const parts = splitSource("A note first.\n\n## Why an old phone\n\nProse.", HEADINGS);
		expect(parts[0]?.id).toBeNull();
		expect(parts[0]?.text).toBe("A note first.\n\n");
	});

	it("uses the anchors the preview actually wrote into its HTML", () => {
		// The two views are reached by one contents, so the ids have to agree.
		const preview = renderMarkdown(SOURCE);
		const parts = splitSource(
			SOURCE,
			preview.sections.map((section) => section.heading),
		);
		expect(parts.map((part) => part.id)).toEqual(preview.sections.map((section) => section.id));
	});

	it("leaves a document with no headings in one piece", () => {
		expect(splitSource("Just prose.", [])).toEqual([{ id: null, text: "Just prose." }]);
	});

	it("returns nothing for an empty document rather than an empty part", () => {
		expect(splitSource("", [])).toEqual([{ id: null, text: "" }]);
	});
});

describe("renderMarkdown, sections", () => {
	it("anchors every section heading the assembly produced", () => {
		const preview = renderMarkdown(SOURCE);
		expect(preview.sections).toEqual([
			{ id: "section-0", heading: "Why an old phone" },
			{ id: "section-1", heading: "Reproducing it" },
		]);
		expect(preview.html).toContain('<h2 id="section-0">');
	});

	it("leaves sub-headings out, so the contents stays the article's sections", () => {
		const preview = renderMarkdown("## A section\n\n### A part of it\n\nProse.");
		expect(preview.sections.map((section) => section.heading)).toEqual(["A section"]);
	});

	it("does not anchor a heading inside a fenced block", () => {
		expect(renderMarkdown("```\n## not a heading\n```").sections).toEqual([]);
	});
});

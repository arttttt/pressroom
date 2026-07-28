import { describe, expect, it } from "vitest";
import type { ArticleDocument } from "../../shared/article.js";
import { assembleMarkdown, capHeadings, demoteHeadings } from "./markdown.js";

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

describe("capHeadings", () => {
	it("lifts anything deeper than the platform allows", () => {
		expect(capHeadings("#### Four\n\n##### Five", 3)).toBe("### Four\n\n### Five");
	});

	it("leaves headings the platform renders alone", () => {
		expect(capHeadings("# One\n\n## Two\n\n### Three", 3)).toBe("# One\n\n## Two\n\n### Three");
	});

	it("leaves a comment inside a fence alone, however many hashes it has", () => {
		const text = "```sh\n#### not a heading\n```\n\n#### a heading";
		expect(capHeadings(text, 3)).toBe("```sh\n#### not a heading\n```\n\n### a heading");
	});

	it("keeps the heading's text exactly", () => {
		expect(capHeadings("####   Spaced out  ", 3)).toBe("###   Spaced out  ");
	});

	it("does not touch a hashtag", () => {
		expect(capHeadings("#### and #draft", 3)).toBe("### and #draft");
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

describe("text as it actually comes out of the vault", () => {
	it("keeps a shell comment a comment when the note has Windows line endings", () => {
		// The one that mattered: `\r` on every line made fence detection fail
		// outright, so `# ` inside a snippet was rewritten as a heading — the
		// exact corruption fence handling exists to prevent.
		const note = "# Reproducing it\r\n\r\n```sh\r\n# flash the image\r\n./install.sh\r\n```";
		const demoted = demoteHeadings(note);
		expect(demoted).toContain("\n# flash the image");
		expect(demoted).not.toContain("## flash the image");
	});

	it("reads a heading through a byte-order mark", () => {
		expect(demoteHeadings("﻿# Title")).toContain("## Title");
	});
});

describe("headings written with an underline", () => {
	it("demotes one, instead of letting a level-one heading through", () => {
		expect(demoteHeadings("Tailscale\n=========")).toBe("## Tailscale");
		expect(demoteHeadings("Tailscale\n---------")).toBe("### Tailscale");
	});

	it("leaves a horizontal rule alone, which is the same characters", () => {
		// A rule has no line of text directly above it; that is the difference.
		expect(demoteHeadings("Prose.\n\n---\n\nMore.")).toBe("Prose.\n\n---\n\nMore.");
	});

	it("leaves an underline inside a code block alone", () => {
		const note = "```\nOutput\n======\n```";
		expect(demoteHeadings(note)).toBe(note);
	});
});

describe("a fence that is not a fence", () => {
	it("does not let a paragraph mentioning backticks open a block", () => {
		// An info string may not contain a backtick, so this line is prose —
		// and the heading after it must still be demoted.
		expect(demoteHeadings("```a`b\n# Real")).toContain("## Real");
	});
});

describe("a section that leaves a fence open", () => {
	it("does not let it run on into the sections joined after it", () => {
		const assembled = assembleMarkdown({
			language: "en",
			title: "T",
			sections: [
				{ id: "s0", heading: "Alpha", body: "```sh\necho hi" },
				{ id: "s1", heading: "Beta", body: "#### Deep" },
			],
		});
		// Beta's heading is outside any block, so capping can still reach it.
		expect(capHeadings(assembled.body, 3)).toContain("### Deep");
		expect(capHeadings(assembled.body, 3)).not.toContain("##### Deep");
	});
});

import { describe, expect, it } from "vitest";
import type { Rendered } from "../../shared/rendered.js";
import { bodyFlavours } from "./clipboard.js";

const BODY = [
	"## Why an old phone",
	"",
	"I'd wanted to self-host.",
	"",
	"```sh",
	"tailscale up",
	"```",
].join("\n");

describe("what goes on the clipboard for HackerNoon", () => {
	const rendered: Rendered = {
		platform: "hackernoon",
		title: "How I Turned a OnePlus 3T into a Home Server",
		body: BODY,
		firstSeenAt: null,
	};

	it("sends the document as well as the source", () => {
		// Its editor sniffs pasted text to decide whether it is Markdown, and
		// when it decides wrong the article arrives as one flat run of
		// characters with the line breaks gone. HTML leaves nothing to sniff.
		const { text, html } = bodyFlavours(rendered);
		expect(text).toBe(BODY);
		expect(html).not.toBeNull();
	});

	it("turns headings and fences into elements rather than characters", () => {
		const html = bodyFlavours(rendered).html ?? "";
		expect(html).toContain("<h2");
		expect(html).toContain("<pre>");
		expect(html).not.toContain("## Why an old phone");
	});
});

describe("what goes on the clipboard for Habr", () => {
	it("is the source and nothing else", () => {
		// Its editor is put into a mode that expects Markdown, by hand. Handing
		// that a rendered document undoes the very thing the mode is for.
		const rendered: Rendered = {
			platform: "habr",
			title: "Как я превратил старый OnePlus 3T в домашний сервер",
			body: BODY,
			hubs: [],
			tags: [],
		};
		expect(bodyFlavours(rendered)).toEqual({ text: BODY, html: null });
	});
});

describe("what goes on the clipboard for the platforms that announce", () => {
	it("is the words for Reddit, and nothing where none were written", () => {
		const base = { platform: "reddit", title: "t", url: "https://example.com" } as const;
		expect(bodyFlavours({ ...base, comment: "Words." })).toEqual({ text: "Words.", html: null });
		expect(bodyFlavours({ ...base, comment: null })).toEqual({ text: "", html: null });
	});
});

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

describe("what goes on the clipboard", () => {
	const article: Rendered = {
		platform: "hackernoon",
		title: "How I Turned a OnePlus 3T into a Home Server",
		body: BODY,
		firstSeenAt: null,
	};

	it("sends a document where the editor wants one", () => {
		// HackerNoon's editor sniffs pasted text to decide whether it is
		// Markdown, and deciding wrong it lays the article out as one flat
		// paragraph. HTML leaves nothing to sniff.
		const { text, html } = bodyFlavours(article, "document");
		expect(text).toBe(BODY);
		expect(html).toContain("<h2");
		expect(html).toContain("<pre>");
		expect(html).not.toContain("## Why an old phone");
	});

	it("sends the source where the editor was put into a mode expecting it", () => {
		// Habr's Markdown mode is switched on by hand; a rendered document
		// undoes the very thing the mode is for.
		expect(bodyFlavours(article, "source")).toEqual({ text: BODY, html: null });
	});

	it("carries the words written for Reddit, and nothing where none were", () => {
		const base = { platform: "reddit", title: "t", url: "https://example.com" } as const;
		expect(bodyFlavours({ ...base, comment: "Words." }, "none").text).toBe("Words.");
		expect(bodyFlavours({ ...base, comment: null }, "none").text).toBe("");
	});
});

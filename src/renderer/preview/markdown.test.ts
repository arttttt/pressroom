import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown.js";

describe("renderMarkdown", () => {
	it("sets the section headings the assembly produced", () => {
		expect(renderMarkdown("## Why an old phone")).toContain("<h2>Why an old phone</h2>");
	});

	it("keeps a fenced block's language, so it can be styled as code", () => {
		const html = renderMarkdown("```sh\ntailscale up\n```");
		expect(html).toContain("<pre>");
		expect(html).toContain("language-sh");
	});

	it("renders the tables these articles are full of", () => {
		const html = renderMarkdown("| a | b |\n|---|---|\n| 1 | 2 |");
		expect(html).toContain("<table>");
		expect(html).toContain("<td>1</td>");
	});

	it("keeps links, which are how these articles cite their sources", () => {
		expect(renderMarkdown("[repo](https://github.com/arttttt/x)")).toContain(
			'<a href="https://github.com/arttttt/x">repo</a>',
		);
	});

	it("escapes raw HTML instead of letting a note write markup into the window", () => {
		// The preview shares a document with the bridge to the main process, so
		// text out of the vault must never become markup.
		const html = renderMarkdown("<img src=x onerror=alert(1)>");
		expect(html).not.toContain("<img");
		expect(html).toContain("&lt;img");
	});

	it("escapes an inline script the same way", () => {
		expect(renderMarkdown("<script>alert(1)</script>")).not.toContain("<script>");
	});

	it("escapes HTML written inside a link's text", () => {
		expect(renderMarkdown("[<b>bold</b>](https://example.com)")).not.toContain("<b>");
	});

	it("leaves a bare address as text rather than making it a link", () => {
		// Linkifying is a change to what the author wrote; the preview shows the
		// text, it does not improve it.
		expect(renderMarkdown("see https://example.com for more")).not.toContain("<a href");
	});

	it("does not turn a single newline into a line break", () => {
		// Markdown joins those into one paragraph, and every target does too.
		expect(renderMarkdown("one\ntwo")).not.toContain("<br>");
	});

	it("produces nothing for an empty document", () => {
		expect(renderMarkdown("").trim()).toBe("");
	});
});

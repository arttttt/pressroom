import type { ArticleDocument } from "../../shared/article.js";
import type { RenderedArticle } from "./renderer.js";

/**
 * A fenced block opener: three or more backticks or tildes, indented no more
 * than three spaces. What follows on the line is the info string.
 */
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const ATX_HEADING = /^( {0,3})(#{1,6})([ \t]|$)/;
const MAX_HEADING_LEVEL = 6;

/**
 * Pushes every heading one level down, leaving fenced code untouched.
 *
 * Section notes are written standalone, so their own heading is `#` and any
 * heading inside them starts at `##`. Assembled into one article those move
 * down a level, and the shell script in a code block that begins with `# ` is
 * a comment rather than a heading — which is why this tracks fences instead of
 * matching line by line.
 */
export function demoteHeadings(markdown: string): string {
	let openedWith: string | null = null;

	return markdown
		.split("\n")
		.map((line) => {
			const fence = FENCE.exec(line);
			if (fence !== null) {
				const marker = fence[1] ?? "";
				if (openedWith === null) {
					// An info string may not contain a backtick, so a line like
					// ```js opens a block; ``` inside one can only ever close it.
					openedWith = marker;
				} else if (
					marker[0] === openedWith[0] &&
					marker.length >= openedWith.length &&
					(fence[2] ?? "").trim().length === 0
				) {
					openedWith = null;
				}
				return line;
			}

			if (openedWith !== null) return line;

			const heading = ATX_HEADING.exec(line);
			if (heading === null) return line;
			const hashes = heading[2] ?? "";
			if (hashes.length >= MAX_HEADING_LEVEL) return line;
			return `${heading[1] ?? ""}#${line.trimStart()}`;
		})
		.join("\n");
}

/**
 * Joins a document's sections into one piece of plain Markdown.
 *
 * The title is kept out of the body: every target has its own title field, and
 * repeating it as a heading duplicates it on the published page. Section
 * headings therefore become the document's top level, at `##`.
 *
 * This is also the base the platform renderers work from — each of them starts
 * from plain Markdown and adjusts, so what they share lives here rather than
 * being written out five times.
 */
export function assembleMarkdown(doc: ArticleDocument): RenderedArticle {
	const body = doc.sections
		.map((section) => {
			const prose = demoteHeadings(section.body).trim();
			const heading = `## ${section.heading}`;
			return prose.length === 0 ? heading : `${heading}\n\n${prose}`;
		})
		.join("\n\n");

	return { title: doc.title, body, fields: {} };
}

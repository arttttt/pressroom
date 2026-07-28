import type { ArticleDocument } from "../../shared/article.js";
import { normalise } from "../vault/text.js";

/**
 * A fenced block opener: three or more backticks or tildes, indented no more
 * than three spaces. What follows on the line is the info string.
 */
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const ATX_HEADING = /^( {0,3})(#{1,6})([ \t]|$)/;
/** The `====` or `----` that turns the line above it into a heading. */
const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)[ \t]*$/;
const DEEPEST_LEVEL = 6;

/** A document's own text, before any platform has had a say in it. */
export interface PlainDocument {
	readonly title: string;
	readonly body: string;
}

/**
 * Applies a change to every line except those inside a fenced block.
 *
 * Every transform here has the same reason to know about fences: `# ` opens a
 * comment in the shell snippets these articles are full of, and rewriting one
 * as a heading corrupts the command. Fences are matched as Markdown defines
 * them, so a shorter run cannot close a longer one.
 */
function outsideFences(markdown: string, change: (line: string) => string): string {
	let openedWith: string | null = null;

	return normalise(markdown)
		.split("\n")
		.map((line) => {
			const before = openedWith;
			openedWith = afterFence(line, openedWith);
			// Left alone: the line that opens a block, everything inside it,
			// and the line that closes it. A line that merely looks like a
			// fence and is not one — a paragraph carrying ```a`b — is ordinary
			// text and is treated as such.
			const opensOrCloses = before !== openedWith;
			return opensOrCloses || before !== null ? line : change(line);
		})
		.join("\n");
}

/**
 * Rewrites underlined headings as `#` ones, so that everything below deals
 * with a single form.
 *
 * `Title` over `=====` is a first-level heading and `Title` over `-----` a
 * second, and neither was demoted or capped — an underlined heading sailed
 * through as a level one and landed in the middle of an assembled article,
 * above the `##` sections it belonged under.
 *
 * The underline is only a heading when a line of text sits directly above it,
 * which is what separates `-----` the heading from `-----` the horizontal
 * rule. Anything else is left exactly as written.
 */
function asAtxHeadings(markdown: string): string {
	const rewritten: string[] = [];
	let openedWith: string | null = null;

	for (const line of normalise(markdown).split("\n")) {
		// Its own fence tracking, because an underline inside a code block is
		// part of the code — a table of `=====` in sample output would
		// otherwise turn the line above it into a heading.
		openedWith = afterFence(line, openedWith);
		if (openedWith !== null) {
			rewritten.push(line);
			continue;
		}

		const underline = SETEXT_UNDERLINE.exec(line);
		const above = rewritten.at(-1);
		const heads =
			underline !== null &&
			above !== undefined &&
			above.trim().length > 0 &&
			ATX_HEADING.exec(above) === null &&
			FENCE.exec(above) === null &&
			SETEXT_UNDERLINE.exec(above) === null;

		if (!heads) {
			rewritten.push(line);
			continue;
		}
		rewritten[rewritten.length - 1] = `${(underline[1] ?? "").startsWith("=") ? "#" : "##"} ${(above ?? "").trim()}`;
	}

	return rewritten.join("\n");
}

/**
 * The fence state after this line: the marker a block is open with, or nothing.
 *
 * One reading of a fence line, used by everything here that has to know where
 * code begins and ends.
 */
function afterFence(line: string, openedWith: string | null): string | null {
	const fence = FENCE.exec(line);
	if (fence === null) return openedWith;
	const marker = fence[1] ?? "";
	const info = fence[2] ?? "";

	if (openedWith === null) {
		// A backtick fence's info string may not contain a backtick.
		return marker.startsWith("`") && info.includes("`") ? null : marker;
	}
	const closes =
		marker[0] === openedWith[0] && marker.length >= openedWith.length && info.trim().length === 0;
	return closes ? null : openedWith;
}

/**
 * The fence a passage leaves open, if it leaves one open.
 *
 * A section is written to be read on its own, so a fence it never closes is
 * closed at its end — which is what a Markdown reader does at the end of a
 * document anyway. Left alone, that unclosed fence ran on into every section
 * after it once they were joined, and quietly disabled heading-capping for all
 * of them.
 */
function unclosedFence(markdown: string): string | null {
	let openedWith: string | null = null;
	for (const line of normalise(markdown).split("\n")) openedWith = afterFence(line, openedWith);
	return openedWith;
}

/**
 * Pushes every heading one level down.
 *
 * Section notes are written standalone, so their own heading is `#` and any
 * heading inside them starts at `##`. Assembled into one article those move
 * down a level.
 */
export function demoteHeadings(markdown: string): string {
	return outsideFences(asAtxHeadings(markdown), (line) => {
		const heading = ATX_HEADING.exec(line);
		if (heading === null) return line;
		const hashes = heading[2] ?? "";
		if (hashes.length >= DEEPEST_LEVEL) return line;
		return `${heading[1] ?? ""}#${line.trimStart()}`;
	});
}

/**
 * Lifts anything deeper than a platform allows up to its deepest level.
 *
 * Habr stops at the third; a heading below that is not rendered small, it is
 * not rendered as a heading at all. Flattening is the lesser loss — the text
 * keeps its emphasis, and only the distinction between two depths goes.
 */
export function capHeadings(markdown: string, deepest: number): string {
	return outsideFences(markdown, (line) => {
		const heading = ATX_HEADING.exec(line);
		if (heading === null) return line;
		const hashes = heading[2] ?? "";
		if (hashes.length <= deepest) return line;
		return `${heading[1] ?? ""}${"#".repeat(deepest)}${line.trimStart().slice(hashes.length)}`;
	});
}

/**
 * Joins a document's sections into one piece of plain Markdown.
 *
 * The title is kept out of the body: every target has its own title field, and
 * repeating it as a heading duplicates it on the published page. Section
 * headings therefore become the document's top level, at `##`.
 *
 * This is the base every platform renderer works from — each starts here and
 * adjusts, so what they share lives in one place rather than being written out
 * five times.
 */
export function assembleMarkdown(doc: ArticleDocument): PlainDocument {
	const body = doc.sections
		.map((section) => {
			const demoted = demoteHeadings(section.body);
			// A section is written to be read on its own, so a fence it never
			// closes is closed at its end rather than being allowed to run on
			// into the sections joined after it.
			const open = unclosedFence(demoted);
			const prose = (open === null ? demoted : `${demoted}\n${open}`).trim();
			const heading = `## ${section.heading}`;
			return prose.length === 0 ? heading : `${heading}\n\n${prose}`;
		})
		.join("\n\n");

	return { title: doc.title, body };
}

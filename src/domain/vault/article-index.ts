import { splitFrontmatter } from "./frontmatter.js";

/** One entry of the contents list, in the order the index lists it. */
export interface IndexEntry {
	/** The section file's stem, e.g. `s3-server-problems`. */
	readonly id: string;
	/**
	 * The link's display text where the author gave one. Navigation help rather
	 * than the published heading — the section file's own heading wins.
	 */
	readonly label: string | null;
}

export interface ArticleIndex {
	/** From frontmatter. Absent where the note has none. */
	readonly title: string | null;
	readonly entries: readonly IndexEntry[];
}

/**
 * Both link styles the vault actually uses, matched in one pass so that reading
 * order survives an index that mixes them.
 *
 * Obsidian writes `[[target|label]]`, optionally with a `#heading` anchor that
 * is not part of the file name. Plain Markdown writes `[label](path/to.md)`,
 * with the label and the target the other way round. The leading `!` catches
 * images, which are not sections.
 */
const WIKILINK = String.raw`\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]`;
const MARKDOWN_LINK = String.raw`\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)`;
const LINK = new RegExp(`(!)?(?:${WIKILINK}|${MARKDOWN_LINK})`, "g");

/**
 * Reads a language index note.
 *
 * Reading order is the order the links appear, not the numbering beside them:
 * a hand-edited list renumbers badly, and the numbers are decoration in every
 * index this vault holds. A link repeated further down is ignored — the first
 * mention is where the section belongs.
 */
export function parseArticleIndex(text: string): ArticleIndex {
	const { fields, body } = splitFrontmatter(text);

	const entries: IndexEntry[] = [];
	const seen = new Set<string>();
	for (const line of outsideFences(body)) {
		for (const match of line.matchAll(LINK)) {
			const [, image, wikiTarget, wikiLabel, linkLabel, linkTarget] = match;
			if (image !== undefined) continue;

			// A wikilink is reduced the same way a Markdown link is. It was
			// taken verbatim, so `[[sections/s0-intro]]` — which Obsidian
			// writes as soon as a basename is ambiguous — became the id
			// `sections/s0-intro` and the reader looked for the file under
			// `sections/sections/`, failing the whole article.
			const id = wikiTarget === undefined ? sectionIdFrom(linkTarget) : noteName(wikiTarget);
			if (id === null || id.length === 0) continue;

			// Compared case-insensitively: the vault is on a case-insensitive
			// disk, so `[[S0-Intro]]` and `[[s0-intro]]` are one file and must
			// not both take a place in the reading order.
			const already = id.toLowerCase();
			if (seen.has(already)) continue;
			seen.add(already);

			entries.push({ id, label: cleaned(wikiTarget !== undefined ? wikiLabel : linkLabel) });
		}
	}

	return { title: cleaned(fields.get("title")), entries };
}

/**
 * The section a Markdown link points at, or nothing if it points elsewhere.
 *
 * An index is prose as well as a contents list, so a link to somebody's
 * repository must not be mistaken for a section. Only a relative path to a note
 * counts.
 */
function sectionIdFrom(target: string | undefined): string | null {
	if (target === undefined) return null;
	if (target.includes("://") || target.startsWith("/") || target.startsWith("#")) return null;
	// A link that climbs out of this article's folder points at somebody
	// else's section; reduced to its basename it would silently resolve to a
	// same-named section of this article and take a place in its reading order.
	if (target.split("/").includes("..")) return null;

	const withoutFragment = target.split("#")[0] ?? "";
	if (!withoutFragment.toLowerCase().endsWith(".md")) return null;
	return noteName(withoutFragment.slice(0, -".md".length));
}

/** The file's own name, without the folders above it or its extension. */
function noteName(target: string): string {
	const withoutFragment = (target.split("#")[0] ?? "").trim();
	const name = withoutFragment.split("/").pop() ?? "";
	return decodeSafely(name.toLowerCase().endsWith(".md") ? name.slice(0, -".md".length) : name).trim();
}

/**
 * The index's lines, minus anything inside a fenced block.
 *
 * An index that documents its own format — a fenced example showing what a
 * section link looks like — otherwise contributed a phantom section, and the
 * reader then failed the whole article looking for a file nobody wrote.
 */
function outsideFences(body: string): readonly string[] {
	const kept: string[] = [];
	let openedWith: string | null = null;

	for (const line of body.split("\n")) {
		const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
		if (fence === null) {
			if (openedWith === null) kept.push(line);
			continue;
		}
		const marker = fence[1] ?? "";
		if (openedWith === null) openedWith = marker;
		else if (marker[0] === openedWith[0] && marker.length >= openedWith.length) openedWith = null;
	}

	return kept;
}

/** Obsidian percent-encodes spaces in links; a malformed escape is left as written. */
function decodeSafely(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

function cleaned(value: string | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed === undefined || trimmed.length === 0 ? null : trimmed;
}

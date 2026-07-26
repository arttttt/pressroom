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
	for (const match of body.matchAll(LINK)) {
		const [, image, wikiTarget, wikiLabel, linkLabel, linkTarget] = match;
		if (image !== undefined) continue;

		const id = wikiTarget !== undefined ? wikiTarget.trim() : sectionIdFrom(linkTarget);
		if (id === null || id.length === 0 || seen.has(id)) continue;
		seen.add(id);

		entries.push({ id, label: cleaned(wikiTarget !== undefined ? wikiLabel : linkLabel) });
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

	const withoutFragment = target.split("#")[0] ?? "";
	if (!withoutFragment.toLowerCase().endsWith(".md")) return null;

	const name = withoutFragment.slice(0, -".md".length).split("/").pop() ?? "";
	return decodeSafely(name).trim();
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

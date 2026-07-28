import type { Language } from "../../shared/article.js";
import type { PlatformId } from "../../shared/platform.js";
import type { Publication } from "../../shared/publication.js";
import { PLATFORMS } from "../platforms/registry.js";

const LANGUAGES: readonly Language[] = ["en", "ru"];

const HEADER = ["platform", "language", "published", "canonical", "url"] as const;

/**
 * A note read back: what Pressroom understood, and what it did not.
 *
 * The second half is the point. The note lives in the vault and is meant to be
 * corrected by hand, so it will contain rows this application cannot read — a
 * platform it does not know, a row someone reformatted, a line of their own
 * notes. Writing is a whole-file rewrite, so anything dropped on the way in is
 * deleted from the vault on the way out. Carrying the raw text through is what
 * keeps the promise the module made and did not keep.
 */
export interface PublicationRecord {
	readonly publications: readonly Publication[];
	/** Rows that are not the header, the rule, or anything readable. */
	readonly unreadable: readonly string[];
}

/**
 * The note Pressroom keeps beside an article, listing where it has gone out.
 *
 * A Markdown table because it lives in the vault: Obsidian renders it, a
 * person can read it and correct it by hand, and it survives this application
 * being deleted. That is the whole reason the record is here rather than in a
 * database of Pressroom's own.
 */
export function parsePublications(note: string): PublicationRecord {
	const publications: Publication[] = [];
	const unreadable: string[] = [];

	for (const raw of note.split(/\r?\n/)) {
		const line = raw.trim();
		if (!line.startsWith("|")) continue; // prose around the table is not a row
		const row = cells(line);

		if (row[0] === HEADER[0]) continue; // the header itself
		if (/^:?-+:?$/.test(row[0] ?? "")) continue; // the rule under it

		const publication = read(row);
		if (publication === null) unreadable.push(line);
		else publications.push(publication);
	}

	return { publications, unreadable };
}

/** The note as Pressroom writes it, for an article that has been somewhere. */
export function formatPublications(slug: string, record: PublicationRecord): string {
	const rows = record.publications.map((publication) =>
		row([
			publication.platform,
			publication.language,
			publication.publishedAt,
			publication.canonical ? "yes" : "",
			publication.url,
		]),
	);

	return [
		"---",
		"type: publications",
		`article: ${slug}`,
		"---",
		"",
		"Where this article has been published. Pressroom keeps this file up to date,",
		"and it stays readable without it.",
		"",
		row([...HEADER]),
		row(HEADER.map(() => "---")),
		...rows,
		// Kept exactly as they were found. Pressroom does not understand them,
		// which is not the same as their being worthless.
		...record.unreadable,
		"",
	].join("\n");
}

/**
 * Adds a publication, then settles the record's one rule.
 *
 * Recording the same platform and language again replaces that row rather than
 * adding a second — an article is not published twice to one place, and a
 * corrected address should correct rather than accumulate.
 */
export function withPublication(record: PublicationRecord, added: Publication): PublicationRecord {
	const others = record.publications.filter(
		(publication) => publication.platform !== added.platform || publication.language !== added.language,
	);
	return { ...record, publications: settle([...others, added]) };
}

/** For a publication recorded by mistake, or one that has been taken down. */
export function withoutPublication(
	record: PublicationRecord,
	platform: PlatformId,
	language: Language,
): PublicationRecord {
	const kept = record.publications.filter(
		(publication) => publication.platform !== platform || publication.language !== language,
	);
	// Settled again rather than merely filtered: removing the canonical row
	// must hand that status to what remains, or the language is published and
	// has nothing to point at.
	return { ...record, publications: settle(kept) };
}

/**
 * The record's one rule: a single canonical entry **per language**, and only
 * ever on a platform that carries the article.
 *
 * Not one per article. A Russian article on Habr is not the original of an
 * English one on HackerNoon — they are different texts, and pointing one at
 * the other as canonical tells a search engine they are the same page. What
 * relates translations is hreflang, not canonical.
 *
 * And never on Reddit, Hacker News or Hackaday. Those receive a message about
 * the article; the article is not there. Letting one hold canonical — which it
 * did, simply by being recorded first, and an announcement usually is — put a
 * Reddit thread into HackerNoon's "First Seen At", a field that cannot be
 * corrected once the story is out.
 */
function settle(publications: readonly Publication[]): readonly Publication[] {
	const canonical = new Map<Language, Publication>();

	for (const publication of publications) {
		if (!carriesArticle(publication.platform)) continue;
		const held = canonical.get(publication.language);
		// The author's own choice wins; otherwise the first one recorded for
		// that language, which is the one that was published first.
		if (held === undefined || (publication.canonical && !held.canonical)) {
			canonical.set(publication.language, publication);
		}
	}

	return publications.map((publication) => ({
		...publication,
		canonical: canonical.get(publication.language) === publication,
	}));
}

/**
 * The address a language's announcements point at, once there is one.
 *
 * `except` leaves out a platform that is about to receive the article: a story
 * does not declare itself a copy of itself, and HackerNoon's own field is left
 * blank for an original. Leaving it out falls through to another place the
 * article is published rather than answering with nothing — an article on both
 * Habr and HackerNoon has somewhere to point from either.
 */
export function canonicalUrl(
	publications: readonly Publication[],
	language: Language,
	except?: PlatformId,
): string | null {
	const here = publications.filter(
		(publication) =>
			publication.language === language &&
			publication.platform !== except &&
			carriesArticle(publication.platform),
	);
	return (here.find((publication) => publication.canonical) ?? here[0])?.url ?? null;
}

/** Whether the article itself is there, or only a message about it. */
function carriesArticle(platform: PlatformId): boolean {
	return PLATFORMS.find((entry) => entry.id === platform)?.carries === "article";
}

/** One row, or nothing if it is not one this application can act on. */
function read(row: readonly string[]): Publication | null {
	if (row.length < HEADER.length) return null;
	const platform = PLATFORMS.find((entry) => entry.id === row[0])?.id;
	const language = LANGUAGES.find((entry) => entry === row[1]);
	const url = row[4] ?? "";
	if (platform === undefined || language === undefined || url.length === 0) return null;
	return {
		platform,
		language,
		publishedAt: row[2] ?? "",
		canonical: (row[3] ?? "").toLowerCase() === "yes",
		url,
	};
}

/**
 * A row's cells, split on the bars that are actually separators.
 *
 * A bar inside a value is written `\|`, as Markdown's own tables require, and
 * is not one. Unescaped, an address carrying `?q=a|b` came back as
 * `?q=a` — and a date carrying one came back as three different fields.
 */
function cells(line: string): readonly string[] {
	return line
		.slice(1, endsWithSeparator(line) ? -1 : undefined)
		.split(/(?<!\\)\|/)
		.map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function endsWithSeparator(line: string): boolean {
	return line.endsWith("|") && !line.endsWith("\\|");
}

function row(values: readonly string[]): string {
	return `| ${values.map((value) => value.replace(/\|/g, "\\|")).join(" | ")} |`;
}

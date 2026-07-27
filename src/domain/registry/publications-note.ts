import type { Language } from "../../shared/article.js";
import type { PlatformId } from "../../shared/platform.js";
import type { Publication } from "../../shared/publication.js";
import { PLATFORMS } from "../platforms/registry.js";

const LANGUAGES: readonly Language[] = ["en", "ru"];

const HEADER = ["platform", "language", "published", "canonical", "url"] as const;

/**
 * The note Pressroom keeps beside an article, listing where it has gone out.
 *
 * A Markdown table because it lives in the vault: Obsidian renders it, a
 * person can read it and correct it by hand, and it survives this application
 * being deleted. That is the whole reason the record is here rather than in a
 * database of Pressroom's own.
 *
 * Anything unreadable in the table is skipped rather than thrown, because a
 * hand-edited row must not cost the author the rest of the record.
 */
export function parsePublications(note: string): readonly Publication[] {
	const rows = note
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.startsWith("|"))
		.map(cells);

	const publications: Publication[] = [];
	for (const row of rows) {
		if (row.length < HEADER.length) continue;
		if (row[0] === HEADER[0]) continue; // the header itself
		if (/^-+$/.test(row[0] ?? "")) continue; // the rule under it

		const platform = PLATFORMS.find((entry) => entry.id === row[0])?.id;
		const language = LANGUAGES.find((entry) => entry === row[1]);
		const url = row[4] ?? "";
		if (platform === undefined || language === undefined || url.length === 0) continue;

		publications.push({
			platform,
			language,
			publishedAt: row[2] ?? "",
			canonical: (row[3] ?? "").toLowerCase() === "yes",
			url,
		});
	}
	return publications;
}

/** The note as Pressroom writes it, for an article that has been somewhere. */
export function formatPublications(slug: string, publications: readonly Publication[]): string {
	const rows = publications.map((publication) =>
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
		"",
	].join("\n");
}

/**
 * Adds a publication, keeping the record's one rule: a single canonical entry
 * **per language**.
 *
 * Not one per article. A Russian article on Habr is not the original of an
 * English one on HackerNoon — they are different texts, and pointing one at
 * the other as canonical tells a search engine they are the same page. What
 * relates translations is hreflang, not canonical.
 *
 * The first place a language goes out becomes the one its announcements point
 * at. Recording the same platform and language again replaces that row rather
 * than adding a second — an article is not published twice to one place, and a
 * corrected address should correct rather than accumulate.
 */
export function withPublication(
	existing: readonly Publication[],
	added: Publication,
): readonly Publication[] {
	const others = existing.filter(
		(publication) => publication.platform !== added.platform || publication.language !== added.language,
	);

	const sameLanguage = others.filter((publication) => publication.language === added.language);
	const canonical = added.canonical || !sameLanguage.some((publication) => publication.canonical);

	return [
		...others.map((publication) =>
			canonical && publication.language === added.language
				? { ...publication, canonical: false }
				: publication,
		),
		{ ...added, canonical },
	];
}

/**
 * The address a language's announcements point at, once there is one.
 *
 * `except` leaves out a platform that is about to receive the article: a story
 * does not declare itself a copy of itself, and HackerNoon's own field is left
 * blank for an original.
 */
export function canonicalUrl(
	publications: readonly Publication[],
	language: Language,
	except?: PlatformId,
): string | null {
	return (
		publications.find(
			(publication) =>
				publication.canonical && publication.language === language && publication.platform !== except,
		)?.url ?? null
	);
}

function cells(line: string): readonly string[] {
	return line
		.slice(1, line.endsWith("|") ? -1 : undefined)
		.split("|")
		.map((cell) => cell.trim());
}

function row(values: readonly string[]): string {
	return `| ${values.join(" | ")} |`;
}

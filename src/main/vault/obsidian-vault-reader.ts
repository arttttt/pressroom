import { type Announcement, parseAnnouncement } from "../../domain/announce/announcement.js";
import { parseArticleIndex } from "../../domain/vault/article-index.js";
import { UnsupportedArticleLayout, type VaultReader } from "../../domain/vault/reader.js";
import { parseSectionNote } from "../../domain/vault/section-note.js";
import type { Article, ArticleDocument, Language, Section } from "../../shared/article.js";
import type { PlatformId } from "../../shared/platform.js";
import { type VaultHttp, VaultPathMissing } from "./rest-client.js";

const LANGUAGES: readonly Language[] = ["en", "ru"];

/** The vault folder the articles live under. */
const ARTICLES = "Статьи";

/** The folder whose presence marks an article as written in sections. */
const SECTIONS = "sections";

/** Where the author keeps a message per platform, one note each. */
const ANNOUNCEMENTS = "announcements";

/**
 * Reads articles out of the vault through the Local REST API plugin.
 *
 * This is the one place that knows the folder layout. Everything above it works
 * in articles, documents and sections, so moving a folder or renaming a
 * language changes this file and nothing else.
 */
export class ObsidianVaultReader implements VaultReader {
	constructor(
		private readonly http: VaultHttp,
		private readonly articles: string = ARTICLES,
	) {}

	async listArticles(): Promise<readonly string[]> {
		const entries = await this.http.listDirectory(`${this.articles}/`);
		return entries.filter(isFolder).map(withoutSlash);
	}

	async availableLanguages(slug: string): Promise<readonly Language[]> {
		const entries = await this.http.listDirectory(`${this.articles}/${slug}/`);
		const present = new Set(entries.filter(isFolder).map(withoutSlash));
		// Ordered as LANGUAGES is, so callers get a stable list rather than
		// whatever order the folder happened to be listed in.
		return LANGUAGES.filter((language) => present.has(language));
	}

	async splitLanguages(slug: string, among?: readonly Language[]): Promise<readonly Language[]> {
		// The caller usually knows which languages there are, having just asked.
		// Listing the article's folder again for every article on the desk, on
		// every poll, doubled the requests for an answer already in hand.
		const languages = among ?? (await this.availableLanguages(slug));
		const split = await Promise.all(
			languages.map(async (language) => {
				const entries = await this.http.listDirectory(`${this.articles}/${slug}/${language}/`);
				return entries.includes(`${SECTIONS}/`) ? language : null;
			}),
		);
		return split.filter((language): language is Language => language !== null);
	}

	async readAnnouncement(slug: string, platform: PlatformId): Promise<Announcement | null> {
		// Absent is the ordinary case; anything else is raised. Reporting a
		// failed read as "the author wrote none" sends the article's own title
		// to Hacker News in place of the headline they wrote for it, and says
		// nothing about having done so.
		const note = await this.http
			.readFile(`${this.articles}/${slug}/${ANNOUNCEMENTS}/${platform}.md`)
			.catch((cause: unknown) => {
				if (cause instanceof VaultPathMissing) return null;
				throw cause;
			});
		return note === null ? null : parseAnnouncement(note);
	}

	/**
	 * Every language the article has. An article with no language folders yet is
	 * not an error — it is a folder someone has started; it comes back with no
	 * documents, and `availableLanguages` is how a caller asks in advance.
	 */
	async readArticle(slug: string): Promise<Article> {
		const languages = await this.availableLanguages(slug);
		const documents = await Promise.all(
			languages.map((language) => this.readDocument(slug, language)),
		);
		const preferred = documents.find((document) => document.language === "en") ?? documents[0];
		return { slug, title: preferred?.title ?? slug, documents };
	}

	private async readDocument(slug: string, language: Language): Promise<ArticleDocument> {
		const folder = `${this.articles}/${slug}/${language}`;
		const entries = await this.http.listDirectory(`${folder}/`);

		if (!entries.includes(`${SECTIONS}/`)) {
			throw new UnsupportedArticleLayout(
				slug,
				language,
				`'${slug}' has no ${SECTIONS}/ folder in ${language}, so it is one note rather than an index. Split it into sections to publish it.`,
			);
		}

		const index = parseArticleIndex(await this.http.readFile(`${folder}/${indexNote(entries, slug)}`));
		if (index.entries.length === 0) {
			throw new UnsupportedArticleLayout(
				slug,
				language,
				`The index of '${slug}' in ${language} links to no sections, so there is nothing to assemble.`,
			);
		}

		const sections = await Promise.all(
			index.entries.map(async (entry): Promise<Section> => {
				const note = parseSectionNote(await this.http.readFile(`${folder}/${SECTIONS}/${entry.id}.md`));
				// The note's own heading is what gets published; the index label is
				// navigation, and the id is the last resort so a section without
				// either still appears rather than vanishing.
				return { id: entry.id, heading: note.heading ?? entry.label ?? entry.id, body: note.body };
			}),
		);

		return { language, title: index.title ?? slug, sections };
	}
}

/**
 * The index note, which the layout names after the article. Falling back to the
 * only note present keeps a renamed folder readable instead of failing on a
 * name mismatch nobody would think to look for.
 */
function indexNote(entries: readonly string[], slug: string): string {
	const notes = entries.filter((entry) => !isFolder(entry) && entry.endsWith(".md"));
	const named = notes.find((entry) => entry === `${slug}.md`);
	if (named !== undefined) return named;
	if (notes.length === 1 && notes[0] !== undefined) return notes[0];
	throw new Error(
		`Could not tell which note indexes '${slug}': expected '${slug}.md', found ${describe(notes)}.`,
	);
}

function describe(notes: readonly string[]): string {
	return notes.length === 0 ? "no notes" : notes.map((note) => `'${note}'`).join(", ");
}

function isFolder(entry: string): boolean {
	return entry.endsWith("/");
}

function withoutSlash(entry: string): string {
	return entry.slice(0, -1);
}

import {
	formatPublications,
	parsePublications,
	withPublication,
} from "../../domain/registry/publications-note.js";
import type { PublicationRegistry } from "../../domain/registry/registry.js";
import type { Language } from "../../shared/article.js";
import type { PlatformId } from "../../shared/platform.js";
import type { Publication } from "../../shared/publication.js";
import type { VaultHttp } from "./rest-client.js";

/** The vault folder the articles live under, as the reader has it. */
const ARTICLES = "Статьи";

/** The note kept beside an article, listing where it has gone out. */
const NOTE = "published.md";

/**
 * Where each article has been published, recorded in the vault beside it.
 *
 * Not in a database of Pressroom's own: the record travels with the text, is
 * versioned with it, and stays readable — and correctable — in Obsidian
 * without this application. That is worth more than the convenience of a
 * table Pressroom alone could read.
 */
export class ObsidianPublicationRegistry implements PublicationRegistry {
	constructor(
		private readonly http: VaultHttp,
		private readonly articles: string = ARTICLES,
	) {}

	/**
	 * An article that has been nowhere has no note, and that is not an error —
	 * it is the ordinary state of everything not yet published.
	 */
	async list(slug: string): Promise<readonly Publication[]> {
		const note = await this.http.readFile(this.pathFor(slug)).catch(() => null);
		return note === null ? [] : parsePublications(note);
	}

	async record(slug: string, publication: Publication): Promise<readonly Publication[]> {
		const next = withPublication(await this.list(slug), publication);
		await this.http.writeFile(this.pathFor(slug), formatPublications(slug, next));
		return next;
	}

	async forget(slug: string, platform: PlatformId, language: Language): Promise<readonly Publication[]> {
		const next = (await this.list(slug)).filter(
			(publication) => publication.platform !== platform || publication.language !== language,
		);
		await this.http.writeFile(this.pathFor(slug), formatPublications(slug, next));
		return next;
	}

	private pathFor(slug: string): string {
		return `${this.articles}/${slug}/${NOTE}`;
	}
}

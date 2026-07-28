import {
	formatPublications,
	parsePublications,
	type PublicationRecord,
	withoutPublication,
	withPublication,
} from "../../domain/registry/publications-note.js";
import type { PublicationRegistry } from "../../domain/registry/registry.js";
import type { Language } from "../../shared/article.js";
import type { PlatformId } from "../../shared/platform.js";
import type { Publication } from "../../shared/publication.js";
import { type VaultHttp, VaultPathMissing } from "./rest-client.js";

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

	async list(slug: string): Promise<readonly Publication[]> {
		return (await this.read(slug)).publications;
	}

	async record(slug: string, publication: Publication): Promise<readonly Publication[]> {
		return this.rewrite(slug, (record) => withPublication(record, publication));
	}

	async forget(slug: string, platform: PlatformId, language: Language): Promise<readonly Publication[]> {
		return this.rewrite(slug, (record) => withoutPublication(record, platform, language));
	}

	/**
	 * Reads the note, or answers with an empty record if there is none.
	 *
	 * **Only** if there is none. Every other failure is raised, because writing
	 * is a whole-file rewrite: treating a plugin that answered 500 as "this
	 * article has been published nowhere" replaced the entire record with a
	 * single row, and the interface then displayed the loss as if it were
	 * correct.
	 */
	private async read(slug: string): Promise<PublicationRecord> {
		const note = await this.http.readFile(this.pathFor(slug)).catch((cause: unknown) => {
			if (cause instanceof VaultPathMissing) return null;
			throw cause;
		});
		return note === null ? { publications: [], unreadable: [] } : parsePublications(note);
	}

	/** Read, change, write — the only shape either mutation has. */
	private async rewrite(
		slug: string,
		change: (record: PublicationRecord) => PublicationRecord,
	): Promise<readonly Publication[]> {
		const next = change(await this.read(slug));
		await this.http.writeFile(this.pathFor(slug), formatPublications(slug, next));
		return next.publications;
	}

	private pathFor(slug: string): string {
		return `${this.articles}/${slug}/${NOTE}`;
	}
}

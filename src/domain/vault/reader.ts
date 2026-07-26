import type { Article, Language } from "../../shared/article.js";

/**
 * An article folder that is not in the layout below.
 *
 * The vault still holds articles written before that layout existed — a single
 * note per language, with no sections. Those are not converted on the fly:
 * guessing at a structure the author has not written produces something that
 * looks right and is not. They are listed like any other article and refused
 * with this when read, which is a prompt to split them rather than a failure to
 * hide. Distinct from a transport error so a caller can tell "this article is
 * not ready" from "Obsidian is not answering".
 */
export class UnsupportedArticleLayout extends Error {
	constructor(
		readonly slug: string,
		readonly language: Language,
		message: string,
	) {
		super(message);
		this.name = "UnsupportedArticleLayout";
	}
}

/**
 * Reads articles out of the Obsidian vault, and writes the publication record
 * back into it.
 *
 * Access goes through Obsidian's Local REST API plugin rather than through the
 * filesystem. Reading files directly would work, but writing them would not:
 * the vault is open in Obsidian and synced through Google Drive, and a second
 * writer produces conflicts and stale editor state. Going through Obsidian
 * means it stays the only thing mutating its own files.
 *
 * The plugin is therefore a requirement for running Pressroom, not an option.
 *
 * Vault layout this port encodes, and which nothing above it should know:
 *
 *   <vault>/Статьи/<Article Title>/
 *     plan.md
 *     en/<Article Title>.md        index: title + ordered section links
 *     en/sections/sN-name.md       one section per file
 *     ru/…
 *
 * The index defines reading order.
 */
export interface VaultReader {
	listArticles(): Promise<readonly string[]>;
	readArticle(slug: string): Promise<Article>;
	/** Languages that actually have an index file for this article. */
	availableLanguages(slug: string): Promise<readonly Language[]>;
}

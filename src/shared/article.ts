/**
 * An article as it exists in the vault: one folder, one plan, and one document
 * per language made of ordered section files.
 */

export type Language = "en" | "ru";

export interface Section {
	/** File stem, e.g. `s3-the-control-experiment`. Defines order via the index. */
	readonly id: string;
	readonly heading: string;
	readonly body: string;
}

export interface ArticleDocument {
	readonly language: Language;
	readonly title: string;
	/** In reading order, as listed by the language index file. */
	readonly sections: readonly Section[];
}

export interface Article {
	/** Vault folder name, used as the stable identity of the article. */
	readonly slug: string;
	readonly title: string;
	readonly documents: readonly ArticleDocument[];
}

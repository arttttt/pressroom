import type { Language } from "./article.js";

/** A section as it appears in the assembled document. */
export interface OutlineEntry {
	readonly heading: string;
	readonly characters: number;
}

/** One language of an article, already joined into a single document. */
export interface AssembledDocument {
	readonly language: Language;
	readonly title: string;
	/**
	 * The sections in reading order.
	 *
	 * What wants checking before an article goes out is the assembly — every
	 * section present, in the order the index gives — and that is read from the
	 * headings far faster than from twenty thousand characters of prose.
	 */
	readonly outline: readonly OutlineEntry[];
	readonly body: string;
}

/**
 * What came of opening an article.
 *
 * A union rather than a thrown error, because an error class does not survive
 * the trip across the bridge — only its message would arrive, and "this article
 * is in the old layout" would be indistinguishable from "Obsidian is not
 * running". The interface needs to tell those apart to say anything useful.
 */
export type ArticleResult =
	| { readonly kind: "ready"; readonly slug: string; readonly title: string; readonly documents: readonly AssembledDocument[] }
	| { readonly kind: "unsupported"; readonly slug: string; readonly reason: string }
	| { readonly kind: "failed"; readonly slug: string; readonly reason: string };

import type { Language } from "./article.js";

/** One language of an article, already joined into a single document. */
export interface AssembledDocument {
	readonly language: Language;
	readonly title: string;
	readonly sections: number;
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

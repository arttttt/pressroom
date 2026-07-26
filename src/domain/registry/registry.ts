import type { Language } from "../../shared/article.js";
import type { PlatformId } from "../../shared/platform.js";

export interface Publication {
	readonly articleSlug: string;
	readonly platform: PlatformId;
	readonly language: Language;
	readonly url: string;
	/** ISO date the publication went live. */
	readonly publishedAt: string;
	/** Exactly one publication per article should carry this. */
	readonly canonical: boolean;
}

/**
 * Where each article has been published.
 *
 * Stored in the vault beside the article rather than in a database of its own,
 * so the record travels with the text, is versioned with it, and stays readable
 * without this application.
 */
export interface PublicationRegistry {
	list(articleSlug?: string): Promise<readonly Publication[]>;
	record(publication: Publication): Promise<void>;
	/** Platform and language combinations an article has not been sent to yet. */
	gaps(articleSlug: string): Promise<readonly { platform: PlatformId; language: Language }[]>;
}

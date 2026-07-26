import type { Language } from "../../shared/article.js";
import type { PlatformId } from "../../shared/platform.js";
import type { Publication } from "../../shared/publication.js";

export type { Publication };

/**
 * Where each article has been published.
 *
 * Kept in the vault beside the article rather than in a database of this
 * application's own, so the record travels with the text, is versioned with
 * it, and stays readable — and correctable by hand — without Pressroom.
 *
 * Everything here is per article, because that is how the record is stored:
 * one note beside one folder. The slug is the address of the record, not a
 * field inside it.
 */
export interface PublicationRegistry {
	list(slug: string): Promise<readonly Publication[]>;
	/**
	 * Records a place an article has gone out, and answers with the record as it
	 * now stands — the caller needs it anyway, and reading it back would be a
	 * second round trip to the vault for something already known.
	 */
	record(slug: string, publication: Publication): Promise<readonly Publication[]>;
	/** For a publication recorded by mistake, or one that has been taken down. */
	forget(slug: string, platform: PlatformId, language: Language): Promise<readonly Publication[]>;
}

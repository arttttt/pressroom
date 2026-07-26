import type { Language } from "./article.js";
import type { PlatformId } from "./platform.js";

/** One place an article has actually gone out. */
export interface Publication {
	readonly platform: PlatformId;
	readonly language: Language;
	readonly url: string;
	/** The day it went live, as `YYYY-MM-DD`. */
	readonly publishedAt: string;
	/**
	 * The one to point at from everywhere else.
	 *
	 * Exactly one per article: the announcements that go to Reddit, Hacker News
	 * and Hackaday are links, and they need one address to be the address.
	 */
	readonly canonical: boolean;
}

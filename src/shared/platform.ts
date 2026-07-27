/**
 * The platforms Pressroom knows how to reach, and how each one is reached.
 *
 * The delivery mode is a union rather than a set of optional fields, because
 * the three modes need genuinely different things and nothing may be in two of
 * them at once.
 */

export type PlatformId =
	| "hackernoon"
	| "habr"
	| "reddit"
	| "hackernews"
	| "hackaday";

export type Delivery =
	/**
	 * Opened in the person's own browser, where they are already signed in —
	 * carrying what fits in an address, and the rest on the clipboard. They
	 * press publish.
	 *
	 * There was a third kind here, `api`, for Reddit. Nothing used it: Pressroom
	 * does not publish on its own, and Reddit's submission form takes a title
	 * and a link as parameters like everyone else's.
	 */
	| { readonly kind: "browser"; readonly editorUrl: string }
	/** Composed as an email for the person to send. */
	| { readonly kind: "email"; readonly to: string };

/**
 * What a platform is given.
 *
 * The axis the table was missing. Habr and HackerNoon take the article — the
 * whole text into their editor. Reddit, Hacker News and Hackaday take a
 * message about it: a title and a link. The second kind cannot be prepared
 * until the article is out somewhere and that address is recorded, because a
 * message about an article is nothing without one.
 */
export type Carries = "article" | "announcement";

export interface Platform {
	readonly id: PlatformId;
	readonly displayName: string;
	readonly delivery: Delivery;
	readonly carries: Carries;
	/** Languages this platform is used for. */
	readonly languages: readonly ("en" | "ru")[];
}

/**
 * One place an article can go, and whether there is anything to send there.
 *
 * A platform takes one language — Habr Russian, the rest English — so a target
 * is a platform and that language together, not a platform on its own.
 */
/**
 * What has become of one destination.
 *
 * `published` wins over the other two: once an article is out somewhere, that
 * is the fact about that destination, whatever the text says.
 */
export type TargetState = "published" | "ready" | "missing";

export interface Target {
	readonly platform: PlatformId;
	readonly displayName: string;
	readonly language: "en" | "ru";
	readonly delivery: Delivery["kind"];
	readonly state: TargetState;
	/** Where it went, once it has gone. */
	readonly url: string | null;
}

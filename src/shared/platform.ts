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
	/** Submitted programmatically; no browser involved. */
	| { readonly kind: "api" }
	/**
	 * Opened in a logged-in browser view with the content already filled in.
	 * The person presses publish.
	 */
	| { readonly kind: "browser"; readonly editorUrl: string }
	/** Composed as an email for the person to send. */
	| { readonly kind: "email"; readonly to: string };

export interface Platform {
	readonly id: PlatformId;
	readonly displayName: string;
	readonly delivery: Delivery;
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

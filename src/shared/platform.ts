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

/**
 * What the interface may know about the settings, and what it may change.
 *
 * The API key travels one way. The interface can set it and can see whether one
 * is set, but never reads it back: a secret that never reaches the page cannot
 * leak from it, and nothing on that side has a use for its value.
 */
export interface Settings {
	/** Where the Obsidian plugin listens. */
	readonly baseUrl: string;
	readonly hasApiKey: boolean;
}

/**
 * A key is left alone, replaced, or removed — three separate intentions rather
 * than one field where an empty string has to mean something.
 */
export type ApiKeyUpdate =
	| { readonly kind: "unchanged" }
	| { readonly kind: "set"; readonly value: string }
	| { readonly kind: "cleared" };

export interface SettingsUpdate {
	readonly baseUrl: string;
	readonly apiKey: ApiKeyUpdate;
}

/** The plugin's own default, and what a fresh installation starts from. */
export const DEFAULT_BASE_URL = "https://127.0.0.1:27124";

/**
 * The result of actually talking to the vault, which is the only way to know
 * the settings are right.
 */
export type VaultCheck =
	| { readonly kind: "reachable"; readonly articles: number }
	| { readonly kind: "failed"; readonly reason: string };

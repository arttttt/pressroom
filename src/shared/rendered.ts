import type { PlatformId } from "./platform.js";

/**
 * An article prepared for one platform: everything that platform is handed,
 * and nothing belonging to another.
 *
 * A union rather than a title, a body and a bag of strings for the rest. Hubs
 * are a list, not a comma-joined string, and the code filling Habr's editor
 * should be able to rely on their being there without reaching into a record
 * and hoping. Each platform's variant arrives with its renderer; inventing
 * fields for editors nobody has looked at yet would be guessing.
 */
export type Rendered = {
	readonly platform: "habr";
	readonly title: string;
	readonly body: string;
	/** Habr's own taxonomy. Both are the author's choice, per article. */
	readonly hubs: readonly string[];
	readonly tags: readonly string[];
};

/**
 * What came of preparing an article for a platform.
 *
 * The two ways it does not work are different things to say: a platform whose
 * editor has not been read yet, and an article with nothing written in the
 * language that platform takes. Neither is a failure of the call.
 */
export type RenderResult =
	| { readonly kind: "rendered"; readonly rendered: Rendered }
	| { readonly kind: "unsupported"; readonly platform: PlatformId; readonly reason: string }
	| { readonly kind: "failed"; readonly reason: string };

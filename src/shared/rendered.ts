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
export type Rendered =
	| {
			readonly platform: "habr";
			readonly title: string;
			readonly body: string;
			/** Habr's own taxonomy. Both are the author's choice, per article. */
			readonly hubs: readonly string[];
			readonly tags: readonly string[];
	  }
	| {
			readonly platform: "hackernoon";
			readonly title: string;
			readonly body: string;
			/**
			 * What goes in HackerNoon's "First Seen At" field: where this text was
			 * published first, or nothing if HackerNoon is the first. It cannot be
			 * added after the story goes out, so it has to be right before it does.
			 */
			readonly firstSeenAt: string | null;
	  }
	// The three below announce an article rather than carry it, so each holds
	// the address it points at and none of them holds the article's text.
	| {
			readonly platform: "reddit";
			readonly title: string;
			readonly url: string;
			/** The author's words to post beneath the link, where they wrote any. */
			readonly comment: string | null;
	  }
	| {
			readonly platform: "hackernews";
			readonly title: string;
			readonly url: string;
	  }
	| {
			readonly platform: "hackaday";
			readonly to: string;
			readonly subject: string;
			readonly body: string;
			/** The whole message as a link, for handing to a mail client. */
			readonly mailto: string;
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

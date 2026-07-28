import type { Paste } from "../../shared/platform.js";
import type { Rendered } from "../../shared/rendered.js";
import { renderMarkdown } from "../preview/markdown.js";

/**
 * What goes on the clipboard for a platform's body, and in what form.
 *
 * A clipboard holds one thing in several forms at once and an editor takes the
 * form it understands. Which form a platform wants is the platform table's to
 * say — `paste` — not this file's: it used to switch on the platform's name,
 * one of four places in the interface that re-decided the same thing and would
 * each have gone on quietly answering for a platform never added to them.
 *
 * The rendering itself stays here rather than in the domain because markdown-it
 * is bundled into this half of the application and nothing ships beside the
 * other half — a domain that imported it would be a packaged app that cannot
 * start.
 */
export interface Flavours {
	readonly text: string;
	/** Absent where the platform wants the source rather than the document. */
	readonly html: string | null;
}

export function bodyFlavours(rendered: Rendered, paste: Paste): Flavours {
	const text = bodyOf(rendered);
	return { text, html: paste === "document" ? renderMarkdown(text).html : null };
}

/** The text a platform's editor is given, where it is given any. */
function bodyOf(rendered: Rendered): string {
	switch (rendered.platform) {
		case "habr":
		case "hackernoon":
		case "hackaday":
			return rendered.body;
		case "reddit":
			return rendered.comment ?? "";
		case "hackernews":
			return rendered.title;
	}
}

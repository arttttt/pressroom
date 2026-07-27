import type { Rendered } from "../../shared/rendered.js";
import { renderMarkdown } from "../preview/markdown.js";

/**
 * What goes on the clipboard, and in what form.
 *
 * A clipboard holds one thing in several forms at once, and an editor takes
 * the form it understands. That is the whole of the fix here, and it is per
 * platform because their editors want opposite things.
 *
 * **HackerNoon gets HTML.** Its Editor 3.0 is ProseMirror, which sniffs
 * pasted text to decide whether it is Markdown and inserts it as one flat run
 * of characters when it decides wrong — headings arrive as literal `##` and
 * every line break collapses into a space. Observed, on a real paste. HTML
 * removes the guess: a heading is an `h2` and a fence is a `pre`, and there is
 * nothing left to sniff.
 *
 * **Habr gets Markdown and only Markdown.** Its editor is told to expect it,
 * in a mode switched on by hand, and handing that a rendered document would
 * undo the very thing the mode is for.
 */
export interface Flavours {
	readonly text: string;
	/** Absent where the platform wants the source rather than the document. */
	readonly html: string | null;
}

export function bodyFlavours(rendered: Rendered): Flavours {
	switch (rendered.platform) {
		case "hackernoon":
			return { text: rendered.body, html: renderMarkdown(rendered.body).html };
		case "habr":
			return { text: rendered.body, html: null };
		case "reddit":
			return { text: rendered.comment ?? "", html: null };
		case "hackernews":
			return { text: rendered.title, html: null };
		case "hackaday":
			return { text: rendered.body, html: null };
	}
}

import type { Rendered } from "../../shared/rendered.js";
import { editorUrlFor } from "./registry.js";

/**
 * The address to open for a prepared article — carrying what it can.
 *
 * Some platforms take their whole submission in the address. Hacker News and
 * Reddit receive a title and a link and nothing else, and both publish a form
 * that accepts exactly those as parameters: the page opens with both fields
 * already filled and one thing left to do. Hackaday's tip is a mail message,
 * which is an address too.
 *
 * Habr and HackerNoon receive the article, and an article does not go in an
 * address — twenty thousand characters is not a query string, whatever
 * parameters they might have. Their editors open empty and the text arrives on
 * the clipboard.
 */
export function submissionUrlFor(rendered: Rendered): string {
	switch (rendered.platform) {
		case "hackernews":
			// Their own bookmarklet's form: `u` the link, `t` the title.
			return `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(rendered.url)}&t=${encodeURIComponent(rendered.title)}`;
		case "reddit":
			// The comment is not here: it goes under the link after it is posted,
			// so it stays on the clipboard rather than in the address.
			return `https://www.reddit.com/submit?url=${encodeURIComponent(rendered.url)}&title=${encodeURIComponent(rendered.title)}`;
		case "hackaday":
			return rendered.mailto;
		case "habr":
		case "hackernoon":
			return editorUrlFor(rendered.platform);
	}
}

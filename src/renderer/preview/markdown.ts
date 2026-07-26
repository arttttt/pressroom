import MarkdownIt from "markdown-it";

/**
 * Turns an assembled document into the HTML the preview shows.
 *
 * `html: false` is the reason this library rather than another: raw HTML in a
 * note is escaped and shown as the characters it is, instead of being injected
 * into the window. The preview sits in the same document as the bridge to the
 * main process, so text out of the vault must not be able to become markup —
 * and escaping at the source needs no sanitiser after it.
 *
 * `linkify` is off deliberately: turning bare addresses into links is a change
 * to the author's text, and the preview's job is to show what was written.
 */
const markdown = new MarkdownIt({
	html: false,
	linkify: false,
	typographer: false,
	breaks: false,
});

export function renderMarkdown(source: string): string {
	return markdown.render(source);
}

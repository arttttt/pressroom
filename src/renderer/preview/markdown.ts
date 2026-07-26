import MarkdownIt from "markdown-it";

/** A section of the assembled document, and where to scroll to reach it. */
export interface PreviewSection {
	readonly id: string;
	readonly heading: string;
}

export interface Preview {
	readonly html: string;
	/**
	 * The article's own sections, which are what the assembly puts at the second
	 * level. Sub-headings inside a section are left out: the contents beside the
	 * text answers "where is that part of the article", and eleven entries do
	 * that where thirty would not.
	 */
	readonly sections: readonly PreviewSection[];
}

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

/** Shared with the source view, so both are reached by the same contents. */
export function anchorFor(position: number): string {
	return `section-${position}`;
}

export function renderMarkdown(source: string): Preview {
	const tokens = markdown.parse(source, {});
	const sections: PreviewSection[] = [];

	for (const [index, token] of tokens.entries()) {
		if (token.type !== "heading_open" || token.tag !== "h2") continue;
		const id = anchorFor(sections.length);
		token.attrSet("id", id);
		sections.push({ id, heading: tokens[index + 1]?.content ?? "" });
	}

	return { html: markdown.renderer.render(tokens, markdown.options, {}), sections };
}

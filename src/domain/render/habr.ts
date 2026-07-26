import type { ArticleDocument } from "../../shared/article.js";
import { assembleMarkdown, capHeadings } from "./markdown.js";
import type { Rendered, RenderContext, Renderer } from "./renderer.js";

/**
 * The deepest heading Habr Flavored Markdown renders. Below it, a line is not
 * a smaller heading — it is not a heading.
 */
const DEEPEST_HEADING = 3;

/**
 * Habr, in its own Markdown.
 *
 * Less work than it looked. Habr Flavored Markdown takes fenced code with a
 * language, pipe tables, links, lists, quotes and the usual emphasis, so an
 * assembled document is already most of the way there and the dialect costs
 * one correction rather than a rewrite.
 *
 * Two things that were expected and are not needed: there is no cut marker in
 * the current editor — the fold is formed from the opening paragraphs by the
 * editor itself — and the body carries no title, because Habr has its own
 * field for it.
 *
 * The one prerequisite this cannot do anything about is that Markdown mode has
 * to be switched on in the editor before writing; the interface says so rather
 * than pretending to handle it.
 */
export const habrRenderer: Renderer = {
	platform: "habr",

	render(doc: ArticleDocument, context: RenderContext): Rendered {
		return {
			platform: "habr",
			title: doc.title,
			body: capHeadings(assembleMarkdown(doc).body, DEEPEST_HEADING),
			hubs: context.hubs,
			tags: context.tags,
		};
	},
};

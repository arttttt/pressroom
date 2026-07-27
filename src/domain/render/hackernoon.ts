import type { ArticleDocument } from "../../shared/article.js";
import type { Rendered } from "../../shared/rendered.js";
import { assembleMarkdown } from "./markdown.js";
import type { RenderContext, Renderer } from "./renderer.js";

/**
 * HackerNoon, in its Editor 3.0, which takes Markdown.
 *
 * Nothing has to be done to the text: the editor accepts Markdown as written,
 * and the title has its own field, so an assembled document goes as it is. The
 * work here is the one field that is not text.
 *
 * **"First Seen At" is the canonical link**, and it is left blank for a story
 * published here first. It cannot be added after the story goes out, so if the
 * English text is already somewhere else, it has to be filled in before
 * submitting — which is why it is shown beside the text rather than left to be
 * remembered.
 *
 * A story is also submitted for review rather than published: HackerNoon's
 * editors read it first, so being recorded as published happens days later.
 */
export const hackerNoonRenderer: Renderer = {
	platform: "hackernoon",

	render(doc: ArticleDocument, context: RenderContext): Rendered {
		return {
			platform: "hackernoon",
			title: doc.title,
			body: assembleMarkdown(doc).body,
			firstSeenAt: context.canonicalUrl,
		};
	},
};

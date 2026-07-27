import type { ArticleDocument } from "../../shared/article.js";
import type { Rendered } from "../../shared/rendered.js";
import type { RenderContext, Renderer } from "./renderer.js";

/**
 * The three platforms that receive a message about an article rather than the
 * article.
 *
 * None of them carries the text, so none of them uses `assembleMarkdown`. What
 * they need is the address the article is at — which exists only once it has
 * been published somewhere — and words a person wrote for that audience.
 *
 * The title is the article's own unless the author gave the announcement one:
 * the same piece is worth introducing differently to a link aggregator and to
 * an editor's tip line.
 */
function headline(doc: ArticleDocument, context: RenderContext): string {
	return context.announcement?.title ?? doc.title;
}

/**
 * Reddit: a link post, with the author's words as the comment beneath it.
 *
 * Titles there run to 300 characters, so an article's own title always fits.
 */
export const redditAnnouncer: Renderer = {
	platform: "reddit",

	render(doc: ArticleDocument, context: RenderContext): Rendered {
		const comment = context.announcement?.body ?? "";
		return {
			platform: "reddit",
			title: headline(doc, context),
			url: context.canonicalUrl ?? "",
			comment: comment.length === 0 ? null : comment,
		};
	},
};

/**
 * Hacker News: a title and an address, and nothing else.
 *
 * There is no body on a link submission, so an announcement note is read here
 * only for its title. Titles are capped — the number has moved over the years
 * and the discussions disagree, so nothing is truncated: the interface shows
 * how long the title is and says there is a cap, and shortening it is the
 * author's call rather than a machine's.
 */
export const hackerNewsAnnouncer: Renderer = {
	platform: "hackernews",

	render(doc: ArticleDocument, context: RenderContext): Rendered {
		return {
			platform: "hackernews",
			title: headline(doc, context),
			url: context.canonicalUrl ?? "",
		};
	},
};

/**
 * Hackaday: an email to the tip line, which a person sends.
 *
 * Hackaday is not a publishing platform — it is a blog with editors, and what
 * goes to them is a note saying here is a thing, with a link. The message is
 * built here and handed to a mail client; sending it is the person's, like
 * pressing publish everywhere else.
 */
export function hackadayAnnouncer(to: string): Renderer {
	return {
		platform: "hackaday",

		render(doc: ArticleDocument, context: RenderContext): Rendered {
			const subject = headline(doc, context);
			const words = context.announcement?.body ?? "";
			const url = context.canonicalUrl ?? "";
			const body = words.length === 0 ? url : `${words}\n\n${url}`;

			return {
				platform: "hackaday",
				to,
				subject,
				body,
				mailto: `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
			};
		},
	};
}

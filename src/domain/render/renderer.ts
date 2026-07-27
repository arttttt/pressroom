import type { ArticleDocument } from "../../shared/article.js";
import type { PlatformId } from "../../shared/platform.js";
import type { Rendered } from "../../shared/rendered.js";
import type { Announcement } from "../announce/announcement.js";

export type { Rendered };

/**
 * What a renderer needs beyond the text itself.
 *
 * Nothing here is optional: a caller states that there are no hubs by passing
 * none, rather than by leaving a field out, so there is no difference between
 * "not set" and "set to nothing" to get wrong later.
 */
export interface RenderContext {
	/** The address to treat as the original, where the article is already out. */
	readonly canonicalUrl: string | null;
	readonly hubs: readonly string[];
	readonly tags: readonly string[];
	/**
	 * The author's own words for announcing the article here, where they have
	 * written any. Only the three announcement platforms read it.
	 */
	readonly announcement: Announcement | null;
}

/**
 * Turns one assembled document into what a single platform wants.
 *
 * Each platform gets its own implementation, because the differences are not
 * cosmetic: Habr allows three heading levels, Reddit's tables render only in
 * some clients, HackerNoon supplies its own title element. What they share is
 * plain Markdown, and they share it by calling `assembleMarkdown` rather than
 * by inheriting from a base they would each have to be bent to fit.
 */
export interface Renderer {
	readonly platform: PlatformId;
	render(doc: ArticleDocument, context: RenderContext): Rendered;
}

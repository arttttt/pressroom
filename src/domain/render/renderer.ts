import type { ArticleDocument } from "../../shared/article.js";
import type { PlatformId } from "../../shared/platform.js";

export interface RenderedArticle {
	readonly title: string;
	readonly body: string;
	/** Platform-specific extras: hubs, tags, canonical URL. */
	readonly fields: Readonly<Record<string, string>>;
}

export interface RenderContext {
	/** The address that should be treated as the original, if one exists. */
	readonly canonicalUrl?: string;
}

/**
 * Turns one assembled document into what a single platform wants.
 *
 * Each platform gets its own implementation, because the differences are not
 * cosmetic: Habr has its own markup and a cut marker, Reddit's tables render
 * only in some clients, HackerNoon supplies its own title element.
 */
export interface Renderer {
	readonly platform: PlatformId;
	render(doc: ArticleDocument, ctx: RenderContext): RenderedArticle;
}

import type { ArticleDocument } from "../../shared/article.js";
import type { PlatformId } from "../../shared/platform.js";

/**
 * An article prepared for one platform: everything that platform is handed,
 * and nothing belonging to another.
 *
 * A union rather than a title, a body and a bag of strings for the rest. Hubs
 * are a list, not a comma-joined string, and the code filling Habr's editor
 * should be able to rely on their being there without reaching into a record
 * and hoping. Each platform's variant arrives with its renderer; inventing
 * fields for editors nobody has looked at yet would be guessing.
 */
export type Rendered = {
	readonly platform: "habr";
	readonly title: string;
	readonly body: string;
	/** Habr's own taxonomy. Both are the author's choice, per article. */
	readonly hubs: readonly string[];
	readonly tags: readonly string[];
};

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

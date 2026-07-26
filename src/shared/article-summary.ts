import type { Language } from "./article.js";
import type { Target } from "./platform.js";

/**
 * One line of the desk: what an article is, without reading it.
 *
 * Enough to see the state of everything at once — which languages are written,
 * which are still one note, and where each could go — for the cost of a few
 * folder listings rather than reading every article in the vault.
 */
export interface ArticleSummary {
	readonly slug: string;
	/** Written in sections, and therefore ready to assemble. */
	readonly ready: readonly Language[];
	/** Present, but still a single note from before the section layout. */
	readonly unsplit: readonly Language[];
	readonly targets: readonly Target[];
}

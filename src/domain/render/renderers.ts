import type { Article } from "../../shared/article.js";
import type { PlatformId } from "../../shared/platform.js";
import type { RenderResult } from "../../shared/rendered.js";
import { PLATFORMS } from "../platforms/registry.js";
import { habrRenderer } from "./habr.js";
import type { Renderer } from "./renderer.js";

/**
 * The renderers that exist, which is not yet every platform.
 *
 * A platform without one is a platform whose editor has not been looked at,
 * and saying so is more use than a renderer that emits plain Markdown and
 * hopes.
 */
const RENDERERS: readonly Renderer[] = [habrRenderer];

export function rendererFor(platform: PlatformId): Renderer | null {
	return RENDERERS.find((renderer) => renderer.platform === platform) ?? null;
}

/**
 * Prepares an article for one platform, in the language that platform takes.
 *
 * The language is not a choice: Habr publishes Russian and the rest English,
 * so a platform names its own and the article either has been written in it or
 * has not. The two ways this comes to nothing are different things to say, and
 * neither is a failure — one is an editor nobody has read yet, the other is an
 * article that is not written in that language.
 */
export function renderFor(article: Article, platform: PlatformId): RenderResult {
	const target = PLATFORMS.find((entry) => entry.id === platform);
	if (target === undefined) return { kind: "failed", reason: `There is no platform called '${platform}'.` };

	const renderer = rendererFor(platform);
	if (renderer === null) {
		return {
			kind: "unsupported",
			platform,
			reason: `${target.displayName}'s own markup has not been worked out yet, so Pressroom cannot say what it would receive.`,
		};
	}

	const language = target.languages[0];
	const document =
		language === undefined
			? undefined
			: article.documents.find((entry) => entry.language === language);
	if (document === undefined) {
		return {
			kind: "unsupported",
			platform,
			reason: `${target.displayName} publishes ${language ?? "nothing"}, and '${article.slug}' has nothing written in it.`,
		};
	}

	// Hubs and tags are the author's choice per article, and there is nowhere to
	// state them yet. Empty rather than invented.
	return {
		kind: "rendered",
		rendered: renderer.render(document, { canonicalUrl: null, hubs: [], tags: [] }),
	};
}

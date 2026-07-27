import type { Article } from "../../shared/article.js";
import type { PlatformId } from "../../shared/platform.js";
import type { Publication } from "../../shared/publication.js";
import type { RenderResult } from "../../shared/rendered.js";
import { PLATFORMS } from "../platforms/registry.js";
import { canonicalUrl } from "../registry/publications-note.js";
import { habrRenderer } from "./habr.js";
import { hackerNoonRenderer } from "./hackernoon.js";
import type { Renderer } from "./renderer.js";

/**
 * The renderers that exist, which is not yet every platform.
 *
 * A platform without one is a platform whose editor has not been looked at,
 * and saying so is more use than a renderer that emits plain Markdown and
 * hopes.
 */
const RENDERERS: readonly Renderer[] = [habrRenderer, hackerNoonRenderer];

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
export function renderFor(
	article: Article,
	platform: PlatformId,
	published: readonly Publication[] = [],
): RenderResult {
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
	if (language === undefined) {
		return { kind: "failed", reason: `${target.displayName} publishes no language Pressroom knows.` };
	}

	const document = article.documents.find((entry) => entry.language === language);
	if (document === undefined) {
		return {
			kind: "unsupported",
			platform,
			reason: `${target.displayName} publishes ${language}, and '${article.slug}' has nothing written in it.`,
		};
	}

	// Hubs and tags are the author's choice per article, and there is nowhere to
	// state them yet. Empty rather than invented.
	return {
		kind: "rendered",
		rendered: renderer.render(document, {
			// The original of this language, if there is one and it is not the
			// place about to receive it — a story is not a copy of itself.
			canonicalUrl: canonicalUrl(published, language, platform),
			hubs: [],
			tags: [],
		}),
	};
}

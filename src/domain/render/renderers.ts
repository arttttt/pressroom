import type { Announcement } from "../announce/announcement.js";
import type { Article } from "../../shared/article.js";
import type { PlatformId } from "../../shared/platform.js";
import type { Publication } from "../../shared/publication.js";
import type { RenderResult } from "../../shared/rendered.js";
import { emailAddressFor, PLATFORMS } from "../platforms/registry.js";
import { canonicalUrl } from "../registry/publications-note.js";
import { hackadayAnnouncer, hackerNewsAnnouncer, redditAnnouncer } from "./announcers.js";
import { habrRenderer } from "./habr.js";
import { hackerNoonRenderer } from "./hackernoon.js";
import type { Renderer } from "./renderer.js";


/** Every platform Pressroom can prepare an article for. */
const RENDERERS: readonly Renderer[] = [
	habrRenderer,
	hackerNoonRenderer,
	redditAnnouncer,
	hackerNewsAnnouncer,
	hackadayAnnouncer(emailAddressFor("hackaday")),
];

export function rendererFor(platform: PlatformId): Renderer | null {
	return RENDERERS.find((renderer) => renderer.platform === platform) ?? null;
}

/**
 * Prepares an article for one platform, in the language that platform takes.
 *
 * The language is not a choice: Habr publishes Russian and the rest English,
 * so a platform names its own and the article either has been written in it or
 * has not.
 *
 * Three of the five receive a message about the article rather than the
 * article, and a message about an article is nothing without an address to
 * point at. Those cannot be prepared until it has gone out somewhere and that
 * has been recorded — which is a thing to say plainly rather than a failure.
 */
export function renderFor(
	article: Article,
	platform: PlatformId,
	published: readonly Publication[] = [],
	announcement: Announcement | null = null,
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

	// The original of this language, if there is one and it is not the place
	// about to receive it — a story is not a copy of itself.
	const original = canonicalUrl(published, language, platform);

	if (target.carries === "announcement" && original === null) {
		return {
			kind: "unsupported",
			platform,
			reason: `${target.displayName} takes a message about the article, not the article, and there is nowhere to point it yet. Publish '${article.slug}' in ${language} and record where it went.`,
		};
	}

	// Hubs and tags are the author's choice per article, and there is nowhere to
	// state them yet. Empty rather than invented.
	return {
		kind: "rendered",
		rendered: renderer.render(document, {
			canonicalUrl: original,
			hubs: [],
			tags: [],
			announcement,
		}),
	};
}

import type { Language } from "../../shared/article.js";
import type { Target } from "../../shared/platform.js";
import type { Publication } from "../../shared/publication.js";
import { PLATFORMS } from "./registry.js";

/**
 * Where an article could go, what is written for each place, and where it has
 * already gone.
 *
 * Every platform appears whether or not the text exists, because the gap is
 * the point: an article with no Russian has nothing for Habr, and that is
 * worth seeing rather than hiding.
 */
export function targetsFor(
	written: readonly Language[],
	published: readonly Publication[] = [],
): readonly Target[] {
	return PLATFORMS.flatMap((platform) =>
		platform.languages.map((language): Target => {
			const out = published.find(
				(publication) => publication.platform === platform.id && publication.language === language,
			);
			return {
				platform: platform.id,
				displayName: platform.displayName,
				language,
				delivery: platform.delivery.kind,
				carries: platform.carries,
				paste: platform.paste,
				// Having gone out is the fact about a destination, whatever the
				// text now says — an article can be edited after it is published.
				state: out !== undefined ? "published" : written.includes(language) ? "ready" : "missing",
				url: out?.url ?? null,
			};
		}),
	);
}

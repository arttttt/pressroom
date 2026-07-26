import type { Language } from "../../shared/article.js";
import type { Target } from "../../shared/platform.js";
import { PLATFORMS } from "./registry.js";

/**
 * Where an article could go, given the languages it has been written in.
 *
 * Every platform appears whether or not the text exists, because the gap is the
 * point: an article with no Russian has nothing for Habr, and that is worth
 * seeing rather than hiding. Once publications are recorded, the third state —
 * already sent — belongs here.
 */
export function targetsFor(written: readonly Language[]): readonly Target[] {
	return PLATFORMS.flatMap((platform) =>
		platform.languages.map(
			(language): Target => ({
				platform: platform.id,
				displayName: platform.displayName,
				language,
				delivery: platform.delivery.kind,
				state: written.includes(language) ? "ready" : "missing",
			}),
		),
	);
}

/** How many of an article's targets have text waiting for them. */
export function readyCount(targets: readonly Target[]): number {
	return targets.filter((target) => target.state === "ready").length;
}

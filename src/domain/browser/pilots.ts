import type { Stage } from "../../shared/browser.js";
import type { PlatformId } from "../../shared/platform.js";
import { habrPilot } from "./habr-pilot.js";
import type { Pilot } from "./pilot.js";

/**
 * The platforms whose pages Pressroom has been taught to read.
 *
 * Fewer than the platforms that have editors: reading someone's markup is work
 * done one platform at a time, against the real page, and guessing at the rest
 * would put a title into whatever happened to match.
 */
const PILOTS: readonly Pilot[] = [habrPilot];

export function pilotFor(platform: PlatformId): Pilot | null {
	return PILOTS.find((pilot) => pilot.platform === platform) ?? null;
}

/** Where a page stands, for a platform nobody has read yet as well. */
export function stageOf(platform: PlatformId, url: string, status: number): Stage {
	return pilotFor(platform)?.stageOf(url, status) ?? "elsewhere";
}

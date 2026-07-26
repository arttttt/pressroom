import type { PlatformId } from "../../shared/platform.js";
import { habrRenderer } from "./habr.js";
import type { Renderer } from "./renderer.js";

/**
 * The renderers that exist, which is not yet every platform.
 *
 * A platform without one is a platform whose editor has not been looked at,
 * and saying so is more use than a renderer that emits plain Markdown and
 * hopes. `rendererFor` answers with nothing in that case, and the interface
 * can say what is missing.
 */
const RENDERERS: readonly Renderer[] = [habrRenderer];

export function rendererFor(platform: PlatformId): Renderer | null {
	return RENDERERS.find((renderer) => renderer.platform === platform) ?? null;
}

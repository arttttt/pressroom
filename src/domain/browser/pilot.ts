import type { Stage } from "../../shared/browser.js";
import type { PlatformId } from "../../shared/platform.js";

/**
 * What one platform's pages are.
 *
 * This is the only part of Pressroom that knows another company's markup, and
 * so the only part that breaks when they redesign it. Nothing else may depend
 * on it, and it decides nothing about the text: it is handed words already in
 * that platform's dialect and only knows where on a page they go.
 *
 * A pilot per platform rather than a table of selectors, for the same reason
 * there is a renderer per platform: the differences are not cosmetic. Habr
 * shows a login form on its own page; HackerNoon hands its sign-in to Google.
 */
export interface Pilot {
	readonly platform: PlatformId;
	/** Where the platform asks who you are. */
	readonly signInUrl: string;
	/**
	 * Which of the platform's pages this is.
	 *
	 * Read from the address and the code it came back with, not from the page's
	 * markup: it has to be answered before anything is put into that page, and
	 * a site that redesigns its editor every year still answers 401 the same
	 * way. `status` is 0 where nothing has been loaded yet.
	 */
	stageOf(url: string, status: number): Stage;
}

import type { PlatformId } from "../../shared/platform.js";

/**
 * Every platform gets its own persistent Electron session.
 *
 * Separate partitions mean cookies for one platform can be dropped without
 * touching the others, and a second account on the same platform is just
 * another partition. The `persist:` prefix is what puts the store on disk;
 * without it the login dies with the window.
 *
 * These sessions are the sensitive thing this application holds — they can
 * publish under the user's name without a second factor. They stay local,
 * nothing reaches them remotely, and clearing them all must be one action.
 */
export function partitionFor(platform: PlatformId): string {
	return `persist:${platform}`;
}

export const ALL_PARTITIONS: readonly PlatformId[] = [
	"hackernoon",
	"habr",
	"hackernews",
];

/**
 * Electron's default user agent announces itself as Electron, which some login
 * flows treat differently from a browser. Present a plain one instead.
 */
export function browserUserAgent(chromeVersion: string): string {
	return (
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
		`(KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`
	);
}

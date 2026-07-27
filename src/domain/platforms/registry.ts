import type { Platform, PlatformId } from "../../shared/platform.js";

/**
 * What each platform is, what it is given, and how it is reached. Editor
 * addresses are the only thing here that other people can change under us, so
 * they live in one place.
 */
export const PLATFORMS: readonly Platform[] = [
	{
		id: "hackernoon",
		displayName: "HackerNoon",
		delivery: { kind: "browser", editorUrl: "https://app.hackernoon.com/new" },
		carries: "article",
		languages: ["en"],
	},
	{
		id: "habr",
		displayName: "Habr",
		// Not the sandbox: that is where a first article goes for review before
		// its author may publish at all. Habr's own pencil leads here.
		delivery: { kind: "browser", editorUrl: "https://habr.com/ru/article/new/" },
		carries: "article",
		languages: ["ru"],
	},
	{
		id: "reddit",
		displayName: "Reddit",
		// Reddit has a write API, and Pressroom does not use it: nothing here
		// publishes on its own. Its submission form takes the title and the link
		// as parameters, which is the same door the others go through.
		delivery: { kind: "browser", editorUrl: "https://www.reddit.com/submit" },
		carries: "announcement",
		languages: ["en"],
	},
	{
		id: "hackernews",
		displayName: "Hacker News",
		delivery: { kind: "browser", editorUrl: "https://news.ycombinator.com/submit" },
		carries: "announcement",
		languages: ["en"],
	},
	{
		id: "hackaday",
		displayName: "Hackaday",
		delivery: { kind: "email", to: "tips@hackaday.com" },
		carries: "announcement",
		languages: ["en"],
	},
];

/**
 * Where a platform's editor is.
 *
 * Reddit posts through an API and Hackaday takes an email; neither has a page
 * to open, and asking for one is a wiring mistake rather than something to
 * paper over with a blank view. Everything that needs the address asks here,
 * so a platform that moves its editor is one line changed.
 */
export function editorUrlFor(platform: PlatformId): string {
	const known = PLATFORMS.find((entry) => entry.id === platform);
	if (known === undefined) throw new Error(`There is no platform called '${platform}'.`);
	if (known.delivery.kind !== "browser") {
		throw new Error(`${known.displayName} is not opened in a browser.`);
	}
	return known.delivery.editorUrl;
}

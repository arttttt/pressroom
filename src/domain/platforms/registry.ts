import type { Platform } from "../../shared/platform.js";

/**
 * What each platform is and how it is reached. Editor addresses are the only
 * thing here that other people can change under us, so they live in one place.
 */
export const PLATFORMS: readonly Platform[] = [
	{
		id: "hackernoon",
		displayName: "HackerNoon",
		delivery: { kind: "browser", editorUrl: "https://app.hackernoon.com/new" },
		languages: ["en"],
	},
	{
		id: "habr",
		displayName: "Habr",
		delivery: { kind: "browser", editorUrl: "https://habr.com/ru/sandbox/new/" },
		languages: ["ru"],
	},
	{
		id: "reddit",
		displayName: "Reddit",
		delivery: { kind: "api" },
		languages: ["en"],
	},
	{
		id: "hackernews",
		displayName: "Hacker News",
		delivery: { kind: "browser", editorUrl: "https://news.ycombinator.com/submit" },
		languages: ["en"],
	},
	{
		id: "hackaday",
		displayName: "Hackaday",
		delivery: { kind: "email", to: "tips@hackaday.com" },
		languages: ["en"],
	},
];

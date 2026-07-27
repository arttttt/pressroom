import type { Platform } from "../../shared/platform.js";

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
		delivery: { kind: "browser", editorUrl: "https://habr.com/ru/sandbox/new/" },
		carries: "article",
		languages: ["ru"],
	},
	{
		id: "reddit",
		displayName: "Reddit",
		delivery: { kind: "api" },
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

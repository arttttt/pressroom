import type { PlatformId } from "./platform.js";

/**
 * What each platform is, and what bites.
 *
 * The place where "why" is allowed. Working screens carry an instruction and
 * nothing else; everything that explains, warns or justifies belongs here,
 * where it is read once by someone who came looking for it.
 *
 * It lives beside the platform table rather than in the interface because it
 * is the same knowledge in prose — and a test holds the two together, so a
 * platform cannot be added to one and forgotten in the other.
 */
export interface GuideEntry {
	/** What the platform is, in a sentence or two. */
	readonly what: string;
	/** What catches people out — one line each, most costly first. */
	readonly watch: readonly string[];
}

export const PLATFORM_GUIDE: Readonly<Record<PlatformId, GuideEntry>> = {
	habr: {
		what: "Russia's largest technical publication, and the only destination that takes Russian. It receives the article itself, pasted into its own editor.",
		watch: [
			"Markdown mode has to be switched on in the editor's settings before the text is pasted. Nothing can do this for you, and pasting without it produces one long paragraph.",
			"Habr's Markdown stops at three heading levels. Deeper is not a smaller heading — it is not a heading, and the line renders as text.",
			"There is no cut marker any more. The fold is formed from the opening paragraphs by the editor itself.",
			"Hubs and tags are chosen in the editor when publishing. Pressroom leaves them empty rather than inventing them.",
			"The editor is not the sandbox. The sandbox is where a first article goes to be reviewed before its author may publish at all.",
		],
	},
	hackernoon: {
		what: "An English technical publication with editors. It receives the article itself, in Editor 3.0, which takes Markdown.",
		watch: [
			"“First Seen At” is where the text was published first. It cannot be added after the story goes out, so it has to be right before it does.",
			"Stories are submitted for review rather than published. One goes out days later — record it when it appears, not when it is sent.",
			"Sign-in may be through Google, which no embedded browser is allowed to do. Pressroom opens the real one, where that is not a problem.",
		],
	},
	reddit: {
		what: "A link aggregator. It receives a message about the article rather than the article: a link post, with your own words as the first comment.",
		watch: [
			"It needs the article to be out somewhere first. A link post with nowhere to point is nothing, so Pressroom prepares it only once a publication is recorded.",
			"Titles are capped at 300 characters and truncated in the composer.",
			"The comment is posted underneath after the link goes up, so it travels on the clipboard rather than in the address.",
			"Reddit has a write API and Pressroom does not use it. Nothing here publishes on its own.",
		],
	},
	hackernews: {
		what: "A link aggregator. It receives a title and an address, and nothing else at all.",
		watch: [
			"It needs the article to be out somewhere first, for the same reason as Reddit.",
			"The title cap has moved over the years, so Pressroom will not shorten one for you — a long title is worth cutting by hand before it is submitted.",
			"Automated submissions are penalised. That is part of why nothing here submits anything.",
		],
	},
	hackaday: {
		what: "Not a place to publish. Hackaday is a blog with editors: you send a tip, and one of them decides whether to write about your project.",
		watch: [
			"The tip goes to their tip line as an ordinary email, opened in your mail client with the subject and message already written.",
			"It needs the article to be out somewhere first — the tip is a pointer to it.",
			"Hackaday.io project pages are a different thing, and Pressroom does not touch them.",
		],
	},
};

/** How the application works, for the one screen where that may be said. */
export const ABOUT: readonly string[] = [
	"Pressroom assembles an article from its section files, renders it in each platform's dialect, and opens that platform in the browser you already use. It never publishes: every destination is brought to the point where one click would do it, and then stops.",
	"The vault is read through Obsidian's Local REST API plugin rather than off the disk, so Obsidian stays the only thing writing to its own files.",
	"Where an article has gone is recorded in the vault beside it, and that record is what the announcement platforms point at.",
	"One address is canonical per language. A Russian article is not the original of an English one; what relates translations is hreflang, not canonical.",
];

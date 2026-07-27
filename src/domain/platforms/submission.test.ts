import { describe, expect, it } from "vitest";
import type { Rendered } from "../../shared/rendered.js";
import { editorUrlFor } from "./registry.js";
import { submissionUrlFor } from "./submission.js";

const WHERE = "https://hackernoon.com/how-i-turned-a-oneplus-3t";
const TITLE = "I put postmarketOS on a 2016 phone & ran a bot on it for a year";

describe("a platform that takes its whole submission in the address", () => {
	it("hands Hacker News the link and the title, in the form its own bookmarklet uses", () => {
		const opening = new URL(
			submissionUrlFor({ platform: "hackernews", title: TITLE, url: WHERE }),
		);
		expect(opening.origin + opening.pathname).toBe("https://news.ycombinator.com/submitlink");
		expect(opening.searchParams.get("u")).toBe(WHERE);
		expect(opening.searchParams.get("t")).toBe(TITLE);
	});

	it("hands Reddit the same two, and keeps the comment out of the address", () => {
		// The comment is posted under the link afterwards, not with it.
		const opening = new URL(
			submissionUrlFor({
				platform: "reddit",
				title: TITLE,
				url: WHERE,
				comment: "Bootloader, kernel, containers, and the parts that fought back.",
			}),
		);
		expect(opening.origin + opening.pathname).toBe("https://www.reddit.com/submit");
		expect(opening.searchParams.get("url")).toBe(WHERE);
		expect(opening.searchParams.get("title")).toBe(TITLE);
		expect(opening.search).not.toContain("fought back");
	});

	it("escapes a title that would otherwise end the address early", () => {
		// An ampersand in a title is the classic way half of it goes missing.
		const awkward = "Rust & C++: ?what happens #then";
		const opening = new URL(submissionUrlFor({ platform: "hackernews", title: awkward, url: WHERE }));
		expect(opening.searchParams.get("t")).toBe(awkward);
	});

	it("opens Hackaday's tip as the mail message it already is", () => {
		const mailto = "mailto:tips@hackaday.com?subject=x&body=y";
		expect(
			submissionUrlFor({
				platform: "hackaday",
				to: "tips@hackaday.com",
				subject: "x",
				body: "y",
				mailto,
			}),
		).toBe(mailto);
	});
});

describe("a platform that receives the article itself", () => {
	it("opens its editor empty, because an article does not go in an address", () => {
		const article: Rendered = {
			platform: "habr",
			title: "Как я превратил старый OnePlus 3T в домашний сервер",
			body: "x".repeat(21_952),
			hubs: [],
			tags: [],
		};
		expect(submissionUrlFor(article)).toBe(editorUrlFor("habr"));
		expect(submissionUrlFor(article).length).toBeLessThan(120);
	});

	it("does the same for HackerNoon", () => {
		expect(
			submissionUrlFor({
				platform: "hackernoon",
				title: "How I Turned a OnePlus 3T into a Home Server",
				body: "prose",
				firstSeenAt: null,
			}),
		).toBe(editorUrlFor("hackernoon"));
	});
});

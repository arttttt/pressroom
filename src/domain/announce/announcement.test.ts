import { describe, expect, it } from "vitest";
import { parseAnnouncement } from "./announcement.js";

describe("parseAnnouncement", () => {
	it("takes the title from the frontmatter and the words from the body", () => {
		const note = "---\ntitle: I ran a bot on a 2016 phone for a year\n---\n\nBootloader, kernel.\n";
		expect(parseAnnouncement(note)).toEqual({
			title: "I ran a bot on a 2016 phone for a year",
			body: "Bootloader, kernel.",
		});
	});

	it("reports no title as none, so the article's own is used instead", () => {
		// Not as an empty string: an empty headline submitted to Hacker News is
		// worse than the article's title, which is at least what it is called.
		expect(parseAnnouncement("Just the words.").title).toBeNull();
		expect(parseAnnouncement("---\ntitle:\n---\n\nWords.").title).toBeNull();
		expect(parseAnnouncement("---\ntitle: '   '\n---\n\nWords.").title).toBeNull();
	});

	it("reads a note written on Windows", () => {
		const note = "---\r\ntitle: A headline\r\n---\r\n\r\nThe words.\r\n";
		expect(parseAnnouncement(note)).toEqual({ title: "A headline", body: "The words." });
	});

	it("carries no words as an empty body rather than as a title", () => {
		expect(parseAnnouncement("---\ntitle: A headline\n---\n\n").body).toBe("");
	});

	it("finds nothing in an empty file", () => {
		expect(parseAnnouncement("")).toEqual({ title: null, body: "" });
	});
});

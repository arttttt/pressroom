import { describe, expect, it } from "vitest";
import { editorUrlFor } from "../platforms/registry.js";
import { habrPilot } from "./habr-pilot.js";
import { stageOf } from "./pilots.js";

/** The ordinary case: the page was served. */
const OK = 200;

describe("habrPilot.stageOf", () => {
	it("knows the sign-in it is sent to, which is not on habr.com at all", () => {
		// Habr hands the browser to account.habr.com, where the form sits behind
		// a one-time path. Recognising only `/auth/login` would see the doorway
		// and never the room.
		expect(habrPilot.stageOf("https://habr.com/ru/auth/login/", OK)).toBe("signing-in");
		expect(
			habrPilot.stageOf("https://habr.com/kek/v1/auth/habrahabr/?back=/ru/article/new/", OK),
		).toBe("signing-in");
		expect(habrPilot.stageOf("https://account.habr.com/ru/ident/uQ9xDNSvfzL0mtVr0BWJ", OK)).toBe(
			"signing-in",
		);
	});

	it("takes a refusal at the editor for what it is: sign in first", () => {
		// Habr does not redirect a stranger. It answers 401 at the editor's own
		// address and shows a page saying so — and going by the address alone
		// offered to fill an editor that was not on the screen. This is not the
		// form either: what it needs is being taken to one.
		expect(habrPilot.stageOf(editorUrlFor("habr"), 401)).toBe("sign-in-needed");
		expect(habrPilot.stageOf(editorUrlFor("habr"), 403)).toBe("sign-in-needed");
	});

	it("does not take the rest of the account site for a login form", () => {
		expect(habrPilot.stageOf("https://account.habr.com/ru/settings/", OK)).toBe("elsewhere");
	});

	it("knows the editor, wherever the article is going", () => {
		for (const url of [
			"https://habr.com/ru/article/new/",
			"https://habr.com/ru/articles/new/",
			"https://habr.com/ru/posts/new/",
			"https://habr.com/ru/sandbox/new/",
			"https://habr.com/ru/articles/123456/edit/",
		]) {
			expect(habrPilot.stageOf(url, OK), url).toBe("editor");
		}
	});

	it("does not take a published article for the editor that made it", () => {
		// Reading an article is not writing one, and nothing may be typed into it.
		expect(habrPilot.stageOf("https://habr.com/ru/articles/123456/", OK)).toBe("elsewhere");
		expect(habrPilot.stageOf("https://habr.com/ru/", OK)).toBe("elsewhere");
	});

	it("refuses a login form that is not Habr's", () => {
		// A path is not an identity. Filling any page whose address ends in
		// /auth/login is how a password goes somewhere it was never meant to.
		expect(habrPilot.stageOf("https://habr.com.example.net/ru/auth/login/", OK)).toBe("elsewhere");
		expect(habrPilot.stageOf("https://evil.test/ru/auth/login/", OK)).toBe("elsewhere");
	});

	it("refuses an address that is not https, and one that is not an address", () => {
		expect(habrPilot.stageOf("http://habr.com/ru/auth/login/", OK)).toBe("elsewhere");
		expect(habrPilot.stageOf("about:blank", OK)).toBe("elsewhere");
		expect(habrPilot.stageOf("", OK)).toBe("elsewhere");
	});
});

describe("habrPilot.signInUrl", () => {
	it("returns the person to the editor rather than to the front page", () => {
		expect(habrPilot.signInUrl).toContain(new URL(editorUrlFor("habr")).pathname);
	});

	it("is itself a sign-in page, so arriving there is not mistaken for wandering off", () => {
		expect(habrPilot.stageOf(habrPilot.signInUrl, OK)).toBe("signing-in");
	});
});

describe("stageOf, for a platform nobody has read yet", () => {
	it("says elsewhere rather than failing", () => {
		// HackerNoon has an editor and no pilot. Its page still opens; nothing
		// is offered to put into it.
		expect(stageOf("hackernoon", "https://app.hackernoon.com/new", OK)).toBe("elsewhere");
		expect(stageOf("habr", editorUrlFor("habr"), OK)).toBe("editor");
	});

	it("says elsewhere before anything has loaded", () => {
		expect(stageOf("habr", "", 0)).toBe("elsewhere");
	});
});

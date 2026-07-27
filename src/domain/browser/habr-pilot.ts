import type { Stage } from "../../shared/browser.js";
import type { Credential } from "../credentials/provider.js";
import { editorUrlFor } from "../platforms/registry.js";
import type { FieldFill } from "./fill.js";
import type { Pilot } from "./pilot.js";

/**
 * Habr's pages, as they behave rather than as they are documented.
 *
 * Signing in leaves habr.com altogether: the editor answers 401 to a stranger,
 * and its own sign-in link hands the browser to `account.habr.com`, where the
 * form sits behind a one-time path. That is why the sign-in page is recognised
 * by its host and not by a tidy `/auth/login`, which is only the doorway.
 *
 * The address below is Habr's own sign-in link, `back` and all, so that the
 * person is returned to the editor rather than to the front page — carrying
 * the editor's path from the one table that holds it.
 */
const EDITOR = editorUrlFor("habr");

export const habrPilot: Pilot = {
	platform: "habr",
	signInUrl: `https://habr.com/kek/v1/auth/habrahabr/?back=${new URL(EDITOR).pathname}&hl=ru`,

	stageOf(url: string, status: number): Stage {
		const at = habrAddress(url);
		if (at === null) return "elsewhere";
		if (at.host === "account.habr.com") {
			return at.path.includes("/ident") || at.path.includes("/login") ? "signing-in" : "elsewhere";
		}
		// The doorways that lead to that form, passed through in a moment.
		if (at.path.includes("/auth/")) return "signing-in";
		// Habr does not send a stranger to its sign-in page: it answers 401 at
		// the editor's own address and shows a page saying so. Going by the
		// address alone would offer to fill an editor that is not there.
		if (status === 401 || status === 403) return "sign-in-needed";
		// The editor, wherever the article is going: a new one, one being
		// written again, or the sandbox a first article has to pass through.
		return /\/(article|articles|posts|sandbox)\/(new|\d+\/edit)/.test(at.path) ? "editor" : "elsewhere";
	},

	signIn(credential: Credential): readonly FieldFill[] {
		// An ordinary form, by their names rather than their classes: the two
		// fields are called what they hold, and a class is what a redesign moves.
		// Below them sits a captcha, and after it the button — both untouched.
		return [
			{
				name: "the email",
				selector: "input[name='email']",
				value: credential.username,
				into: "field",
			},
			{
				name: "the password",
				selector: "input[name='password']",
				value: credential.password,
				into: "field",
			},
		];
	},
};

/**
 * The host and path of an address, or nothing if Habr could not have served it.
 *
 * A path is not an identity. Filling any page whose address happens to end in
 * `/auth/login` is how a password goes somewhere it was never meant to.
 */
function habrAddress(url: string): { readonly host: string; readonly path: string } | null {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}
	if (parsed.protocol !== "https:") return null;
	const host = parsed.hostname;
	return host === "habr.com" || host.endsWith(".habr.com")
		? { host, path: parsed.pathname }
		: null;
}

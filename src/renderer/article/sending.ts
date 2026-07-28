import type { Target } from "../../shared/platform.js";
import type { Rendered } from "../../shared/rendered.js";
import { bodyFlavours } from "./clipboard.js";

/**
 * Sending an article to a platform: the whole act, in one place.
 *
 * It was three. A component chose the clipboard's form and wrote it, the main
 * process independently prepared the article again and opened the browser, and
 * Hackaday left by a `mailto:` anchor that went through neither. No function
 * was named for the thing being done, so each site knew part of the order and
 * none of them knew all of it — and the two preparations were two separate
 * reads of the vault, which is exactly what preparing in one function was
 * supposed to have ruled out.
 *
 * Not a component and not a hook: an ordinary function, so the order lives
 * somewhere that does not depend on anything rendering.
 */
export async function sendTo(slug: string, target: Target, rendered: Rendered): Promise<void> {
	// The clipboard first. The browser takes a moment to come forward, and a
	// person who pastes the instant it does should find the article there.
	if (target.paste !== "none") {
		const { text, html } = bodyFlavours(rendered, target.paste);
		await (html === null ? window.pressroom.copy(text) : window.pressroom.copy(text, html));
	}
	await window.pressroom.openEditor(slug, target.platform);
}

/** Whether sending leaves anything on the clipboard, which the button says. */
export function carriesText(target: Target): boolean {
	return target.paste !== "none";
}

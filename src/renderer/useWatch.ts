import { useEffect, useRef } from "react";

/**
 * Keeps asking the vault the same question while the window is on screen.
 *
 * The vault is edited in Obsidian with Pressroom open beside it — a
 * translation gains a section, a language folder appears — and a screen that
 * read once at startup goes on showing what was there when it opened. There is
 * nothing to subscribe to: the Local REST API answers questions and announces
 * nothing of its own, so the only way to know is to ask again.
 *
 * **Only while visible.** A window behind another or minimised is nobody
 * looking, and asking on its behalf is traffic spent on a screen no one sees.
 * Becoming visible asks at once, which is what makes coming back from Obsidian
 * feel immediate rather than up to ten seconds late.
 *
 * Every answer is handed over, changed or not; comparing belongs to the caller,
 * which is the only one holding what it currently shows. Returning the same
 * value from a state updater is how it declines to re-render — see how the
 * callers use it.
 */
export function useWatch<T>(
	/** Resets the watch when the subject changes: another article, say. */
	subject: string,
	ask: () => Promise<T>,
	answer: (fresh: T) => void,
	everyMs = 10_000,
): void {
	// Held in refs so that a caller writing its callbacks inline — which is
	// every caller — does not restart the interval on each render.
	const asking = useRef(ask);
	const answering = useRef(answer);
	asking.current = ask;
	answering.current = answer;

	useEffect(() => {
		let listening = true;

		async function look(): Promise<void> {
			if (document.visibilityState !== "visible") return;
			try {
				const fresh = await asking.current();
				if (listening) answering.current(fresh);
			} catch {
				// A vault that has gone away is the screen's own business — it
				// has its own way of saying so and its own way of trying again.
				// The watch simply stops noticing until it comes back.
			}
		}

		const timer = window.setInterval(() => void look(), everyMs);
		const onVisible = () => void look();
		document.addEventListener("visibilitychange", onVisible);
		return () => {
			listening = false;
			window.clearInterval(timer);
			document.removeEventListener("visibilitychange", onVisible);
		};
	}, [subject, everyMs]);
}

/**
 * Keeps what is already there when a fresh answer says the same thing.
 *
 * Handed to a state updater, so React compares by identity and declines to
 * re-render — which is what stops a poll every ten seconds from rebuilding the
 * article somebody is reading.
 */
export function unchanged<T>(was: T, fresh: T): T {
	return JSON.stringify(was) === JSON.stringify(fresh) ? was : fresh;
}

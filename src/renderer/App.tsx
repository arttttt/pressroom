import { useEffect, useState } from "react";
import type { Platform } from "../shared/platform.js";
import { PlatformList } from "./PlatformList.js";

/**
 * What the screen can be showing. A union rather than a value beside a flag,
 * so there is no state where both a list and a failure are half-present.
 */
type Load =
	| { readonly status: "loading" }
	| { readonly status: "ready"; readonly platforms: readonly Platform[] }
	| { readonly status: "failed"; readonly reason: string };

/**
 * A placeholder, and honest about it: it asks the main process one question and
 * shows the answer. That answer travelling renderer → preload → main → domain
 * and back is the only thing this screen is currently for.
 */
export function App() {
	const [load, setLoad] = useState<Load>({ status: "loading" });

	useEffect(() => {
		let listening = true;
		window.pressroom
			.listPlatforms()
			.then((platforms) => {
				if (listening) setLoad({ status: "ready", platforms });
			})
			.catch((cause: unknown) => {
				if (listening) setLoad({ status: "failed", reason: String(cause) });
			});
		return () => {
			listening = false;
		};
	}, []);

	return (
		<main className="app">
			<h1>Pressroom</h1>
			<p className="lede">The shell runs. Nothing is published from here yet.</p>

			{load.status === "loading" && <p className="waiting">Asking the main process…</p>}
			{load.status === "failed" && <p className="failed">The bridge did not answer: {load.reason}</p>}
			{load.status === "ready" && <PlatformList platforms={load.platforms} />}
		</main>
	);
}

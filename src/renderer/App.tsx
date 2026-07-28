import { useEffect, useState } from "react";
import type { Target } from "../shared/platform.js";
import { ArticlePage } from "./article/ArticlePage.js";
import { DeskView } from "./desk/DeskView.js";
import { HelpView } from "./help/HelpView.js";
import { SettingsView } from "./settings/SettingsView.js";

type Screen =
	| { readonly name: "desk" }
	// The desk has already worked out where this article can go, so it hands
	// that over rather than making the article page ask again.
	| { readonly name: "article"; readonly slug: string; readonly targets: readonly Target[] }
	| { readonly name: "settings" }
	| { readonly name: "help" };

export function App() {
	const [screen, setScreen] = useState<Screen>({ name: "desk" });
	const desk = () => setScreen({ name: "desk" });

	// Escape leaves any screen that is not the desk, which is what a macOS
	// window is expected to do and what the visible control does too.
	useEffect(() => {
		if (screen.name === "desk") return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			// Not while something is being typed. Escape in the middle of the
			// publication form used to unmount the whole page and take the
			// address with it; the form has its own Cancel, which is what that
			// key is reaching for.
			const into = event.target;
			if (into instanceof HTMLElement && into.closest("input, textarea, select, [contenteditable]")) {
				return;
			}
			desk();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [screen.name]);

	return (
		<div className="app">
			<header className="chrome">
				<span className="wordmark">Pressroom</span>
				<button
					type="button"
					className={screen.name === "help" ? "link current" : "link"}
					onClick={() => setScreen({ name: "help" })}
				>
					The destinations
				</button>
				<button
					type="button"
					className={screen.name === "settings" ? "link current" : "link"}
					onClick={() => setScreen({ name: "settings" })}
				>
					Settings
				</button>
			</header>

			<main>
				{screen.name === "desk" && (
					<DeskView
						onOpen={(slug, targets) => setScreen({ name: "article", slug, targets })}
						onSettings={() => setScreen({ name: "settings" })}
					/>
				)}
				{screen.name === "article" && (
					<ArticlePage slug={screen.slug} targets={screen.targets} onBack={desk} />
				)}
				{screen.name === "settings" && <SettingsView onBack={desk} />}
				{screen.name === "help" && <HelpView onBack={desk} />}
			</main>
		</div>
	);
}

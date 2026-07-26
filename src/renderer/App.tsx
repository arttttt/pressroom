import { useState } from "react";
import type { Target } from "../shared/platform.js";
import { ArticlePage } from "./article/ArticlePage.js";
import { DeskView } from "./desk/DeskView.js";
import { SettingsView } from "./settings/SettingsView.js";

type Screen =
	| { readonly name: "desk" }
	// The desk has already worked out where this article can go, so it hands
	// that over rather than making the article page ask again.
	| { readonly name: "article"; readonly slug: string; readonly targets: readonly Target[] }
	| { readonly name: "settings" };

export function App() {
	const [screen, setScreen] = useState<Screen>({ name: "desk" });

	return (
		<div className="app">
			<header className="chrome">
				<span className="wordmark">Pressroom</span>
				<button
					type="button"
					className={screen.name === "settings" ? "link current" : "link"}
					onClick={() => setScreen(screen.name === "settings" ? { name: "desk" } : { name: "settings" })}
				>
					{screen.name === "settings" ? "Done" : "Settings"}
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
					<ArticlePage slug={screen.slug} targets={screen.targets} onBack={() => setScreen({ name: "desk" })} />
				)}
				{screen.name === "settings" && <SettingsView />}
			</main>
		</div>
	);
}

import { useState } from "react";
import { ArticlesView } from "./articles/ArticlesView.js";
import { SettingsView } from "./settings/SettingsView.js";

type Screen = "articles" | "settings";

const SCREENS: readonly { readonly id: Screen; readonly label: string }[] = [
	{ id: "articles", label: "Articles" },
	{ id: "settings", label: "Settings" },
];

export function App() {
	const [screen, setScreen] = useState<Screen>("articles");

	return (
		<div className="app">
			<nav>
				<span className="brand">Pressroom</span>
				{SCREENS.map(({ id, label }) => (
					<button
						key={id}
						type="button"
						className={screen === id ? "current" : ""}
						onClick={() => setScreen(id)}
					>
						{label}
					</button>
				))}
			</nav>
			<main>{screen === "articles" ? <ArticlesView /> : <SettingsView />}</main>
		</div>
	);
}

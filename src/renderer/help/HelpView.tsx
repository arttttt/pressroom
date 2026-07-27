import { useEffect, useState } from "react";
import { ABOUT, PLATFORM_GUIDE } from "../../shared/guide.js";
import type { PlatformSummary } from "../../shared/platform.js";
import { Back } from "../Back.js";

/**
 * The one screen that explains rather than instructs.
 *
 * Everywhere else says only what to do next. What a platform is, what it will
 * refuse, and why Pressroom stops where it does are read once, deliberately,
 * by someone who came here for them — so they live here and nowhere else.
 *
 * The platforms are listed in the order the desk shows them, and each is
 * described in its own terms rather than in Pressroom's.
 */
export function HelpView({ onBack }: { readonly onBack: () => void }) {
	const [platforms, setPlatforms] = useState<readonly PlatformSummary[]>([]);

	// Asked for rather than listed here, so that adding a platform to the table
	// adds it to this screen and cannot be forgotten.
	useEffect(() => {
		let listening = true;
		void window.pressroom.listPlatforms().then((known) => listening && setPlatforms(known));
		return () => {
			listening = false;
		};
	}, []);

	return (
		<div className="help pad">
			<Back onClick={onBack} />
			<h1>The five destinations</h1>

			<div className="about">
				{ABOUT.map((paragraph) => (
					<p key={paragraph.slice(0, 24)}>{paragraph}</p>
				))}
			</div>

			{platforms.map((platform) => {
				const entry = PLATFORM_GUIDE[platform.id];
				return (
					<section key={platform.id} className="guide">
						<header>
							<h2>{platform.displayName}</h2>
							<span className="lang">{platform.language}</span>
						</header>
						<p className="what">{entry.what}</p>
						<ul>
							{entry.watch.map((line) => (
								<li key={line.slice(0, 24)}>{line}</li>
							))}
						</ul>
					</section>
				);
			})}
		</div>
	);
}

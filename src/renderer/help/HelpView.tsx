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
	const [version, setVersion] = useState("");

	// Asked for rather than listed here, so that adding a platform to the table
	// adds it to this screen and cannot be forgotten.
	useEffect(() => {
		let listening = true;
		void window.pressroom.listPlatforms().then((known) => listening && setPlatforms(known));
		void window.pressroom.version().then((built) => listening && setVersion(built));
		return () => {
			listening = false;
		};
	}, []);

	return (
		<div className="help pad">
			<Back onClick={onBack} />
			<h1>
				{/* Counted, not written down: the list is fetched precisely so
				    that a platform cannot be added and forgotten, and a heading
				    saying "five" would have made it false again. */}
				{platforms.length === 0 ? "The destinations" : `The ${platforms.length} destinations`}
				{/* Which build this is. The copy in /Applications and the one the
				    checkout runs look identical from the outside. */}
				{version !== "" && <span className="version">{version}</span>}
			</h1>

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

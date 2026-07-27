import { useEffect, useState } from "react";
import type { PreviewSection } from "./markdown.js";

/**
 * The article's sections, beside the text rather than instead of it.
 *
 * Its job is not reading — that happens in Obsidian — but reaching a place in
 * a document twenty thousand characters long while checking that the assembly
 * came out whole. Which section is on screen is marked, so the position in the
 * article is visible without counting headings.
 */
export function Contents({ sections }: { readonly sections: readonly PreviewSection[] }) {
	const [here, setHere] = useState<string | null>(null);

	useEffect(() => {
		const scroller = window.document.querySelector("main");
		if (scroller === null || sections.length === 0) return;

		// At the top the first heading has not reached the band either, so it is
		// where reading starts and where the mark starts. Neither end is handled
		// by measuring on every frame: that is what made scrolling stall before.
		setHere(sections[0]?.id ?? null);

		const watcher = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) if (entry.isIntersecting) setHere(entry.target.id);
			},
			// Only the top quarter of the view counts, so the heading being read
			// is the one marked rather than whichever happens to be visible.
			{ root: scroller, rootMargin: "0px 0px -75% 0px" },
		);

		for (const section of sections) {
			const element = window.document.getElementById(section.id);
			if (element !== null) watcher.observe(element);
		}

		// At the end of the scroll the last heading may never reach the band the
		// watcher looks at — there is not enough text under it to push it there —
		// so it would stay unmarked however far down the reader goes.
		const last = sections[sections.length - 1]?.id;
		const atTheEnd = () => {
			if (last === undefined) return;
			if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4) setHere(last);
		};
		scroller.addEventListener("scroll", atTheEnd, { passive: true });
		atTheEnd();

		return () => {
			watcher.disconnect();
			scroller.removeEventListener("scroll", atTheEnd);
		};
	}, [sections]);

	if (sections.length === 0) return null;

	return (
		<nav className="contents" aria-label="Sections">
			<ol>
				{sections.map((section, position) => (
					<li key={section.id}>
						<button
							type="button"
							className={here === section.id ? "current" : ""}
							onClick={() =>
								window.document.getElementById(section.id)?.scrollIntoView({ block: "start" })
							}
						>
							<span className="position">{position + 1}</span>
							<span className="heading">{section.heading}</span>
						</button>
					</li>
				))}
			</ol>
		</nav>
	);
}

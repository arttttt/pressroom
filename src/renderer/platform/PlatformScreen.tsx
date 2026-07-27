import { useEffect, useRef, useState } from "react";
import type { PageState } from "../../shared/browser.js";
import type { Target } from "../../shared/platform.js";
import { Back } from "../Back.js";

/**
 * The platform's own page, inside the application's window.
 *
 * The page is a native view painted over this screen rather than an element
 * within it, so what is written here is everything around the hole: the space
 * is measured and its whereabouts sent to the main process, which puts the
 * page there. Nothing may be drawn over that space — it would be behind the
 * page — which is why the controls sit above it rather than floating on it.
 */
export function PlatformScreen({
	target,
	onBack,
}: {
	readonly target: Target;
	readonly onBack: () => void;
}) {
	const hole = useRef<HTMLDivElement | null>(null);
	const [page, setPage] = useState<PageState | null>(null);

	// The page navigates on its own — a sign-in redirects, a save changes the
	// address — so its state is pushed here rather than asked for.
	useEffect(() => window.pressroom.onPlatformState(setPage), []);

	useEffect(() => {
		const element = hole.current;
		if (element === null) return;

		const where = () => {
			const box = element.getBoundingClientRect();
			return { x: box.x, y: box.y, width: box.width, height: box.height };
		};

		let showing = true;
		void window.pressroom.openPlatform(target.platform, where()).then((state) => {
			if (showing) setPage(state);
		});

		// The window resizes and the hole with it. Watching the element rather
		// than the window catches both that and anything above it changing height.
		const observer = new ResizeObserver(() => void window.pressroom.movePlatform(where()));
		observer.observe(element);

		return () => {
			showing = false;
			observer.disconnect();
			// Synchronously, so that leaving and arriving again arrive in that
			// order: a page left attached under another screen goes on receiving
			// clicks meant for the interface.
			void window.pressroom.closePlatform();
		};
	}, [target.platform]);

	const stage = page?.stage ?? "elsewhere";

	return (
		<section className="platform">
			<div className="platform-bar">
				<Back onClick={onBack} label="Back to the article" />
				<h2>{target.displayName}</h2>
				<span className="address">{page?.loading === true ? "Loading…" : (page?.url ?? "")}</span>
				<span className="platform-actions">
					{stage === "sign-in-needed" && (
						<button
							type="button"
							className="btn small primary"
							onClick={() => void window.pressroom.navigatePlatform("sign-in")}
						>
							Sign in
						</button>
					)}
					{stage === "elsewhere" && (
						<button
							type="button"
							className="btn small"
							onClick={() => void window.pressroom.navigatePlatform("editor")}
						>
							Open the editor
						</button>
					)}
					{page?.canGoBack === true && (
						<button
							type="button"
							className="btn small"
							onClick={() => void window.pressroom.navigatePlatform("back")}
						>
							Back
						</button>
					)}
					<button
						type="button"
						className="btn small"
						onClick={() => void window.pressroom.navigatePlatform("reload")}
					>
						Reload
					</button>
				</span>
			</div>

			{(stage === "sign-in-needed" || stage === "signing-in") && (
				<p className="platform-note quiet">
					{target.displayName} is asking who you are. The session stays on this machine and
					survives a restart, so this is asked once — and the captcha and the button are
					yours: Pressroom fills the two fields and stops
				</p>
			)}

			{/* The hole. Empty on purpose: the platform's page is painted over it. */}
			<div className="platform-page" ref={hole} />
		</section>
	);
}

import { useEffect, useState } from "react";
import type { Target } from "../../shared/platform.js";
import type { Publication } from "../../shared/publication.js";
import type { Rendered, RenderResult } from "../../shared/rendered.js";
import { bodyFlavours } from "./clipboard.js";
import { MarkPublished } from "./MarkPublished.js";
import { PlatformPanel } from "./PlatformPanel.js";

const HOW = {
	browser: "pasted into its editor",
	email: "sent as an email",
} as const;

/**
 * One destination: where it stands, what it will receive, and what to do next.
 *
 * The rendering is fetched here rather than inside the panel below, because
 * both need it: the panel shows the fields, and the action opens the platform
 * carrying them. One question, one answer, no chance of the two disagreeing.
 */
export function DestinationPanel({
	slug,
	target,
	today,
	onRecord,
	onForget,
}: {
	readonly slug: string;
	readonly target: Target;
	readonly today: string;
	readonly onRecord: (publication: Publication) => Promise<void>;
	readonly onForget: (target: Target) => Promise<void>;
}) {
	const [marking, setMarking] = useState(false);
	const [result, setResult] = useState<RenderResult | null>(null);

	useEffect(() => {
		let listening = true;
		setResult(null);
		void window.pressroom
			.renderArticle(slug, target.platform)
			.then((rendered) => listening && setResult(rendered));
		return () => {
			listening = false;
		};
	}, [slug, target.platform]);

	const rendered = result?.kind === "rendered" ? result.rendered : null;

	return (
		<section className="chosen-destination">
			<header>
				<h2>{target.displayName}</h2>
				<span className="lang">{target.language}</span>
				<span className="how">{HOW[target.delivery]}</span>
			</header>

			{target.state === "published" && (
				<div className="published-at">
					<a href={target.url ?? "#"}>{target.url}</a>
					<button type="button" className="btn small" onClick={() => void onForget(target)}>
						Forget
					</button>
				</div>
			)}

			{target.state === "missing" && <p className="quiet">Nothing written in {target.language}</p>}

			{target.state !== "missing" &&
				(marking ? (
					<MarkPublished
						target={target}
						today={today}
						onRecord={async (publication) => {
							await onRecord(publication);
							setMarking(false);
						}}
						onCancel={() => setMarking(false)}
					/>
				) : (
					<div className="actions">
						{rendered !== null && (
							<Open slug={slug} rendered={rendered} displayName={target.displayName} />
						)}
						{target.state === "ready" && (
							<button type="button" className="btn small" onClick={() => setMarking(true)}>
								Mark published
							</button>
						)}
					</div>
				))}

			{target.state !== "missing" && result !== null && <PlatformPanel result={result} />}
		</section>
	);
}

/**
 * Sending the article on its way, in the browser the person already uses.
 *
 * Hacker News and Reddit take their whole submission in the address and open
 * with both fields filled. Habr and HackerNoon receive the article itself,
 * which does not travel in a query string — so the text goes to the clipboard
 * in the same press, being the only thing to do with it next. The button says
 * so, because a control that quietly takes the clipboard is one that loses
 * whatever somebody had copied.
 */
function Open({
	slug,
	rendered,
	displayName,
}: {
	readonly slug: string;
	readonly rendered: Rendered;
	readonly displayName: string;
}) {
	// Hackaday's tip is a mail message, and the panel below opens it in Mail.
	if (rendered.platform === "hackaday") return null;
	const carriesText = rendered.platform === "habr" || rendered.platform === "hackernoon";

	async function open() {
		if (carriesText) {
			const { text, html } = bodyFlavours(rendered);
			await (html === null ? window.pressroom.copy(text) : window.pressroom.copy(text, html));
		}
		await window.pressroom.openEditor(slug, rendered.platform);
	}

	return (
		<button type="button" className="btn small primary" onClick={() => void open()}>
			{carriesText ? `Open ${displayName} and copy the text` : `Open ${displayName}`}
		</button>
	);
}

import { useState } from "react";
import type { Target } from "../../shared/platform.js";
import type { Publication } from "../../shared/publication.js";
import { MarkPublished } from "./MarkPublished.js";
import { PlatformPanel } from "./PlatformPanel.js";

const HOW = {
	api: "posted through its API",
	browser: "filled into its editor",
	email: "sent as an email",
} as const;

/** One destination: where it stands, what it will receive, and what to do next. */
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

			{target.state === "missing" && (
				<p className="quiet">
					Nothing is written in {target.language}, so there is nothing to send here yet
				</p>
			)}

			{target.state === "ready" &&
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
						<button type="button" className="btn small" onClick={() => setMarking(true)}>
							Mark published
						</button>
					</div>
				))}

			{target.state !== "missing" && <PlatformPanel slug={slug} platform={target.platform} />}
		</section>
	);
}

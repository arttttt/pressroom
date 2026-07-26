import { useState } from "react";
import type { PlatformId, Target } from "../../shared/platform.js";
import type { Publication } from "../../shared/publication.js";
import { MarkPublished } from "./MarkPublished.js";

const HOW = {
	api: "posted through its API",
	browser: "filled into its editor",
	email: "sent as an email",
} as const;

/**
 * Every destination for one article, and what can be done about each.
 *
 * Fuller than the rail on the desk, which only has to be scannable: here a
 * destination can be opened to show what it will receive, and marked with the
 * address it went to. Pressroom does not publish, so that address is pasted in
 * after the fact — which is the honest shape of it.
 */
export function ArticleDestinations({
	targets,
	opened,
	onOpen,
	today,
	onRecord,
	onForget,
}: {
	readonly targets: readonly Target[];
	readonly opened: PlatformId | null;
	readonly onOpen: (target: Target) => void;
	readonly today: string;
	readonly onRecord: (publication: Publication) => Promise<void>;
	readonly onForget: (target: Target) => Promise<void>;
}) {
	const [marking, setMarking] = useState<PlatformId | null>(null);

	return (
		<ul className="article-destinations">
			{targets.map((target) => (
				<li key={`${target.platform}-${target.language}`} className={target.state}>
					<div className="row">
						<span className={`mark ${target.state}`} />
						<span className="names">
							<span className="platform">{target.displayName}</span>
							<span className="lang">{target.language}</span>
						</span>

						{target.state === "published" && target.url !== null ? (
							<a className="where" href={target.url}>
								{target.url}
							</a>
						) : (
							<span className="how">
								{target.state === "ready" ? HOW[target.delivery] : `nothing written in ${target.language}`}
							</span>
						)}

						<span className="actions">
							{target.state === "ready" && (
								<>
									<button
										type="button"
										className={opened === target.platform ? "link current" : "link"}
										onClick={() => onOpen(target)}
									>
										{opened === target.platform ? "Hide" : "What it gets"}
									</button>
									<button
										type="button"
										className="link"
										onClick={() => setMarking(marking === target.platform ? null : target.platform)}
									>
										Mark published
									</button>
								</>
							)}
							{target.state === "published" && (
								<button type="button" className="link" onClick={() => void onForget(target)}>
									Forget
								</button>
							)}
						</span>
					</div>

					{marking === target.platform && (
						<MarkPublished
							target={target}
							today={today}
							onRecord={async (publication) => {
								await onRecord(publication);
								setMarking(null);
							}}
							onCancel={() => setMarking(null)}
						/>
					)}
				</li>
			))}
		</ul>
	);
}

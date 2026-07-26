import { useState } from "react";
import type { PlatformId, Target } from "../../shared/platform.js";
import type { Publication } from "../../shared/publication.js";
import { MarkPublished } from "./MarkPublished.js";
import { PlatformPanel } from "./PlatformPanel.js";

const HOW = {
	api: "posted through its API",
	browser: "filled into its editor",
	email: "sent as an email",
} as const;

/**
 * Every destination for one article, each opening onto what can be done with it.
 *
 * A row states one thing — where this article stands with that platform — and
 * the actions live inside it rather than beside it. Five rows each carrying the
 * same two links made a list of ten identical controls in which nothing could be
 * found, and the panel they opened appeared below the whole list, away from the
 * row it belonged to.
 */
export function ArticleDestinations({
	slug,
	targets,
	today,
	onRecord,
	onForget,
}: {
	readonly slug: string;
	readonly targets: readonly Target[];
	readonly today: string;
	readonly onRecord: (publication: Publication) => Promise<void>;
	readonly onForget: (target: Target) => Promise<void>;
}) {
	const [open, setOpen] = useState<PlatformId | null>(null);
	const [marking, setMarking] = useState(false);

	return (
		<ul className="article-destinations">
			{targets.map((target) => {
				const showing = open === target.platform;
				const openable = target.state !== "missing";

				return (
					<li key={`${target.platform}-${target.language}`} className={target.state}>
						<button
							type="button"
							className={showing ? "row open" : "row"}
							disabled={!openable}
							aria-expanded={showing}
							onClick={() => {
								setOpen(showing ? null : target.platform);
								setMarking(false);
							}}
						>
							<span className={`mark ${target.state}`} />
							<span className="names">
								<span className="platform">{target.displayName}</span>
								<span className="lang">{target.language}</span>
							</span>
							{/* The address is shortened here and given in full inside, so
							    the row does not repeat what it has just opened onto. */}
							{target.state === "published" && target.url !== null ? (
								<span className="where">{showing ? "" : short(target.url)}</span>
							) : (
								<span className="how">
									{target.state === "ready" ? HOW[target.delivery] : `nothing written in ${target.language}`}
								</span>
							)}
							{openable && <span className="disclosure" aria-hidden="true" />}
						</button>

						{showing && (
							<div className="opened">
								{target.state === "published" ? (
									<Published target={target} onForget={onForget} />
								) : marking ? (
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
									<>
										<div className="actions">
											<button type="button" className="btn small" onClick={() => setMarking(true)}>
												Mark published
											</button>
										</div>
										<PlatformPanel slug={slug} platform={target.platform} />
									</>
								)}
							</div>
						)}
					</li>
				);
			})}
		</ul>
	);
}

function Published({
	target,
	onForget,
}: {
	readonly target: Target;
	readonly onForget: (target: Target) => Promise<void>;
}) {
	return (
		<div className="published-at">
			<a href={target.url ?? "#"}>{target.url}</a>
			<button type="button" className="btn small" onClick={() => void onForget(target)}>
				Forget
			</button>
		</div>
	);
}

/** Enough of an address to recognise, without a line of query string. */
function short(url: string): string {
	try {
		const parsed = new URL(url);
		const path = parsed.pathname.length > 34 ? `${parsed.pathname.slice(0, 33)}…` : parsed.pathname;
		return `${parsed.host}${path === "/" ? "" : path}`;
	} catch {
		return url;
	}
}

import type { Target } from "../../shared/platform.js";

const HOW = {
	api: "posted through its API",
	browser: "filled into its editor",
	email: "sent as an email",
} as const;

/**
 * Where one article can go.
 *
 * The same rail on the desk and on an article's own page, so the shape a reader
 * learns in one place carries to the other. `detailed` is the difference: the
 * desk needs it scannable, the article page has room to say how each one is
 * reached.
 *
 * The platform and its language sit in their own box aligned on the baseline —
 * they are set at different sizes, and centring two different sizes by their
 * boxes leaves the smaller one visibly adrift.
 */
export function Destinations({
	targets,
	detailed = false,
}: {
	readonly targets: readonly Target[];
	readonly detailed?: boolean;
}) {
	return (
		<ul className={detailed ? "destinations detailed" : "destinations"}>
			{targets.map((target) => (
				<li key={`${target.platform}-${target.language}`} className={target.state}>
					<span className={`mark ${target.state}`} />
					<span className="names">
						<span className="platform">{target.displayName}</span>
						<span className="lang">{target.language}</span>
					</span>
					{detailed && (
						<span className="how">
							{target.state === "ready" ? HOW[target.delivery] : `nothing written in ${target.language}`}
						</span>
					)}
				</li>
			))}
		</ul>
	);
}

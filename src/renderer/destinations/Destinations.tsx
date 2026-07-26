import type { PlatformId, Target } from "../../shared/platform.js";

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
 * reached — and there, a destination with text waiting can be opened to show
 * exactly what it will receive.
 *
 * The platform and its language sit in their own box aligned on the baseline —
 * they are set at different sizes, and centring two different sizes by their
 * boxes leaves the smaller one visibly adrift.
 */
export function Destinations({
	targets,
	detailed = false,
	onOpen,
	opened = null,
}: {
	readonly targets: readonly Target[];
	readonly detailed?: boolean;
	readonly onOpen?: (target: Target) => void;
	readonly opened?: PlatformId | null;
}) {
	return (
		<ul className={detailed ? "destinations detailed" : "destinations"}>
			{targets.map((target) => {
				const openable = onOpen !== undefined && target.state === "ready";
				const inside = (
					<>
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
					</>
				);

				return (
					<li
						key={`${target.platform}-${target.language}`}
						className={`${target.state}${opened === target.platform ? " opened" : ""}`}
					>
						{openable ? (
							<button type="button" onClick={() => onOpen(target)}>
								{inside}
							</button>
						) : (
							inside
						)}
					</li>
				);
			})}
		</ul>
	);
}

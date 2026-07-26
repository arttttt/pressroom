import type { Target } from "../../shared/platform.js";

/**
 * Where one article can go, as a row of chips on the desk.
 *
 * Scannable rather than complete: the desk answers "what is left to do across
 * everything", and an article's own page answers what can be done about each
 * destination.
 *
 * The platform and its language sit in their own box aligned on the baseline —
 * they are set at different sizes, and centring two different sizes by their
 * boxes leaves the smaller one visibly adrift.
 */
export function Destinations({ targets }: { readonly targets: readonly Target[] }) {
	return (
		<ul className="destinations">
			{targets.map((target) => (
				<li
					key={`${target.platform}-${target.language}`}
					className={target.state}
					title={target.url ?? undefined}
				>
					<span className={`mark ${target.state}`} />
					<span className="names">
						<span className="platform">{target.displayName}</span>
						<span className="lang">{target.language}</span>
					</span>
				</li>
			))}
		</ul>
	);
}

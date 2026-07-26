import type { AssembledDocument } from "../../shared/article-result.js";
import type { Target } from "../../shared/platform.js";

/**
 * What can be looked at for one article: its text in each language, and each
 * place it can go.
 *
 * A list beside the thing it selects rather than one that opens onto it. An
 * expanding row pushes everything below it down the page, so the list reflows
 * under the hand at every click and the detail ends up buried inside the list
 * that was supposed to stay scannable.
 */
export type Chosen =
	| { readonly kind: "document"; readonly language: string }
	| { readonly kind: "destination"; readonly target: Target };

export function ArticleAside({
	documents,
	targets,
	chosen,
	onChoose,
}: {
	readonly documents: readonly AssembledDocument[];
	readonly targets: readonly Target[];
	readonly chosen: Chosen;
	readonly onChoose: (chosen: Chosen) => void;
}) {
	return (
		<nav className="article-aside">
			<h2>Text</h2>
			<ul>
				{documents.map((document) => (
					<li key={document.language}>
						<button
							type="button"
							className={
								chosen.kind === "document" && chosen.language === document.language ? "current" : ""
							}
							onClick={() => onChoose({ kind: "document", language: document.language })}
						>
							<span className="lang">{document.language}</span>
							<span className="what">{document.outline.length} sections</span>
						</button>
					</li>
				))}
			</ul>

			<h2>Destinations</h2>
			<ul>
				{targets.map((target) => (
					<li key={`${target.platform}-${target.language}`} className={target.state}>
						<button
							type="button"
							className={
								chosen.kind === "destination" && chosen.target.platform === target.platform
									? "current"
									: ""
							}
							onClick={() => onChoose({ kind: "destination", target })}
						>
							<span className={`mark ${target.state}`} />
							<span className="what">{target.displayName}</span>
							<span className="lang">{target.language}</span>
						</button>
					</li>
				))}
			</ul>
		</nav>
	);
}

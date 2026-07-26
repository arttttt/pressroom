import { useEffect, useState } from "react";
import type { ArticleResult, AssembledDocument } from "../../shared/article-result.js";
import type { Target } from "../../shared/platform.js";
import type { Publication } from "../../shared/publication.js";
import { Back } from "../Back.js";
import { ArticleDestinations } from "./ArticleDestinations.js";
import { BodyViews } from "./BodyViews.js";
import { localDate } from "./today.js";

/**
 * One article: where it can go, and the text to take there.
 *
 * State first, prose second. The author wrote the text and can read it in
 * Obsidian; what they cannot see there is which of the five places it is ready
 * for, whether the assembly came out whole, and what each platform will
 * actually receive once its dialect has been applied.
 */
export function ArticlePage({
	slug,
	targets,
	onBack,
}: {
	readonly slug: string;
	readonly targets: readonly Target[];
	readonly onBack: () => void;
}) {
	const [result, setResult] = useState<ArticleResult | null>(null);
	// Where it has gone. Held here rather than taken from the desk's summary,
	// because recording one changes it and the page has to show that at once.
	const [here, setHere] = useState<readonly Target[]>(targets);
	// Same reason as on the desk: Obsidian may have come back since.
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		let listening = true;
		setResult(null);
		setHere(targets);
		void window.pressroom.readArticle(slug).then((read) => listening && setResult(read));
		return () => {
			listening = false;
		};
	}, [slug, attempt, targets]);

	/** The record decides what is canonical, so the answer replaces what we had. */
	function applied(publications: readonly Publication[]): readonly Target[] {
		return here.map((target) => {
			const out = publications.find(
				(publication) => publication.platform === target.platform && publication.language === target.language,
			);
			if (out !== undefined) return { ...target, state: "published" as const, url: out.url };
			return target.state === "published" ? { ...target, state: "ready" as const, url: null } : target;
		});
	}

	return (
		<article className="article">
			<Back onClick={onBack} />

			{result === null && <p className="quiet">Reading…</p>}

			{result?.kind === "unsupported" && (
				<>
					<h1>{slug}</h1>
					<p className="lead">Written as one note</p>
					<p className="quiet">
						Pressroom assembles an article from its section files. Split this one into a{" "}
						<code>sections/</code> folder with an index naming them in order, and it will appear here
					</p>
				</>
			)}

			{result?.kind === "failed" && (
				<>
					<h1>{slug}</h1>
					<p className="lead">This article could not be read</p>
					<p className="quiet">{result.reason}</p>
					<div className="actions">
						<button type="button" className="btn primary" onClick={() => setAttempt(attempt + 1)}>
							Try again
						</button>
					</div>
				</>
			)}

			{result?.kind === "ready" && (
				<>
					<h1>{result.title}</h1>
					<ArticleDestinations
						slug={slug}
						targets={here}
						today={localDate(new Date())}
						onRecord={async (publication) => setHere(applied(await window.pressroom.recordPublication(slug, publication)))}
						onForget={async (target) =>
							setHere(applied(await window.pressroom.forgetPublication(slug, target.platform, target.language)))
						}
					/>

					{result.documents.map((document) => (
						<Document key={document.language} document={document} />
					))}
				</>
			)}
		</article>
	);
}

function Document({ document }: { readonly document: AssembledDocument }) {
	return (
		<section className="document">
			<header>
				<span className="lang">{document.language}</span>
				{/* The title each platform wants in its own title field, which is why
				    it is shown apart from the body rather than found inside it. */}
				<span className="headline">{document.title}</span>
			</header>
			<BodyViews body={document.body} outline={document.outline} />
		</section>
	);
}
